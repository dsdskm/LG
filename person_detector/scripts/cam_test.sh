#!/usr/bin/env bash
# 2) 카메라 테스트: 토픽 구독해서 GUI 창으로 영상 확인 (검출 없음)
#    사용: ./cam_test.sh [color_topic]
set -e
WS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WS_DIR"

source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID="${ROS_DOMAIN_ID:-19}"

# venv 있으면(호스트 개발) 사용, 없으면(타겟) 시스템 python
if [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
  export PYTHONPATH="$WS_DIR/venv/lib/python3.10/site-packages:$PYTHONPATH"
fi

python3 tools/cam_test.py "${1:-/camera/camera/color/image_raw}"
