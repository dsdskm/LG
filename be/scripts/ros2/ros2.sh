#!/bin/bash

set -e

# 로그 레벨 (인자 없으면 기본 INFO 이상 다 보임)
# 사용법: ./dev-ros2.sh [레벨]
#
# 레벨 종류:
#   debug   - DEBUG + INFO + WARN + ERROR + FATAL 전부
#   info    - INFO + WARN + ERROR + FATAL (기본값)
#   warn    - WARN + ERROR + FATAL
#   error   - ERROR + FATAL 만
#   fatal   - FATAL 만
#
# 예시:
#   ./dev-ros2.sh          → INFO 이상 전부
#   ./dev-ros2.sh error    → ERROR, FATAL 만
#   ./dev-ros2.sh warn     → WARN, ERROR, FATAL 만

LOG_LEVEL=${1:-info}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# scripts/run/ 에서 레포 루트로 이동 (colcon build / install 산출물이 루트 기준)
cd "$SCRIPT_DIR/../.."

echo "🔧 Sourcing ROS2 Humble..."
source /opt/ros/humble/setup.bash

echo "🔨 Building robot_wanderer..."
colcon build --packages-select robot_wanderer

echo "📦 Sourcing install..."
source install/setup.bash

echo "🤖 Starting wanderer node... (log level: $LOG_LEVEL)"
./install/robot_wanderer/bin/wanderer --ros-args --log-level "$LOG_LEVEL"