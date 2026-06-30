FROM nvidia/cuda:12.6.0-base-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# apt/pip 가 IPv6 로 붙다 실패하는 환경 회피 (IPv4 강제)
RUN echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4

# ---- ROS2 humble ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    locales software-properties-common curl gnupg2 && \
    locale-gen en_US en_US.UTF-8 && \
    add-apt-repository universe
RUN curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
      -o /usr/share/keyrings/ros-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" \
      > /etc/apt/sources.list.d/ros2.list

ARG ROS_DISTRO=humble
ENV ROS_DISTRO=${ROS_DISTRO}

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip git \
    ros-${ROS_DISTRO}-ros-base \
    python3-colcon-common-extensions \
    ros-${ROS_DISTRO}-rmw-cyclonedds-cpp \
    udev \
    # cv2(GUI)·OpenGL 런타임
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# RealSense udev rules (USB 권한)
RUN curl -sL https://github.com/IntelRealSense/librealsense/raw/master/config/99-realsense-libusb.rules \
    -o /etc/udev/rules.d/99-realsense-libusb.rules

# ---- python 의존성 (ros 모드: ultralytics / opencv / torch, pyrealsense2 제외) ----
COPY src/person_detector/requirements-docker.txt /tmp/requirements.txt
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

# pose 모델 가중치 미리 다운로드 (런타임 네트워크 불필요)
WORKDIR /ws
RUN python3 -c "from ultralytics import YOLO; YOLO('yolov8n-pose.pt')"

RUN echo "source /opt/ros/${ROS_DISTRO}/setup.bash" >> /root/.bashrc

COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
