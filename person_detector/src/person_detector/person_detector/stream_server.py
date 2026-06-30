"""경량 MJPEG HTTP 스트리밍 서버.

브라우저에서 실시간 영상 확인 + 현재 프레임 스크린샷 저장
+ 동영상 녹화 저장 + ROS2 로그 시작/중지/저장.

저장 위치:
  - 서버/컨테이너가 아니라 브라우저를 실행한 PC의 다운로드 폴더

추가 기능:
  - /stream/status 엔드포인트 제공
  - 브라우저에서 스트림 멈춤 감지 후 자동 재연결
  - 이미지 에러 발생 시 자동 재연결
  - 주기적 hard reconnect 지원
  - 화면 상단 중앙에 배포 날짜/시간 표시
"""

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


DEPLOY_TIME_TEXT = time.strftime("배포: %Y-%m-%d %H:%M:%S", time.localtime())


_PAGE = """<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>person_detector</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    html, body {
      margin: 0;
      height: 100%;
      background: #000;
      color: #fff;
      font-family: Arial, sans-serif;
      overflow: hidden;
    }

    .wrap {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000;
    }

    #stream {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      background: #000;
      user-select: none;
      -webkit-user-drag: none;
    }

    .deploy-badge {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 11;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.35);
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.2px;
      box-shadow: 0 2px 10px rgba(0,0,0,.45);
      white-space: nowrap;
      pointer-events: none;
    }

    .toolbar {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 10;
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
      max-width: calc(100% - 24px);
    }

    .btn {
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      background: rgba(20, 20, 20, 0.78);
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 2px 10px rgba(0,0,0,.35);
    }

    .btn:hover {
      background: rgba(40, 40, 40, 0.88);
    }

    .btn.recording {
      background: rgba(190, 0, 0, 0.88);
    }

    .btn.log {
      background: rgba(0, 80, 180, 0.82);
    }

    .btn.log-recording {
      background: rgba(180, 60, 0, 0.90);
    }

    .btn.clear {
      background: rgba(120, 70, 0, 0.82);
    }

    .record-indicator,
    .log-indicator,
    .stream-indicator {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 2px 10px rgba(0,0,0,.35);
    }

    .record-indicator {
      background: rgba(180, 0, 0, 0.82);
    }

    .log-indicator {
      background: rgba(180, 80, 0, 0.82);
    }

    .stream-indicator {
      background: rgba(80, 80, 80, 0.82);
    }

    .record-indicator.show,
    .log-indicator.show,
    .stream-indicator.show {
      display: flex;
    }

    .record-dot,
    .log-dot,
    .stream-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      animation: blink 1s infinite;
    }

    .record-dot {
      background: #ff3b3b;
      box-shadow: 0 0 10px rgba(255, 0, 0, 0.9);
    }

    .log-dot {
      background: #ffb13b;
      box-shadow: 0 0 10px rgba(255, 160, 0, 0.9);
    }

    .stream-dot {
      background: #ffd23b;
      box-shadow: 0 0 10px rgba(255, 210, 0, 0.9);
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.25; }
    }

    .hint {
      position: absolute;
      left: 12px;
      bottom: 12px;
      z-index: 10;
      background: rgba(20, 20, 20, 0.72);
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 13px;
      color: #fff;
    }

    .toast {
      position: absolute;
      left: 50%;
      bottom: 56px;
      transform: translateX(-50%);
      z-index: 20;
      background: rgba(0, 0, 0, 0.82);
      color: #fff;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease;
      max-width: calc(100% - 32px);
      text-align: center;
      white-space: nowrap;
    }

    .toast.show {
      opacity: 1;
    }

    .flash {
      position: absolute;
      inset: 0;
      background: #fff;
      opacity: 0;
      pointer-events: none;
      z-index: 15;
    }

    .flash.show {
      animation: flashAnim 180ms ease;
    }

    @keyframes flashAnim {
      0% { opacity: 0; }
      20% { opacity: 0.55; }
      100% { opacity: 0; }
    }

    canvas {
      display: none;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <img id="stream" src="/stream" alt="person_detector stream">
    <canvas id="snapshotCanvas"></canvas>
    <canvas id="recordCanvas"></canvas>

    <div class="deploy-badge" id="deployBadge">__DEPLOY_TIME__</div>

    <div class="toolbar">
      <div class="stream-indicator" id="streamIndicator">
        <span class="stream-dot"></span>
        <span id="streamText">STREAM 재연결 중</span>
      </div>

      <div class="record-indicator" id="recordIndicator">
        <span class="record-dot"></span>
        <span id="recordTime">REC 00:00</span>
      </div>

      <div class="log-indicator" id="logIndicator">
        <span class="log-dot"></span>
        <span id="logTime">LOG 00:00</span>
      </div>

      <button class="btn" id="shotBtn" type="button">스크린샷 저장</button>
      <button class="btn" id="recordBtn" type="button">녹화 시작</button>
      <button class="btn log" id="logRecordBtn" type="button">로그 시작</button>
      <button class="btn log" id="logBtn" type="button">ROS2 로그 저장</button>
      <button class="btn clear" id="clearLogBtn" type="button">로그 비우기</button>
    </div>

    <div class="hint">
      S=스크린샷, R=녹화 시작/중지, G=로그 시작/중지, L=로그 저장, 더블클릭=스크린샷
    </div>

    <div class="toast" id="toast"></div>
    <div class="flash" id="flash"></div>
  </div>

  <script>
    const img = document.getElementById('stream');

    const snapshotCanvas = document.getElementById('snapshotCanvas');
    const recordCanvas = document.getElementById('recordCanvas');

    const shotBtn = document.getElementById('shotBtn');
    const recordBtn = document.getElementById('recordBtn');
    const logRecordBtn = document.getElementById('logRecordBtn');
    const logBtn = document.getElementById('logBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');

    const toast = document.getElementById('toast');
    const flash = document.getElementById('flash');

    const recordIndicator = document.getElementById('recordIndicator');
    const recordTime = document.getElementById('recordTime');

    const logIndicator = document.getElementById('logIndicator');
    const logTime = document.getElementById('logTime');

    const streamIndicator = document.getElementById('streamIndicator');
    const streamText = document.getElementById('streamText');

    let mediaRecorder = null;
    let recordedChunks = [];
    let recording = false;
    let recordStartMs = 0;
    let recordTimer = null;
    let drawTimer = null;
    let currentRecordFilename = null;
    let recordStream = null;

    let logRecording = false;
    let logStartMs = 0;
    let logTimer = null;

    const RECORD_FPS = 15;

    const STREAM_STATUS_POLL_MS = 1000;
    const STREAM_STALE_MS = 5000;
    const STREAM_RECONNECT_COOLDOWN_MS = 2000;
    const STREAM_HARD_REFRESH_MS = 60000;

    let lastFrameSeq = -1;
    let lastFrameSeenMs = Date.now();
    let lastReconnectMs = 0;
    let lastHardRefreshMs = Date.now();
    let streamStatusTimer = null;

    function pad(n) {
      return String(n).padStart(2, '0');
    }

    function makeTimestamp() {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
    }

    function makeImageFilename() {
      return `person_detector_${makeTimestamp()}.png`;
    }

    function makeVideoFilename() {
      return `person_detector_${makeTimestamp()}.webm`;
    }

    function makeLogFilename() {
      return `person_detector_ros2_log_${makeTimestamp()}.jsonl`;
    }

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');

      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => {
        toast.classList.remove('show');
      }, 1800);
    }

    function showFlash() {
      flash.classList.remove('show');
      void flash.offsetWidth;
      flash.classList.add('show');
    }

    function setStreamReconnecting(show, text = 'STREAM 재연결 중') {
      streamText.textContent = text;
      if (show) {
        streamIndicator.classList.add('show');
      } else {
        streamIndicator.classList.remove('show');
      }
    }

    function reconnectStream(reason = 'unknown') {
      const now = Date.now();

      if (now - lastReconnectMs < STREAM_RECONNECT_COOLDOWN_MS) {
        return;
      }

      lastReconnectMs = now;
      setStreamReconnecting(true, 'STREAM 재연결 중');

      const nextSrc = `/stream?t=${now}&reason=${encodeURIComponent(reason)}`;
      console.warn('[stream] reconnect:', reason, nextSrc);

      img.src = nextSrc;

      setTimeout(() => {
        setStreamReconnecting(false);
      }, 1500);
    }

    async function pollStreamStatus() {
      try {
        const res = await fetch(`/stream/status?t=${Date.now()}`, {
          cache: 'no-store'
        });

        if (!res.ok) {
          reconnectStream('status_not_ok');
          return;
        }

        const data = await res.json();
        const seq = Number(data.frame_seq || 0);

        if (seq !== lastFrameSeq) {
          lastFrameSeq = seq;
          lastFrameSeenMs = Date.now();
          setStreamReconnecting(false);
        }

        const now = Date.now();
        const staleMs = now - lastFrameSeenMs;

        if (data.has_frame && staleMs > STREAM_STALE_MS) {
          reconnectStream(`stale_${staleMs}`);
          return;
        }

        if (now - lastHardRefreshMs > STREAM_HARD_REFRESH_MS) {
          lastHardRefreshMs = now;
          reconnectStream('periodic');
        }
      } catch (e) {
        console.error('[stream] status error', e);
        reconnectStream('status_error');
      }
    }

    function startStreamWatchdog() {
      img.onerror = () => {
        reconnectStream('img_error');
      };

      img.onload = () => {
        setStreamReconnecting(false);
      };

      clearInterval(streamStatusTimer);
      streamStatusTimer = setInterval(pollStreamStatus, STREAM_STATUS_POLL_MS);

      reconnectStream('initial');
    }

    function ensureFrameReady() {
      return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
    }

    function saveBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function saveScreenshot() {
      if (!ensureFrameReady()) {
        showToast('아직 프레임이 없습니다');
        return;
      }

      const w = img.naturalWidth;
      const h = img.naturalHeight;

      snapshotCanvas.width = w;
      snapshotCanvas.height = h;

      const ctx = snapshotCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const filename = makeImageFilename();

      snapshotCanvas.toBlob((blob) => {
        if (!blob) {
          showToast('스크린샷 저장 실패');
          return;
        }

        saveBlob(blob, filename);
        showFlash();
        showToast(`저장됨: ${filename}`);
      }, 'image/png');
    }

    function getSupportedMimeType() {
      const candidates = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];

      if (!window.MediaRecorder) {
        return '';
      }

      for (const type of candidates) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }

      return '';
    }

    function drawFrameToRecordCanvas() {
      if (!recording) {
        return;
      }

      if (!ensureFrameReady()) {
        return;
      }

      const w = img.naturalWidth;
      const h = img.naturalHeight;

      if (recordCanvas.width !== w || recordCanvas.height !== h) {
        recordCanvas.width = w;
        recordCanvas.height = h;
      }

      const ctx = recordCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
    }

    function updateRecordTime() {
      if (!recording) {
        recordTime.textContent = 'REC 00:00';
        return;
      }

      const elapsedSec = Math.floor((Date.now() - recordStartMs) / 1000);
      const mm = pad(Math.floor(elapsedSec / 60));
      const ss = pad(elapsedSec % 60);

      recordTime.textContent = `REC ${mm}:${ss}`;
    }

    function startRecording() {
      if (recording) {
        return;
      }

      if (!window.MediaRecorder) {
        showToast('이 브라우저는 MediaRecorder를 지원하지 않습니다');
        return;
      }

      if (!recordCanvas.captureStream) {
        showToast('이 브라우저는 canvas 녹화를 지원하지 않습니다');
        return;
      }

      if (!ensureFrameReady()) {
        showToast('아직 프레임이 없습니다');
        return;
      }

      const w = img.naturalWidth;
      const h = img.naturalHeight;

      recordCanvas.width = w;
      recordCanvas.height = h;

      const ctx = recordCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      recordStream = recordCanvas.captureStream(RECORD_FPS);
      const mimeType = getSupportedMimeType();

      recordedChunks = [];
      currentRecordFilename = makeVideoFilename();

      try {
        mediaRecorder = new MediaRecorder(
          recordStream,
          mimeType ? { mimeType } : undefined
        );
      } catch (e) {
        console.error(e);
        showToast('녹화 초기화 실패');
        return;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, {
          type: mimeType || 'video/webm'
        });

        if (recordStream) {
          recordStream.getTracks().forEach(track => track.stop());
          recordStream = null;
        }

        if (!blob || blob.size === 0) {
          showToast('녹화 저장 실패');
          return;
        }

        saveBlob(blob, currentRecordFilename || makeVideoFilename());
        showToast(`녹화 저장됨: ${currentRecordFilename}`);
      };

      mediaRecorder.onerror = (event) => {
        console.error(event);
        showToast('녹화 중 오류 발생');
      };

      mediaRecorder.start(1000);

      recording = true;
      recordStartMs = Date.now();

      recordBtn.textContent = '녹화 중지';
      recordBtn.classList.add('recording');
      recordIndicator.classList.add('show');

      updateRecordTime();

      clearInterval(recordTimer);
      recordTimer = setInterval(updateRecordTime, 500);

      clearInterval(drawTimer);
      drawTimer = setInterval(
        drawFrameToRecordCanvas,
        Math.round(1000 / RECORD_FPS)
      );

      showToast('녹화 시작');
    }

    function stopRecording() {
      if (!recording) {
        return;
      }

      recording = false;

      clearInterval(recordTimer);
      recordTimer = null;

      clearInterval(drawTimer);
      drawTimer = null;

      recordBtn.textContent = '녹화 시작';
      recordBtn.classList.remove('recording');
      recordIndicator.classList.remove('show');

      updateRecordTime();

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      } else if (recordStream) {
        recordStream.getTracks().forEach(track => track.stop());
        recordStream = null;
      }

      mediaRecorder = null;
      showToast('녹화 종료 중...');
    }

    function toggleRecording() {
      if (recording) {
        stopRecording();
      } else {
        startRecording();
      }
    }

    function updateLogTime() {
      if (!logRecording) {
        logTime.textContent = 'LOG 00:00';
        return;
      }

      const elapsedSec = Math.floor((Date.now() - logStartMs) / 1000);
      const mm = pad(Math.floor(elapsedSec / 60));
      const ss = pad(elapsedSec % 60);

      logTime.textContent = `LOG ${mm}:${ss}`;
    }

    async function startLogRecording() {
      if (logRecording) {
        return;
      }

      try {
        const res = await fetch('/log/start', { method: 'POST' });

        if (!res.ok) {
          showToast('로그 시작 실패');
          return;
        }

        logRecording = true;
        logStartMs = Date.now();

        logRecordBtn.textContent = '로그 중지';
        logRecordBtn.classList.add('log-recording');
        logIndicator.classList.add('show');

        updateLogTime();

        clearInterval(logTimer);
        logTimer = setInterval(updateLogTime, 500);

        showToast('ROS2 로그 기록 시작');
      } catch (e) {
        console.error(e);
        showToast('로그 시작 오류');
      }
    }

    async function stopLogRecording() {
      if (!logRecording) {
        return;
      }

      try {
        const res = await fetch('/log/stop', { method: 'POST' });

        if (!res.ok) {
          showToast('로그 중지 실패');
          return;
        }

        logRecording = false;

        clearInterval(logTimer);
        logTimer = null;

        logRecordBtn.textContent = '로그 시작';
        logRecordBtn.classList.remove('log-recording');
        logIndicator.classList.remove('show');

        updateLogTime();

        showToast('ROS2 로그 기록 중지');
      } catch (e) {
        console.error(e);
        showToast('로그 중지 오류');
      }
    }

    function toggleLogRecording() {
      if (logRecording) {
        stopLogRecording();
      } else {
        startLogRecording();
      }
    }

    async function downloadRosLog() {
      try {
        const res = await fetch('/log');

        if (!res.ok) {
          showToast('ROS2 로그 다운로드 실패');
          return;
        }

        const blob = await res.blob();

        if (!blob || blob.size === 0) {
          showToast('저장할 ROS2 로그가 없습니다');
          return;
        }

        const filename = makeLogFilename();
        saveBlob(blob, filename);
        showToast(`ROS2 로그 저장됨: ${filename}`);
      } catch (e) {
        console.error(e);
        showToast('ROS2 로그 저장 오류');
      }
    }

    async function clearRosLog() {
      try {
        const res = await fetch('/log/clear', { method: 'POST' });

        if (!res.ok) {
          showToast('ROS2 로그 비우기 실패');
          return;
        }

        logRecording = false;

        clearInterval(logTimer);
        logTimer = null;

        logRecordBtn.textContent = '로그 시작';
        logRecordBtn.classList.remove('log-recording');
        logIndicator.classList.remove('show');

        updateLogTime();

        showToast('ROS2 로그 비움');
      } catch (e) {
        console.error(e);
        showToast('ROS2 로그 비우기 오류');
      }
    }

    async function syncLogStatus() {
      try {
        const res = await fetch('/log/status');

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        logRecording = !!data.recording;

        if (logRecording) {
          logStartMs = Date.now() - Math.floor((data.elapsed_sec || 0) * 1000);
          logRecordBtn.textContent = '로그 중지';
          logRecordBtn.classList.add('log-recording');
          logIndicator.classList.add('show');

          clearInterval(logTimer);
          logTimer = setInterval(updateLogTime, 500);
        } else {
          logRecordBtn.textContent = '로그 시작';
          logRecordBtn.classList.remove('log-recording');
          logIndicator.classList.remove('show');

          clearInterval(logTimer);
          logTimer = null;
        }

        updateLogTime();
      } catch (e) {
        console.error(e);
      }
    }

    shotBtn.addEventListener('click', saveScreenshot);
    recordBtn.addEventListener('click', toggleRecording);
    logRecordBtn.addEventListener('click', toggleLogRecording);
    logBtn.addEventListener('click', downloadRosLog);
    clearLogBtn.addEventListener('click', clearRosLog);

    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : '';

      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        saveScreenshot();
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        toggleRecording();
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        toggleLogRecording();
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        downloadRosLog();
        return;
      }
    });

    img.addEventListener('dblclick', saveScreenshot);

    window.addEventListener('beforeunload', () => {
      if (recording) {
        stopRecording();
      }
    });

    syncLogStatus();
    startStreamWatchdog();
  </script>
</body>
</html>
"""


