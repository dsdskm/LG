#!/usr/bin/env bash
# person_detector 빌드 스크립트
# 사용법: ./build.sh
set -e

# 스크립트 위치 = 워크스페이스 루트
WS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WS_DIR"

source /opt/ros/humble/setup.bash

# venv 활성화 (있으면) -> 설치되는 실행 스크립트가 venv python 을 가리키도록
VENV_DIR="$WS_DIR/venv"
if [ -f "$VENV_DIR/bin/activate" ]; then
    # shellcheck disable=SC1091
    source "$VENV_DIR/bin/activate"
    echo "venv 활성화: $VENV_DIR"
else
    echo "venv 가 없습니다. 먼저 ./install_deps.sh 를 실행하세요." >&2
    exit 1
fi

echo "colcon build (person_detector) ..."
colcon build --packages-select person_detector

echo "빌드 완료. 실행: ./run.sh"
