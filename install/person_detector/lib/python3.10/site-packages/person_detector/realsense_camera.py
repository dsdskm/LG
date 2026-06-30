"""카메라 소스 래퍼.

- RealSenseCamera: D435 컬러 + depth(정렬). read() -> (color, depth)
- WebcamCamera: 일반 USB/노트북 웹캠. depth 없음. read() -> (color, None)

두 클래스는 동일한 인터페이스(start / read / stop)를 가져, detector_node 에서
camera_type 파라미터로 바꿔 끼울 수 있다.
"""

import cv2
import numpy as np
# pyrealsense2 는 Jetson 등에서 미설치일 수 있어 지연 import (RealSenseCamera.start 내부)


class RealSenseCamera:
    def __init__(self, width=640, height=480, fps=30):
        self.width = width
        self.height = height
        self.fps = fps
        self.pipeline = None
        self.align = None
        self.depth_scale = None

    def start(self):
        import pyrealsense2 as rs
        self.pipeline = rs.pipeline()
        config = rs.config()
        config.enable_stream(
            rs.stream.color, self.width, self.height, rs.format.bgr8, self.fps
        )
        config.enable_stream(
            rs.stream.depth, self.width, self.height, rs.format.z16, self.fps
        )
        profile = self.pipeline.start(config)

        depth_sensor = profile.get_device().first_depth_sensor()
        self.depth_scale = depth_sensor.get_depth_scale()
        # depth 를 color 프레임 좌표계로 정렬 -> bbox 좌표로 바로 depth 조회 가능
        self.align = rs.align(rs.stream.color)
        return self.depth_scale

    def read(self):
        """정렬된 (color_image, depth_image) 를 반환. 프레임이 없으면 (None, None)."""
        frames = self.pipeline.wait_for_frames()
        aligned = self.align.process(frames)
        color_frame = aligned.get_color_frame()
        depth_frame = aligned.get_depth_frame()
        if not color_frame or not depth_frame:
            return None, None
        color_image = np.asanyarray(color_frame.get_data())
        depth_image = np.asanyarray(depth_frame.get_data())
        return color_image, depth_image

    def stop(self):
        if self.pipeline is not None:
            self.pipeline.stop()
            self.pipeline = None


class WebcamCamera:
    """일반 웹캠 래퍼. depth 가 없으므로 read() 는 (color, None) 을 반환한다."""

    def __init__(self, index=0, width=640, height=480):
        self.index = index
        self.width = width
        self.height = height
        self.cap = None

    def start(self):
        self.cap = cv2.VideoCapture(self.index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        if not self.cap.isOpened():
            raise RuntimeError(f'웹캠(index={self.index}) 을 열 수 없습니다.')
        return None  # depth_scale 없음

    def read(self):
        ok, color_image = self.cap.read()
        if not ok or color_image is None:
            return None, None
        return color_image, None

    def stop(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None
