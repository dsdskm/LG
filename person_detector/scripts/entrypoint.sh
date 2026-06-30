#!/bin/bash
set -e

# RMW: 지정되면 사용, 아니면 ROS 기본(fastrtps). 로봇과 같아야 토픽이 보임
[ -n "$RMW_IMPLEMENTATION" ] && export RMW_IMPLEMENTATION
source "/opt/ros/$ROS_DISTRO/setup.bash"

cd /ws
# 마운트된 소스 빌드
if [ -d "src" ]; then
  echo "colcon build ..."
  colcon build --packages-select person_detector
  source install/setup.bash
fi

export ROS_DOMAIN_ID="${ROS_DOMAIN_ID:-19}"
echo "ROS_DOMAIN_ID=$ROS_DOMAIN_ID"

if [ "$DEV_MODE" = "true" ]; then
  echo "DEV_MODE: 컨테이너 유지(수동 실행)."
  exec tail -f /dev/null
fi

# LAUNCH_CAMERA=true 면 컨테이너 안에서 realsense2_camera 노드를 먼저 띄움
# (CAMERA_ARGS 로 해상도/fps 조절. align_depth 켜서 거리/악수용 정렬 depth 발행)
if [ "${LAUNCH_CAMERA:-false}" = "true" ]; then
  echo "realsense2_camera 노드 시작 ${CAMERA_ARGS}"
  ros2 launch realsense2_camera rs_launch.py \
    align_depth.enable:=true ${CAMERA_ARGS} &
  sleep 4   # 토픽 올라올 시간
fi

# CAMERA_TYPE: ros(기본, 토픽 구독) | realsense | webcam
CAMERA_TYPE="${CAMERA_TYPE:-ros}"
echo "launch: camera_type:=${CAMERA_TYPE} enable_display:=false enable_stream:=true ${LAUNCH_ARGS}"
exec ros2 launch person_detector person_detector_launch.py \
  camera_type:="${CAMERA_TYPE}" enable_display:=false enable_stream:=true ${LAUNCH_ARGS}
