#!/bin/bash

# scripts/run/ 에서 레포 루트로 이동 (apps/ros2/wanderer.rviz 상대경로 기준)
cd "$(dirname "$0")/../.."

echo "🔧 Sourcing ROS2 Humble..."
source /opt/ros/humble/setup.bash

echo "🖥️ Starting RViz2..."
rviz2 -d apps/ros2/wanderer.rviz