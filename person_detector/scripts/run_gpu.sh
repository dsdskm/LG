#!/usr/bin/env bash
# Jetson Orin GPU 컨테이너 빌드 + 실행
#
# 사용:
#   ./scripts/run_gpu.sh
#   ./scripts/run_gpu.sh -d
#   LAUNCH_ARGS="distance_threshold:=1.5 process_fps:=10" ./scripts/run_gpu.sh -d
#   CAMERA_ARGS="rgb_camera.color_profile:=640x480x30 depth_module.depth_profile:=640x480x30" ./scripts/run_gpu.sh -d

set -e

WS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WS_DIR"

echo "BASE_IMAGE=${BASE_IMAGE:-<compose default>}"
echo "CAMERA_ARGS=${CAMERA_ARGS:-}"
echo "LAUNCH_ARGS=${LAUNCH_ARGS:-}"
echo "docker compose extra args: $*"

docker compose --profile realsense down 2>/dev/null || true
docker compose -f docker-compose.jetson.yaml down 2>/dev/null || true

pkill -f rs_launch 2>/dev/null || true
pkill -f realsense2_camera 2>/dev/null || true

sleep 10

docker compose -f docker-compose.jetson.yaml up --build --force-recreate "$@"