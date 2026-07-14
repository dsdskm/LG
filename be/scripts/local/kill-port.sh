#!/usr/bin/env bash

set -euo pipefail

PORT="${1:-}"

if [[ -z "$PORT" ]]; then
  echo "사용법: ./dev-kill-port.sh <port>"
  echo "예시: ./dev-kill-port.sh 3001"
  exit 1
fi

if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  echo "에러: 포트는 숫자여야 합니다. 입력값: $PORT"
  exit 1
fi

PIDS="$(lsof -ti tcp:"$PORT" || true)"

if [[ -z "$PIDS" ]]; then
  echo "포트 $PORT 를 사용 중인 프로세스가 없습니다."
  exit 0
fi

echo "포트 $PORT 사용 중인 PID: $PIDS"
echo "프로세스를 종료합니다..."

kill -15 $PIDS 2>/dev/null || true
sleep 1

REMAINING_PIDS="$(lsof -ti tcp:"$PORT" || true)"

if [[ -n "$REMAINING_PIDS" ]]; then
  echo "정상 종료되지 않은 PID 강제 종료: $REMAINING_PIDS"
  kill -9 $REMAINING_PIDS 2>/dev/null || true
fi

FINAL_PIDS="$(lsof -ti tcp:"$PORT" || true)"

if [[ -z "$FINAL_PIDS" ]]; then
  echo "포트 $PORT 정리 완료"
else
  echo "일부 프로세스를 종료하지 못했습니다: $FINAL_PIDS"
  exit 1
fi