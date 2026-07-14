#!/usr/bin/env bash
#
# 백엔드 전체가 떠 있을 때, N초마다 한 번씩 event_generator(/send)를 호출해
# 로그 한 배치를 생성 → event_receiver(/events/ingest/mcap)로 흘려보낸다.
#
# 앱이 "자체적으로" 주기 전송하지 않도록 하고(외부 스케줄링), 대신 이 스크립트가
# 정해진 주기로 트리거한다.
#
# 사용법:
#   ./scripts/run/event-gen-loop.sh <초> [횟수] [host]
#
#   <초>   : 발생 주기(초). 필수. (양의 정수)
#   [횟수] : 총 발생 횟수. 생략/0 이면 무한 반복(Ctrl-C로 종료).
#   [host] : 대상 호스트. 기본 localhost.
#
# 환경변수:
#   GEN_PORT       : event_generator 포트 (기본 9001) — 제너레이터는 로컬에서 돈다
#   DURATION_MIN   : /send 의 durationMinutes (기본 1)
#   LOGS_PER_SEC   : /send 의 logsPerSecond (기본 5)
#   RECEIVER_URL   : event_receiver "베이스" URL (예 https://alg.qa.hcrsp.com:3001).
#                    제너레이터가 뒤에 /events/ingest/mcap 를 자동으로 붙이므로 경로는 넣지 말 것.
#   CLOUD          : 1 이면 RECEIVER_URL 을 클라우드(CLOUD_DOMAIN:3001)로 자동 설정.
#   CLOUD_DOMAIN   : 클라우드 도메인 (기본 alg.qa.hcrsp.com)
#
# 참고: event_generator 자체는 클라우드에 배포돼 있지 않다(로컬에서만 구동).
#       "클라우드로" 보내려면 로컬 제너레이터가 클라우드 receiver 로 push 하도록 RECEIVER_URL/CLOUD 를 쓴다.
#
# 예시:
#   ./scripts/run/event-gen-loop.sh 10                       # 로컬 생성 → 로컬 receiver
#   CLOUD=1 ./scripts/run/event-gen-loop.sh 10               # 로컬 생성 → 클라우드 receiver
#   RECEIVER_URL=https://alg.qa.hcrsp.com:3001 ./scripts/run/event-gen-loop.sh 10
#   GEN_PORT=9001 ./scripts/run/event-gen-loop.sh 30 0 127.0.0.1
#
set -uo pipefail

INTERVAL="${1:-}"
COUNT="${2:-0}"
HOST="${3:-localhost}"

GEN_PORT="${GEN_PORT:-9001}"
DURATION_MIN="${DURATION_MIN:-1}"
LOGS_PER_SEC="${LOGS_PER_SEC:-5}"
CLOUD_DOMAIN="${CLOUD_DOMAIN:-alg.qa.hcrsp.com}"

# CLOUD=1 이면 RECEIVER_URL 을 클라우드 receiver 로 자동 설정
if [[ "${CLOUD:-0}" == "1" && -z "${RECEIVER_URL:-}" ]]; then
  RECEIVER_URL="https://${CLOUD_DOMAIN}:3001"
fi
# 경로(/events/ingest/mcap)는 제너레이터가 붙이므로 베이스만 남기고 잘라낸다(중복 방지).
RECEIVER_URL="${RECEIVER_URL:-}"
RECEIVER_URL="${RECEIVER_URL%/events/ingest/mcap}"
RECEIVER_URL="${RECEIVER_URL%/}"

# --- 인자 검증 ---
if ! [[ "$INTERVAL" =~ ^[0-9]+$ ]] || [[ "$INTERVAL" -lt 1 ]]; then
  echo "사용법: $0 <초(양의정수)> [횟수] [host]" >&2
  echo "예)    $0 10        # 10초마다 무한 반복" >&2
  exit 2
fi
if ! [[ "$COUNT" =~ ^[0-9]+$ ]]; then
  echo "[ERROR] 횟수는 0 이상의 정수여야 합니다: $COUNT" >&2
  exit 2
fi

URL="http://${HOST}:${GEN_PORT}/send"
if [[ -n "$RECEIVER_URL" ]]; then
  BODY="{\"durationMinutes\":${DURATION_MIN},\"logsPerSecond\":${LOGS_PER_SEC},\"receiverUrl\":\"${RECEIVER_URL}\"}"
else
  BODY="{\"durationMinutes\":${DURATION_MIN},\"logsPerSecond\":${LOGS_PER_SEC}}"
fi

i=0
# Ctrl-C 깔끔 종료
trap 'echo; echo "[event-gen-loop] 중지됨 (총 ${i}회 발생)"; exit 0' INT TERM

if [[ "$COUNT" -eq 0 ]]; then
  echo "[event-gen-loop] ${URL} 를 ${INTERVAL}초마다 무한 호출 (Ctrl-C로 종료)"
else
  echo "[event-gen-loop] ${URL} 를 ${INTERVAL}초마다 ${COUNT}회 호출"
fi
echo "[event-gen-loop] body=${BODY}"

while :; do
  i=$((i + 1))

  hdr="$(mktemp)"
  code="$(curl -sS -D "$hdr" -o /dev/null -w '%{http_code}' -m 60 \
    -X POST "$URL" \
    -H 'Content-Type: application/json' \
    -d "$BODY" 2>/dev/null)" || code="ERR"
  # 실제 receiver 적재 결과(제너레이터가 receiver 로 push 한 응답코드)
  rstatus="$(grep -i '^x-receiver-status:' "$hdr" | tr -d '\r' | awk '{print $2}')"
  rm -f "$hdr"
  [[ -z "$rstatus" ]] && rstatus='-'

  ts="$(date '+%H:%M:%S')"
  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    if [[ "$rstatus" =~ ^2[0-9][0-9]$ ]]; then
      echo "[event-gen-loop] #${i} ${ts} -> /send ${code} OK, receiver=${rstatus} (적재됨)"
    else
      echo "[event-gen-loop] #${i} ${ts} -> /send ${code} OK 이지만 receiver=${rstatus} (적재 실패! receiverUrl/네트워크 확인)"
    fi
  else
    echo "[event-gen-loop] #${i} ${ts} -> HTTP ${code} FAIL (event_generator(${HOST}:${GEN_PORT}) 가 떠 있는지 확인)"
  fi

  # 지정 횟수 도달 시 종료
  if [[ "$COUNT" -ne 0 && "$i" -ge "$COUNT" ]]; then
    echo "[event-gen-loop] 완료 (${i}회)"
    break
  fi

  sleep "$INTERVAL"
done
