#!/usr/bin/env bash
# person_detector 직접 실행
#
# 사용:
#   ./scripts/run.sh
#   ./scripts/run.sh distance_threshold:=1.5 process_fps:=10
#   ./scripts/run.sh center_handshake_zone_width_ratio:=0.25
#   CLEAN=1 ./scripts/run.sh

set -e

WS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WS_DIR"

source /opt/ros/humble/setup.bash

if [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
  export PYTHONPATH="$WS_DIR/venv/lib/python3.10/site-packages:$PYTHONPATH"
fi

export ROS_DOMAIN_ID="${ROS_DOMAIN_ID:-19}"
echo "ROS_DOMAIN_ID=$ROS_DOMAIN_ID"

if [ "${CLEAN:-0}" = "1" ]; then
  echo "클린 빌드"
  rm -rf build install log
fi

colcon build --packages-select person_detector
source install/setup.bash

ARGS="$*"
DEFAULTS=()

case "$ARGS" in *camera_type:=*)    ;; *) DEFAULTS+=("camera_type:=ros") ;; esac
case "$ARGS" in *enable_stream:=*)  ;; *) DEFAULTS+=("enable_stream:=true") ;; esac
case "$ARGS" in *enable_display:=*) ;; *) DEFAULTS+=("enable_display:=false") ;; esac

FINAL_ARGS=("${DEFAULTS[@]}" "$@")

echo "launch args: ${FINAL_ARGS[*]}"

ros2 launch person_detector person_detector_launch.py "${FINAL_ARGS[@]}"