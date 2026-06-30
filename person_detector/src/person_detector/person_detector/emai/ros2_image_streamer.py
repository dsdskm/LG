#!/usr/bin/env python3
"""
ROS2 sensor_msgs/Image 토픽을 MJPEG HTTP 스트리밍으로 확인하는 간단 앱.

기능:
  - ROS2 Image 토픽 구독
  - 브라우저에서 실시간 MJPEG 스트리밍 확인
  - 브라우저에서 현재 프레임 스크린샷 저장

예:
  python3 ros2_image_streamer.py --topic /emai/cam_high/color --port 8090

브라우저:
  http://<host-ip>:8090/
"""

import argparse
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image


_PAGE = """<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>ROS2 Image Streamer</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    html, body {
      margin: 0;
      height: 100%;
      background: #000;
      color: #fff;
      font-family: Arial, sans-serif;
      overflow: hidden;
    }

    .wrap {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000;
    }

    #stream {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      background: #000;
      user-select: none;
      -webkit-user-drag: none;
    }

    .toolbar {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 10;
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
      max-width: calc(100% - 24px);
    }

    .btn {
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      background: rgba(20, 20, 20, 0.78);
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 2px 10px rgba(0,0,0,.35);
    }

    .btn:hover {
      background: rgba(40, 40, 40, 0.88);
    }

    .hint {
      position: absolute;
      left: 12px;
      bottom: 12px;
      z-index: 10;
      background: rgba(20, 20, 20, 0.72);
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 13px;
      color: #fff;
    }

    .toast {
      position: absolute;
      left: 50%;
      bottom: 56px;
      transform: translateX(-50%);
      z-index: 20;
      background: rgba(0, 0, 0, 0.82);
      color: #fff;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease;
      max-width: calc(100% - 32px);
      text-align: center;
      white-space: nowrap;
    }

    .toast.show {
      opacity: 1;
    }

    .flash {
      position: absolute;
      inset: 0;
      background: #fff;
      opacity: 0;
      pointer-events: none;
      z-index: 15;
    }

    .flash.show {
      animation: flashAnim 180ms ease;
    }

    @keyframes flashAnim {
      0% { opacity: 0; }
      20% { opacity: 0.55; }
      100% { opacity: 0; }
    }

    canvas {
      display: none;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <img id="stream" src="/stream" alt="ROS2 Image Stream">
    <canvas id="snapshotCanvas"></canvas>

    <div class="toolbar">
      <button class="btn" id="shotBtn" type="button">스크린샷 저장</button>
    </div>

    <div class="hint">S 키 / 버튼 / 더블클릭 = 현재 프레임 저장</div>
    <div class="toast" id="toast"></div>
    <div class="flash" id="flash"></div>
  </div>

  <script>
    const img = document.getElementById('stream');
    const canvas = document.getElementById('snapshotCanvas');
    const shotBtn = document.getElementById('shotBtn');
    const toast = document.getElementById('toast');
    const flash = document.getElementById('flash');

    function pad(n) {
      return String(n).padStart(2, '0');
    }

    function makeTimestamp() {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
    }

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => {
        toast.classList.remove('show');
      }, 1500);
    }

    function showFlash() {
      flash.classList.remove('show');
      void flash.offsetWidth;
      flash.classList.add('show');
    }

    function saveBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function saveScreenshot() {
      if (!img.complete || !img.naturalWidth || !img.naturalHeight) {
        showToast('아직 프레임이 없습니다');
        return;
      }

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const filename = `ros2_image_${makeTimestamp()}.png`;
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('스크린샷 저장 실패');
          return;
        }
        saveBlob(blob, filename);
        showFlash();
        showToast(`저장됨: ${filename}`);
      }, 'image/png');
    }

    shotBtn.addEventListener('click', saveScreenshot);
    img.addEventListener('dblclick', saveScreenshot);

    window.addEventListener('keydown', (e) => {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        saveScreenshot();
      }
    });
  </script>
</body>
</html>
"""


