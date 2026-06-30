from glob import glob

from setuptools import find_packages, setup

package_name = 'person_detector'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        ('share/' + package_name + '/launch', glob('launch/*.py')),
    ],
    install_requires=[
        'setuptools',
        'numpy',
        # 아래는 pip 로 별도 설치 (rosdep 으로 관리되지 않음)
        # 'pyrealsense2',
        # 'ultralytics',
        # 'opencv-python',
    ],
    zip_safe=True,
    maintainer='kkh',
    maintainer_email='kkh.kim@lge.com',
    description='특정 거리에 사람이 나타나면 ROS2 토픽을 발행하는 노드 (RealSense D435 + YOLO)',
    license='TODO: License declaration',
    extras_require={
        'test': [
            'pytest',
        ],
    },
    entry_points={
        'console_scripts': [
            'person_detector = person_detector.detector_node:main',
        ],
    },
)
