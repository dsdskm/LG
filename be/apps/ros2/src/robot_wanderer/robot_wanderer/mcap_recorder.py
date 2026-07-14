"""
노드 자신의 /rosout 로그(모든 레벨)를 60초(1분) 구간으로 모아, 매 1분마다 하나의
MCAP 배치로 묶어 event_receiver(/events/ingest/mcap)로 POST 하는 in-process recorder.

이 환경에서는 서로 다른 노드(프로세스) 간 /rosout 전달이 동작하지 않고,
같은 노드의 자기-수신만 신뢰성 있게 동작한다. 그래서 별도 recorder 노드가 아니라
로그를 내는 노드(wanderer_node) 안에서 자기 /rosout 을 구독해 수집한다.

MCAP 포맷은 event_generator 가 쓰는 RobotLog 스키마와 동일하게 맞춰, 기존
수신/분석 파이프라인을 그대로 탄다.
"""

import io
import os
import re
import json
import time
import threading

from rcl_interfaces.msg import Log

import requests
from mcap.writer import Writer


# 60초(1분) 단위로 flush. 환경변수로 조정 가능.
FLUSH_INTERVAL_SEC = float(os.environ.get('RECORDER_FLUSH_SEC', '60'))
# event_receiver 기본 주소 (요청: 54.116.181.2, 포트 3001)
DEFAULT_RECEIVER_URL = 'http://54.116.181.2:3001'
RECEIVER_URL = os.environ.get('URL_EVENT_RECEIVER', DEFAULT_RECEIVER_URL)

# rcl_interfaces/msg/Log 의 level 은 정수(uint8): DEBUG=10 INFO=20 WARN=30 ERROR=40 FATAL=50.
LEVEL_MAP = {
    10: 'DEBUG',
    20: 'INFO',
    30: 'WARN',
    40: 'ERROR',
    50: 'ERROR',  # receiver 는 FATAL 을 ERROR 로 정규화하므로 맞춰둠
}

# recorder 자신이 내는 로그(전송 결과/시작)의 프리픽스. 수집 스트림에서 제외해
# "배치 안에 직전 배치의 전송 로그가 섞이는" 피드백을 막는다.
INTERNAL_TAG = '[MCAP-TX]'


# 메시지 본문 프리픽스 '[Robot-001] amcl: 실제내용' 파싱.
# child logger 가 /rosout 에 안 실리는 Humble 동작 때문에, 식별자는 name 이 아니라
# 메시지 본문에 담긴다(wanderer_node._ComponentLogger 참고).
_PREFIX_RE = re.compile(r'^\[([^\]]+)\]\s*([^:]+):\s*(.*)$', re.S)


def parse_log_message(raw: str):
    """'[Robot-001] amcl: msg' -> (robotId, 'amcl: msg'). 형식이 다르면 (UNKNOWN, raw)."""
    m = _PREFIX_RE.match(raw)
    if not m:
        return 'UNKNOWN', raw
    robot_id, component, rest = m.group(1).strip(), m.group(2).strip(), m.group(3)
    return robot_id, f'{component}: {rest}'


def build_mcap(records: list) -> bytes:
    """event_generator 와 동일한 RobotLog 스키마/채널로 MCAP 바이너리 생성."""
    buf = io.BytesIO()
    writer = Writer(buf)
    writer.start(profile='custom', library='ros2_error_recorder')

    schema_id = writer.register_schema(
        name='RobotLog',
        encoding='jsonschema',
        data=json.dumps({
            'type': 'object',
            'properties': {
                'robotId': {'type': 'string'},
                'seq': {'type': 'integer'},
                'ts': {'type': 'integer'},
                'level': {'type': 'string'},
                'message': {'type': 'string'},
            },
            'required': ['robotId', 'seq', 'ts', 'level', 'message'],
        }).encode('utf-8'),
    )
    channel_id = writer.register_channel(
        schema_id=schema_id,
        topic='/rosout',
        message_encoding='json',
    )

    for rec in records:
        ns = rec['ts'] * 1_000_000
        writer.add_message(
            channel_id=channel_id,
            log_time=ns,
            publish_time=ns,
            sequence=rec['seq'],
            data=json.dumps(rec).encode('utf-8'),
        )

    writer.finish()
    return buf.getvalue()


