"""카메라 토픽 구독 -> GUI 창으로 표시 (카메라 동작 확인용, 검출 없음).

사용: python3 tools/cam_test.py [color_topic]
"""
import sys

import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image

TOPIC = sys.argv[1] if len(sys.argv) > 1 else '/camera/camera/color/image_raw'


class Viewer(Node):
    def __init__(self):
        super().__init__('cam_test')
        self.create_subscription(Image, TOPIC, self.cb, 10)
        self.get_logger().info(f'구독: {TOPIC}  (창에서 q 로 종료)')

    def cb(self, msg):
        if msg.encoding not in ('rgb8', 'bgr8'):
            self.get_logger().warn(f'지원 안 하는 encoding: {msg.encoding}')
            return
        img = np.frombuffer(msg.data, np.uint8).reshape(msg.height, msg.width, 3)
        if msg.encoding == 'rgb8':
            img = img[:, :, ::-1]
        cv2.imshow('cam_test', img)
        if (cv2.waitKey(1) & 0xFF) == ord('q'):
            raise KeyboardInterrupt


def main():
    rclpy.init()
    node = Viewer()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        cv2.destroyAllWindows()
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
