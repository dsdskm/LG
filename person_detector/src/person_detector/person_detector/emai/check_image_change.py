#!/usr/bin/env python3

import argparse
import hashlib
import time

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image


class ImageChangeChecker(Node):
    def __init__(self, topic):
        super().__init__("image_change_checker")
        self.topic = topic
        self.prev_hash = None
        self.prev_stamp = None
        self.count = 0
        self.changed_count = 0
        self.last_print = time.time()

        self.sub = self.create_subscription(
            Image,
            topic,
            self.callback,
            10,
        )

        self.get_logger().info(f"구독 시작: {topic}")

    def callback(self, msg):
        self.count += 1

        h = hashlib.md5(msg.data).hexdigest()
        stamp = f"{msg.header.stamp.sec}.{msg.header.stamp.nanosec:09d}"

        data_changed = self.prev_hash is not None and h != self.prev_hash
        stamp_changed = self.prev_stamp is not None and stamp != self.prev_stamp

        if data_changed:
            self.changed_count += 1

        now = time.time()
        if now - self.last_print >= 1.0:
            print(
                f"frames={self.count}, "
                f"data_changed={data_changed}, "
                f"changed_count={self.changed_count}, "
                f"stamp_changed={stamp_changed}, "
                f"stamp={stamp}, "
                f"encoding={msg.encoding}, "
                f"size={msg.width}x{msg.height}, "
                f"md5={h[:12]}"
            )
            self.last_print = now

        self.prev_hash = h
        self.prev_stamp = stamp


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", default="/emai/cam_high/color")
    args = parser.parse_args()

    rclpy.init()
    node = ImageChangeChecker(args.topic)

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()