"""ROS2 토픽 구독 카메라 (Jetson/로봇에서 realsense2_camera 노드가 토픽을 쏠 때).

color + (color에 정렬된)depth Image 토픽을 구독해 최신 프레임을 보관하고,
read() 로 (color_bgr, depth_uint16) 를 반환한다. RealSenseCamera/WebcamCamera 와 동일 인터페이스.

depth 는 16UC1(mm) 가정. 노드의 depth_scale 을 0.001(mm->m)로 두면 거리 계산이 맞는다.
정확한 거리를 위해 depth 는 color 에 정렬된 토픽
(/camera/.../aligned_depth_to_color/image_raw)을 쓰는 것을 권장.

추가 기능:
- 일정 시간 color 프레임이 끊기면 subscription 을 destroy/create 하여 자동 재구독
- 앱 재시작 없이 토픽 수신만 복구
"""

import threading
import time

import cv2
import numpy as np
from rclpy.executors import SingleThreadedExecutor
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import Image


class RosTopicCamera:
    def __init__(
        self,
        node,
        color_topic,
        depth_topic,
        resubscribe_timeout_sec=2.0,
        resubscribe_cooldown_sec=1.0,
    ):
        self.node = node
        self.color_topic = color_topic
        self.depth_topic = depth_topic

        self.resubscribe_timeout_sec = float(resubscribe_timeout_sec)
        self.resubscribe_cooldown_sec = float(resubscribe_cooldown_sec)

        self._color = None
        self._depth = None
        self._seq = 0
        self._last_read_seq = -1
        self._last_color_ts = 0.0
        self._last_depth_ts = 0.0
        self._last_resubscribe_ts = 0.0
        self._started_ts = time.time()

        self._lock = threading.Lock()
        self._sub_lock = threading.Lock()
        self._frame_event = threading.Event()
        self._executor = None
        self._spin_thread = None

        self._color_sub = None
        self._depth_sub = None

    def start(self):
        self._create_subscriptions()

        # 구독 콜백 수신용 백그라운드 spin
        self._executor = SingleThreadedExecutor()
        self._executor.add_node(self.node)

        self._spin_thread = threading.Thread(target=self._spin_forever, daemon=True)
        self._spin_thread.start()

        self.node.get_logger().info(
            f"ROS 토픽 구독: color={self.color_topic}, depth={self.depth_topic}"
        )
        return None

    def _spin_forever(self):
        import rclpy

        while rclpy.ok():
            try:
                self._executor.spin()
            except Exception as e:
                self.node.get_logger().warn(f"executor spin 재시작: {e}")
                time.sleep(0.1)

    def _create_subscriptions(self):
        with self._sub_lock:
            if self._color_sub is None:
                self._color_sub = self.node.create_subscription(
                    Image,
                    self.color_topic,
                    self._on_color,
                    qos_profile_sensor_data,
                )
            if self._depth_sub is None:
                self._depth_sub = self.node.create_subscription(
                    Image,
                    self.depth_topic,
                    self._on_depth,
                    qos_profile_sensor_data,
                )

    def _destroy_subscriptions(self):
        with self._sub_lock:
            if self._color_sub is not None:
                try:
                    self.node.destroy_subscription(self._color_sub)
                except Exception as e:
                    self.node.get_logger().warn(f"color subscription 해제 실패: {e}")
                self._color_sub = None

            if self._depth_sub is not None:
                try:
                    self.node.destroy_subscription(self._depth_sub)
                except Exception as e:
                    self.node.get_logger().warn(f"depth subscription 해제 실패: {e}")
                self._depth_sub = None

    def _clear_buffers(self):
        with self._lock:
            self._color = None
            self._depth = None
            self._last_read_seq = -1
        self._frame_event.clear()

    def _on_color(self, msg):
        try:
            enc = msg.encoding
            if enc in ("rgb8", "bgr8"):
                img = np.frombuffer(msg.data, np.uint8).reshape(msg.height, msg.width, 3)
                if enc == "rgb8":
                    img = img[:, :, ::-1]  # RGB -> BGR
            elif enc in ("mono8", "8UC1"):
                g = np.frombuffer(msg.data, np.uint8).reshape(msg.height, msg.width)
                img = cv2.cvtColor(g, cv2.COLOR_GRAY2BGR)
            elif enc in ("mono16", "16UC1"):
                g = np.frombuffer(msg.data, np.uint16).reshape(msg.height, msg.width)
                g = cv2.convertScaleAbs(g, alpha=255.0 / (g.max() or 1))
                img = cv2.cvtColor(g, cv2.COLOR_GRAY2BGR)
            else:
                return

            img = np.ascontiguousarray(img)

            with self._lock:
                self._color = img
                self._seq += 1
                self._last_color_ts = time.time()

            self._frame_event.set()
        except Exception as e:
            self.node.get_logger().warn(f"color 콜백 무시: {e}")

    def _on_depth(self, msg):
        try:
            if msg.encoding not in ("16UC1", "mono16"):
                return
            depth = np.frombuffer(msg.data, np.uint16).reshape(msg.height, msg.width)
            with self._lock:
                self._depth = depth
                self._last_depth_ts = time.time()
        except Exception as e:
            self.node.get_logger().warn(f"depth 콜백 무시: {e}")

    def _maybe_auto_resubscribe(self):
        now = time.time()

        with self._lock:
            last_color_ts = self._last_color_ts

        base_ts = last_color_ts if last_color_ts > 0.0 else self._started_ts
        stalled = (now - base_ts) >= self.resubscribe_timeout_sec
        cooled = (now - self._last_resubscribe_ts) >= self.resubscribe_cooldown_sec

        if stalled and cooled:
            self.force_resubscribe(reason=f"auto no color for {now - base_ts:.1f}s")

    def force_resubscribe(self, reason="manual"):
        now = time.time()
        if (now - self._last_resubscribe_ts) < self.resubscribe_cooldown_sec:
            return

        self._last_resubscribe_ts = now
        self.node.get_logger().warn(
            f"ROS 카메라 재구독 시작 ({reason}) "
            f"[color={self.color_topic}, depth={self.depth_topic}]"
        )

        self._destroy_subscriptions()
        self._clear_buffers()

        # DDS discovery / endpoint 정리 시간
        time.sleep(0.2)

        self._create_subscriptions()

        self.node.get_logger().warn("ROS 카메라 재구독 완료")

    def read(self):
        signaled = self._frame_event.wait(timeout=1.0)
        self._frame_event.clear()

        if not signaled:
            self._maybe_auto_resubscribe()

        with self._lock:
            if self._color is None or self._seq == self._last_read_seq:
                color, depth = None, None
            else:
                self._last_read_seq = self._seq
                color = self._color.copy()
                depth = None if self._depth is None else self._depth.copy()

        if color is None:
            return color, depth

        # depth 해상도가 color 와 다르면 color 크기에 맞춰 리사이즈
        if depth is not None and depth.shape[:2] != color.shape[:2]:
            h, w = color.shape[:2]
            depth = cv2.resize(depth, (w, h), interpolation=cv2.INTER_NEAREST)

        return color, depth

    def stop(self):
        self._destroy_subscriptions()

        if self._executor is not None:
            try:
                self._executor.shutdown()
            except Exception:
                pass
            self._executor = None