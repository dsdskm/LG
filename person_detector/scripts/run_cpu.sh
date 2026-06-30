#!/usr/bin/env bash
# CPU 컨테이너 빌드 + 실행 (docker-compose.yaml, 기본 ros 토픽 구독)
# 사용:
#   ./scripts/run_cpu.sh
#   LAUNCH_ARGS="imgsz:=320" ./scripts/run_cpu.sh
#   CAMERA_TYPE=realsense ./scripts/run_cpu.sh   # USB 직접
set -e

WS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WS_DIR"

# GPU(jetson) 컨테이너 떠 있으면 내리기(8081/이름 충돌 방지)
docker compose -f docker-compose.jetson.yaml down 2>/dev/null || true

docker compose --profile realsense up --build "$@"