class ErrorMcapRecorder:
    """주어진 노드에 /rosout 구독과 flush 타이머를 붙여, 60초(1분) 구간의 모든 로그를
    매 1분마다 MCAP 로 묶어 event_receiver 로 POST 한다."""

    def __init__(self, node, receiver_url: str = RECEIVER_URL,
                 flush_interval: float = FLUSH_INTERVAL_SEC):
        self.node = node
        self.url = receiver_url.rstrip('/')
        self._buffer: list = []
        self._seq = 0
        self._batch_no = 0
        self._lock = threading.Lock()

        node.create_subscription(Log, '/rosout', self._on_log, 100)
        node.create_timer(flush_interval, self._flush)

        node.get_logger().info(
            f'{INTERNAL_TAG} recorder online: all logs every {flush_interval:.0f}s '
            f'-> {self.url}/events/ingest/mcap'
        )

    def _on_log(self, msg: Log):
        # 모든 레벨 수집(DEBUG/INFO/WARN/ERROR/FATAL).
        # 단, recorder 자신의 로그는 제외해 자기-피드백을 막는다.
        if msg.msg.startswith(INTERNAL_TAG):
            return
        ts_ms = msg.stamp.sec * 1000 + msg.stamp.nanosec // 1_000_000
        robot_id, message = parse_log_message(msg.msg)
        with self._lock:
            self._seq += 1
            self._buffer.append({
                'robotId': robot_id,
                'seq': self._seq,
                'ts': ts_ms,
                'level': LEVEL_MAP.get(msg.level, 'INFO'),
                'message': message,
            })

    def _flush(self):
        # 매 1분마다 그 구간의 로그를 robotId 별로 그룹핑해, 로봇당 MCAP 1개씩 전송한다.
        # receiver(mcap.parser.ts)는 MCAP 1개당 robotId 하나(첫 메시지 기준)만 붙이므로,
        # 한 배치에 여러 로봇을 섞으면 전부 첫 로봇 id 로 라벨링된다 → 로봇별로 분리한다.
        with self._lock:
            batch = self._buffer
            self._buffer = []
            self._batch_no += 1
            batch_no = self._batch_no

        if not batch:
            return

        groups: dict = {}
        for rec in batch:
            groups.setdefault(rec['robotId'], []).append(rec)

        for robot_id, recs in groups.items():
            try:
                data = build_mcap(recs)
            except Exception as e:
                self.node.get_logger().error(f'MCAP build failed ({robot_id}): {e}')
                continue
            # POST 는 spin 루프(20Hz)를 막지 않도록 백그라운드 스레드로 전송
            threading.Thread(
                target=self._post, args=(data, robot_id, len(recs), batch_no),
                daemon=True,
            ).start()

    def _post(self, data: bytes, robot_id: str, count: int, batch_no: int):
        batch_id = f'ros2_{robot_id}_{int(time.time() * 1000)}_{batch_no:04d}'
        try:
            res = requests.post(
                f'{self.url}/events/ingest/mcap',
                data=data,
                headers={
                    'Content-Type': 'application/octet-stream',
                    'x-batch-id': batch_id,
                    'x-source': 'ros2_log_recorder',
                    'x-robot-id': robot_id,
                    'x-log-count': str(count),
                },
                timeout=10.0,
            )
            body = res.text.strip().replace('\n', ' ')
            if len(body) > 200:
                body = body[:200] + '...'
            self.node.get_logger().info(
                f'{INTERNAL_TAG} {robot_id} {count} logs {len(data)}B '
                f'-> HTTP {res.status_code} {body}'
            )
        except Exception as e:
            self.node.get_logger().warn(
                f'{INTERNAL_TAG} {robot_id} {count} logs -> FAILED: {e}'
            )
