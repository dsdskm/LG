#!/usr/bin/env python3
"""
ROS2 Image 토픽 간단 확인 앱.

기능:
  - sensor_msgs/msg/Image 토픽 구독
  - OpenCV 창으로 실시간 표시
  - FPS / 해상도 / encoding 오버레이
  - S 키: 현재 프레임 PNG 저장
  - Q 또는 ESC: 종료

예:
  python3 ros2_image_viewer.py --topic /emai/cam_high/color
  python3 ros2_image_viewer.py --topic /emai/cam_high/color --no-window --save-once
"""

import argparse
import os
import time
from datetime import datetime

import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image


class Ros2ImageViewer(Node):
    def __init__(self, topic, window_name, no_window=False, save_once=False, save_dir="."):
        super().__init__("ros2_image_viewer")

        self.topic = topic
        self.window_name = window_name
        self.no_window = no_window
        self.save_once = save_once
        self.save_dir = save_dir

        self.frame_count = 0
        self.last_fps_time = time.time()
        self.fps = 0.0
        self.last_frame = None
        self.last_info = ""
        self.saved_once = False

        os.makedirs(self.save_dir, exist_ok=True)

        self.sub = self.create_subscription(
            Image,
            self.topic,
            self.image_callback,
            10,
        )

        self.get_logger().info(f"구독 시작: {self.topic}")
        self.get_logger().info("키: S=저장, Q/ESC=종료")

        if not self.no_window:
            cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)

    def image_callback(self, msg):
        try:
            frame = self.ros_image_to_cv2(msg)
        except Exception as e:
            self.get_logger().warn(f"이미지 변환 실패: {e}")
            return

        self.frame_count += 1
        now = time.time()
        elapsed = now - self.last_fps_time
        if elapsed >= 1.0:
            self.fps = self.frame_count / elapsed
            self.frame_count = 0
            self.last_fps_time = now

        self.last_info = (
            f"topic={self.topic} | "
            f"{msg.width}x{msg.height} | "
            f"encoding={msg.encoding} | "
            f"step={msg.step} | "
            f"fps={self.fps:.1f}"
        )

        self.last_frame = frame

        if self.save_once and not self.saved_once:
            self.save_frame(frame, prefix="first_frame")
            self.saved_once = True
            self.get_logger().info("--save-once 완료. 종료합니다.")
            rclpy.shutdown()
            return

        if not self.no_window:
            display = frame.copy()
            self.draw_overlay(display, self.last_info)
            cv2.imshow(self.window_name, display)

            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), ord("Q"), 27):
                self.get_logger().info("종료 키 입력")
                rclpy.shutdown()
                return
            if key in (ord("s"), ord("S")):
                self.save_frame(frame)

    def ros_image_to_cv2(self, msg):
        encoding = (msg.encoding or "").lower()
        data = np.frombuffer(msg.data, dtype=np.uint8)

        if encoding in ("bgr8", "rgb8"):
            channels = 3
            image = data.reshape((msg.height, msg.step // channels, channels))
            image = image[:, :msg.width, :]
            if encoding == "rgb8":
                image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            return image.copy()

        if encoding in ("bgra8", "rgba8"):
            channels = 4
            image = data.reshape((msg.height, msg.step // channels, channels))
            image = image[:, :msg.width, :]
            if encoding == "rgba8":
                image = cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)
            else:
                image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
            return image.copy()

        if encoding in ("mono8", "8uc1"):
            image = data.reshape((msg.height, msg.step))
            image = image[:, :msg.width]
            return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

        if encoding in ("mono16", "16uc1"):
            data16 = np.frombuffer(msg.data, dtype=np.uint16)
            image16 = data16.reshape((msg.height, msg.step // 2))
            image16 = image16[:, :msg.width]
            if image16.max() > image16.min():
                image8 = cv2.convertScaleAbs(
                    image16,
                    alpha=255.0 / max(1.0, float(image16.max() - image16.min())),
                    beta=-float(image16.min()) * 255.0 / max(1.0, float(image16.max() - image16.min())),
                )
            else:
                image8 = np.zeros_like(image16, dtype=np.uint8)
            return cv2.cvtColor(image8, cv2.COLOR_GRAY2BGR)

        if encoding in ("32fc1",):
            data32 = np.frombuffer(msg.data, dtype=np.float32)
            image32 = data32.reshape((msg.height, msg.step // 4))
            image32 = image32[:, :msg.width]
            finite = np.isfinite(image32)
            if np.any(finite):
                valid = image32[finite]
                mn = float(np.min(valid))
                mx = float(np.max(valid))
                denom = max(1e-6, mx - mn)
                image8 = np.zeros_like(image32, dtype=np.uint8)
                image8[finite] = np.clip((image32[finite] - mn) * 255.0 / denom, 0, 255).astype(np.uint8)
            else:
                image8 = np.zeros((msg.height, msg.width), dtype=np.uint8)
            return cv2.cvtColor(image8, cv2.COLOR_GRAY2BGR)

        raise ValueError(
            f"지원하지 않는 encoding: {msg.encoding}. "
            "지원: bgr8/rgb8/bgra8/rgba8/mono8/mono16/16UC1/32FC1"
        )

    def draw_overlay(self, image, text):
        h, w = image.shape[:2]
        overlay = image.copy()
        cv2.rectangle(overlay, (0, 0), (w, 54), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.55, image, 0.45, 0, image)

        cv2.putText(
            image,
            text,
            (10, 24),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )
        cv2.putText(
            image,
            "S: save | Q/ESC: quit",
            (10, 46),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 255, 255),
            1,
            cv2.LINE_AA,
        )

    def save_frame(self, frame, prefix="frame"):
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.join(self.save_dir, f"{prefix}_{ts}.png")
        ok = cv2.imwrite(filename, frame)
        if ok:
            self.get_logger().info(f"저장 완료: {filename}")
        else:
            self.get_logger().warn(f"저장 실패: {filename}")

    def destroy_node(self):
        try:
            cv2.destroyAllWindows()
        except Exception:
            pass
        super().destroy_node()


def parse_args():
    parser = argparse.ArgumentParser(description="ROS2 sensor_msgs/Image 간단 뷰어")
    parser.add_argument("--topic", default="/emai/cam_high/color", help="구독할 Image 토픽")
    parser.add_argument("--window-name", default="ros2_image_viewer", help="OpenCV 창 이름")
    parser.add_argument("--no-window", action="store_true", help="창을 띄우지 않음")
    parser.add_argument("--save-once", action="store_true", help="첫 프레임만 저장하고 종료")
    parser.add_argument("--save-dir", default=".", help="이미지 저장 폴더")
    return parser.parse_args()


def main():
    args = parse_args()

    rclpy.init()
    node = Ros2ImageViewer(
        topic=args.topic,
        window_name=args.window_name,
        no_window=args.no_window,
        save_once=args.save_once,
        save_dir=args.save_dir,
    )

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        if rclpy.ok():
            node.destroy_node()
            rclpy.shutdown()
        else:
            try:
                node.destroy_node()
            except Exception:
                pass


if __name__ == "__main__":
    main()
