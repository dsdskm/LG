from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    distance_threshold = LaunchConfiguration('distance_threshold')
    min_confidence = LaunchConfiguration('min_confidence')
    yolo_model = LaunchConfiguration('yolo_model')
    enable_display = LaunchConfiguration('enable_display')
    enable_stream = LaunchConfiguration('enable_stream')
    stream_port = LaunchConfiguration('stream_port')
    camera_type = LaunchConfiguration('camera_type')
    webcam_index = LaunchConfiguration('webcam_index')
    color_topic = LaunchConfiguration('color_topic')
    depth_topic = LaunchConfiguration('depth_topic')

    return LaunchDescription([
        DeclareLaunchArgument('distance_threshold', default_value='3.0',
                              description='임계 거리(m): 이보다 가까우면 발행'),
        DeclareLaunchArgument('min_confidence', default_value='0.5',
                              description='YOLO 사람 신뢰도 임계값'),
        DeclareLaunchArgument('yolo_model', default_value='yolov8n-pose.pt',
                              description='YOLO 모델 경로/이름 (방향/악수 추정에 pose 모델 필요)'),
        DeclareLaunchArgument('enable_display', default_value='true',
                              description='OpenCV 창 표시(로컬 GUI)'),
        DeclareLaunchArgument('enable_stream', default_value='false',
                              description='MJPEG 웹 스트리밍(컨테이너용)'),
        DeclareLaunchArgument('stream_port', default_value='8080',
                              description='웹 스트리밍 포트'),
        DeclareLaunchArgument('camera_type', default_value='realsense',
                              description="카메라 종류: 'realsense' | 'webcam' | 'ros'"),
        DeclareLaunchArgument('webcam_index', default_value='0',
                              description='웹캠 /dev/videoN 인덱스'),
        DeclareLaunchArgument('color_topic',
                              default_value='/camera/camera/color/image_raw',
                              description='ros 모드 color 토픽'),
        DeclareLaunchArgument('depth_topic',
                              default_value='/camera/camera/aligned_depth_to_color/image_raw',
                              description='ros 모드 depth(정렬) 토픽'),
        Node(
            package='person_detector',
            executable='person_detector',
            name='person_detector',
            output='screen',
            parameters=[{
                'distance_threshold': distance_threshold,
                'min_confidence': min_confidence,
                'yolo_model': yolo_model,
                'enable_display': enable_display,
                'enable_stream': enable_stream,
                'stream_port': stream_port,
                'camera_type': camera_type,
                'webcam_index': webcam_index,
                'color_topic': color_topic,
                'depth_topic': depth_topic,
            }],
        ),
    ])
