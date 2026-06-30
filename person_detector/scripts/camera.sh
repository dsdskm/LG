#!/usr/bin/env bash
# 1) RealSense 카메라 노드 실행 (color + 정렬 depth 토픽 발행)
#    person_detector(ros 모드)가 쓰는 토픽을 띄운다.
set -e
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID="${ROS_DOMAIN_ID:-19}"

# align_depth.enable:=true -> /camera/camera/aligned_depth_to_color/image_raw 발행
# (거리 정확도에 필요). pointcloud 는 부하 커서 끔(Frames Timeout 회피). fps 낮춤.
ros2 launch realsense2_camera rs_launch.py \
  depth_module.profile:=640x480x15 \
  rgb_camera.profile:=640x480x15 \
  align_depth.enable:=true \
  pointcloud.enable:=false \
  "$@"
