"""realsense2_camera 노드 + person_detector(ros 모드) 를 한 번에 실행.

realsense2_camera 가 설치된 환경(로봇/Jetson)에서 사용.
  ros2 launch person_detector with_realsense_launch.py

person_detector 인자는 그대로 전달 가능:
  ros2 launch person_detector with_realsense_launch.py distance_threshold:=2.0
"""

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource


def generate_launch_description():
    rs_launch = os.path.join(
        get_package_share_directory('realsense2_camera'), 'launch', 'rs_launch.py')
    pd_launch = os.path.join(
        get_package_share_directory('person_detector'),
        'launch', 'person_detector_launch.py')

    return LaunchDescription([
        # 카메라 노드 (color 에 정렬된 depth 포함)
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(rs_launch),
            launch_arguments={'align_depth.enable': 'true'}.items(),
        ),
        # person_detector: 토픽 구독 모드
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(pd_launch),
            launch_arguments={'camera_type': 'ros'}.items(),
        ),
    ])
