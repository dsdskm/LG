#!/usr/bin/env bash
# 발행 토픽 구독 (가장 가까운 사람의 distance/facing/handshaking 등)
#   ./scripts/echo.sh
set -e
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID="${ROS_DOMAIN_ID:-19}"
ros2 topic echo /person_detector/event
