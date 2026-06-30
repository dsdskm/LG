#!/usr/bin/env bash
# 가상환경(venv) 생성 + pip 의존성 설치
#
# ROS2 humble 의 rclpy 는 python3.10 용으로 빌드되어 있으므로
# venv 도 python3.10 으로 만들고, --system-site-packages 로 ROS 패키지를 공유한다.
# (pyrealsense2 / ultralytics / opencv / numpy 는 venv 안에 설치)
set -e

WS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WS_DIR"

VENV_DIR="$WS_DIR/venv"
PYTHON_BIN="${PYTHON_BIN:-python3.10}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    echo "$PYTHON_BIN 를 찾을 수 없습니다. ROS2 humble 과 맞는 python3.10 이 필요합니다." >&2
    exit 1
fi

if [ ! -d "$VENV_DIR" ]; then
    echo "가상환경 생성: $VENV_DIR ($PYTHON_BIN, --system-site-packages)"
    "$PYTHON_BIN" -m venv --system-site-packages "$VENV_DIR"
    # colcon 이 venv 폴더를 패키지로 스캔하지 않도록
    touch "$VENV_DIR/COLCON_IGNORE"
else
    echo "기존 가상환경 사용: $VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r "$WS_DIR/src/person_detector/requirements.txt"

echo "의존성 설치 완료. 다음: ./build.sh"