class MjpegServer:
    def __init__(self, port=8080, max_log_lines=20000):
        self.port = port
        self.max_log_lines = int(max_log_lines)

        self._lock = threading.Lock()
        self._jpeg = None
        self._frame_seq = 0
        self._frame_updated_at = None
        self._httpd = None

        self._log_lock = threading.Lock()
        self._log_lines = []
        self._log_recording = False
        self._log_started_at = None

    def update(self, jpeg_bytes):
        now = time.time()
        with self._lock:
            self._jpeg = jpeg_bytes
            self._frame_seq += 1
            self._frame_updated_at = now

    def get_stream_status(self):
        with self._lock:
            has_frame = self._jpeg is not None
            frame_seq = self._frame_seq
            frame_updated_at = self._frame_updated_at

        age_sec = None
        if frame_updated_at is not None:
            age_sec = max(0.0, time.time() - frame_updated_at)

        return {
            "ok": True,
            "has_frame": has_frame,
            "frame_seq": frame_seq,
            "frame_updated_at": frame_updated_at,
            "frame_age_sec": age_sec,
        }

    def append_log(self, data):
        """
        ROS2 상태/이벤트 로그를 JSONL 형태로 메모리에 누적.

        로그 기록 중일 때만 저장한다.
        data는 dict 또는 문자열 모두 허용.
        """
        with self._log_lock:
            if not self._log_recording:
                return

        now = time.time()

        if isinstance(data, dict):
            item = {
                "ts": now,
                "iso_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
                **data,
            }
            line = json.dumps(item, ensure_ascii=False)
        else:
            item = {
                "ts": now,
                "iso_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
                "message": str(data),
            }
            line = json.dumps(item, ensure_ascii=False)

        with self._log_lock:
            if not self._log_recording:
                return

            self._log_lines.append(line)

            if len(self._log_lines) > self.max_log_lines:
                overflow = len(self._log_lines) - self.max_log_lines
                del self._log_lines[:overflow]

    def start_log_recording(self):
        with self._log_lock:
            self._log_lines.clear()
            self._log_recording = True
            self._log_started_at = time.time()

            start_item = {
                "ts": self._log_started_at,
                "iso_time": time.strftime(
                    "%Y-%m-%d %H:%M:%S",
                    time.localtime(self._log_started_at),
                ),
                "type": "log_control",
                "event": "start",
            }
            self._log_lines.append(json.dumps(start_item, ensure_ascii=False))

    def stop_log_recording(self):
        with self._log_lock:
            now = time.time()

            if self._log_recording:
                stop_item = {
                    "ts": now,
                    "iso_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
                    "type": "log_control",
                    "event": "stop",
                }
                self._log_lines.append(json.dumps(stop_item, ensure_ascii=False))

            self._log_recording = False

    def get_log_status(self):
        with self._log_lock:
            recording = self._log_recording
            started_at = self._log_started_at
            line_count = len(self._log_lines)

        elapsed_sec = 0.0
        if recording and started_at is not None:
            elapsed_sec = max(0.0, time.time() - started_at)

        return {
            "recording": recording,
            "started_at": started_at,
            "elapsed_sec": elapsed_sec,
            "line_count": line_count,
        }

    def get_log_text(self):
        with self._log_lock:
            if not self._log_lines:
                return ""

            return "\n".join(self._log_lines) + "\n"

    def clear_log(self):
        with self._log_lock:
            self._log_lines.clear()
            self._log_recording = False
            self._log_started_at = None

    def start(self):
        server = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def _send_json(self, obj, status=200):
                data = json.dumps(obj, ensure_ascii=False).encode("utf-8")

                self.send_response(status)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_POST(self):
                parsed = urlparse(self.path)
                path = parsed.path

                if path == "/log/start":
                    server.start_log_recording()
                    self._send_json({"ok": True, **server.get_log_status()})
                    return

                if path == "/log/stop":
                    server.stop_log_recording()
                    self._send_json({"ok": True, **server.get_log_status()})
                    return

                if path == "/log/clear":
                    server.clear_log()
                    self._send_json({"ok": True, **server.get_log_status()})
                    return

                self.send_response(404)
                self.end_headers()

            def do_GET(self):
                parsed = urlparse(self.path)
                path = parsed.path

                if path in ("/", "/index.html"):
                    page = _PAGE.replace("__DEPLOY_TIME__", DEPLOY_TIME_TEXT)
                    data = page.encode("utf-8")

                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return

                if path == "/stream/status":
                    self._send_json(server.get_stream_status())
                    return

                if path == "/log/status":
                    self._send_json(server.get_log_status())
                    return

                if path == "/log":
                    text = server.get_log_text()
                    data = text.encode("utf-8")

                    self.send_response(200)
                    self.send_header(
                        "Content-Type",
                        "application/x-ndjson; charset=utf-8",
                    )
                    self.send_header(
                        "Content-Disposition",
                        "attachment; filename=person_detector_ros2_log.jsonl",
                    )
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return

                if path != "/stream":
                    self.send_response(404)
                    self.end_headers()
                    return

                self.send_response(200)
                self.send_header(
                    "Content-Type",
                    "multipart/x-mixed-replace; boundary=frame",
                )
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
                self.end_headers()

                while True:
                    with server._lock:
                        jpeg = server._jpeg

                    if jpeg is not None:
                        try:
                            self.wfile.write(
                                b"--frame\r\n"
                                b"Content-Type: image/jpeg\r\n"
                                b"Cache-Control: no-cache\r\n\r\n"
                                + jpeg
                                + b"\r\n"
                            )
                            self.wfile.flush()
                        except (BrokenPipeError, ConnectionResetError):
                            break

                    time.sleep(0.04)

        self._httpd = ThreadingHTTPServer(("0.0.0.0", self.port), Handler)
        threading.Thread(target=self._httpd.serve_forever, daemon=True).start()

    def stop(self):
        if self._httpd is not None:
            self._httpd.shutdown()
            self._httpd.server_close()
            self._httpd = None