class MjpegHttpServer:
    def __init__(self, port=8090, jpeg_quality=80):
        self.port = int(port)
        self.jpeg_quality = int(jpeg_quality)
        self._lock = threading.Lock()
        self._jpeg = None
        self._info = "waiting for frame"
        self._httpd = None

    def update(self, frame_bgr, info=""):
        display = frame_bgr.copy()

        if info:
            h, w = display.shape[:2]
            overlay = display.copy()
            cv2.rectangle(overlay, (0, 0), (w, 32), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.55, display, 0.45, 0, display)
            cv2.putText(
                display,
                info,
                (8, 22),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

        ok, jpeg = cv2.imencode(
            ".jpg",
            display,
            [int(cv2.IMWRITE_JPEG_QUALITY), self.jpeg_quality],
        )
        if not ok:
            return

        with self._lock:
            self._jpeg = jpeg.tobytes()
            self._info = info

    def start(self):
        server = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                parsed = urlparse(self.path)
                path = parsed.path

                if path in ("/", "/index.html"):
                    data = _PAGE.encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return

                if path == "/health":
                    with server._lock:
                        has_frame = server._jpeg is not None
                        info = server._info
                    data = f"ok={has_frame}\ninfo={info}\n".encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return

                if path != "/stream":
                    self.send_response(404)
                    self.end_headers()
                    return

                self.send_response(200)
                self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
                self.end_headers()

                while True:
                    with server._lock:
                        jpeg = server._jpeg

                    if jpeg is not None:
                        try:
                            self.wfile.write(
                                b"--frame\r\n"
                                b"Content-Type: image/jpeg\r\n"
                                b"Cache-Control: no-cache\r\n\r\n"
                                + jpeg
                                + b"\r\n"
                            )
                            self.wfile.flush()
                        except (BrokenPipeError, ConnectionResetError):
                            break

                    time.sleep(0.04)

        self._httpd = ThreadingHTTPServer(("0.0.0.0", self.port), Handler)
        threading.Thread(target=self._httpd.serve_forever, daemon=True).start()

    def stop(self):
        if self._httpd is not None:
            self._httpd.shutdown()
            self._httpd.server_close()
            self._httpd = None


class Ros2ImageStreamer(Node):
    def __init__(self, topic, port, jpeg_quality):
        super().__init__("ros2_image_streamer")

        self.topic = topic
        self.server = MjpegHttpServer(port=port, jpeg_quality=jpeg_quality)
        self.server.start()

        self.frame_count = 0
        self.last_fps_time = time.time()
        self.fps = 0.0
        self.last_log_time = 0.0

        self.sub = self.create_subscription(Image, self.topic, self.image_callback, 10)

        self.get_logger().info(f"구독 시작: {self.topic}")
        self.get_logger().info(f"웹 스트리밍 시작: http://<host>:{port}/")
        self.get_logger().info(f"상태 확인: http://<host>:{port}/health")

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

        info = (
            f"{self.topic} | {msg.width}x{msg.height} | "
            f"{msg.encoding} | fps={self.fps:.1f}"
        )
        self.server.update(frame, info=info)

        if now - self.last_log_time >= 5.0:
            self.get_logger().info(info)
            self.last_log_time = now

    def ros_image_to_cv2(self, msg):
        encoding = (msg.encoding or "").lower()

        if encoding in ("bgr8", "rgb8"):
            channels = 3
            data = np.frombuffer(msg.data, dtype=np.uint8)
            image = data.reshape((msg.height, msg.step // channels, channels))
            image = image[:, :msg.width, :]
            if encoding == "rgb8":
                image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            return image.copy()

        if encoding in ("bgra8", "rgba8"):
            channels = 4
            data = np.frombuffer(msg.data, dtype=np.uint8)
            image = data.reshape((msg.height, msg.step // channels, channels))
            image = image[:, :msg.width, :]
            if encoding == "rgba8":
                image = cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)
            else:
                image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
            return image.copy()

        if encoding in ("mono8", "8uc1"):
            data = np.frombuffer(msg.data, dtype=np.uint8)
            image = data.reshape((msg.height, msg.step))
            image = image[:, :msg.width]
            return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

        if encoding in ("mono16", "16uc1"):
            data16 = np.frombuffer(msg.data, dtype=np.uint16)
            image16 = data16.reshape((msg.height, msg.step // 2))
            image16 = image16[:, :msg.width]
            return self.depth_to_bgr(image16)

        if encoding == "32fc1":
            data32 = np.frombuffer(msg.data, dtype=np.float32)
            image32 = data32.reshape((msg.height, msg.step // 4))
            image32 = image32[:, :msg.width]
            return self.float_depth_to_bgr(image32)

        raise ValueError(
            f"지원하지 않는 encoding: {msg.encoding}. "
            "지원: bgr8/rgb8/bgra8/rgba8/mono8/mono16/16UC1/32FC1"
        )

    @staticmethod
    def depth_to_bgr(image16):
        valid = image16[image16 > 0]
        if valid.size == 0:
            image8 = np.zeros_like(image16, dtype=np.uint8)
        else:
            lo = float(np.percentile(valid, 2))
            hi = float(np.percentile(valid, 98))
            denom = max(1.0, hi - lo)
            image8 = np.clip((image16.astype(np.float32) - lo) * 255.0 / denom, 0, 255).astype(np.uint8)
        colored = cv2.applyColorMap(image8, cv2.COLORMAP_JET)
        return colored

    @staticmethod
    def float_depth_to_bgr(image32):
        finite = np.isfinite(image32)
        if not np.any(finite):
            image8 = np.zeros(image32.shape, dtype=np.uint8)
        else:
            valid = image32[finite]
            lo = float(np.percentile(valid, 2))
            hi = float(np.percentile(valid, 98))
            denom = max(1e-6, hi - lo)
            image8 = np.zeros(image32.shape, dtype=np.uint8)
            image8[finite] = np.clip((image32[finite] - lo) * 255.0 / denom, 0, 255).astype(np.uint8)
        colored = cv2.applyColorMap(image8, cv2.COLORMAP_JET)
        return colored

    def destroy_node(self):
        try:
            self.server.stop()
        except Exception:
            pass
        super().destroy_node()


def parse_args():
    parser = argparse.ArgumentParser(description="ROS2 Image MJPEG 스트리밍 뷰어")
    parser.add_argument("--topic", default="/emai/cam_high/color", help="구독할 sensor_msgs/Image 토픽")
    parser.add_argument("--port", type=int, default=8090, help="HTTP 스트리밍 포트")
    parser.add_argument("--jpeg-quality", type=int, default=80, help="JPEG 품질 1~100")
    return parser.parse_args()


def main():
    args = parse_args()

    rclpy.init()
    node = Ros2ImageStreamer(
        topic=args.topic,
        port=args.port,
        jpeg_quality=args.jpeg_quality,
    )

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            node.destroy_node()
        except Exception:
            pass
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
