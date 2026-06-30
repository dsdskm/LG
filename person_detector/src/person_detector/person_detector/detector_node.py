
"""
person_detector 노드.

최종 기준:
  - 화면 가운데 고정 HANDSHAKE ZONE 1개만 사용
  - MediaPipe Hands로 손 검출
  - ZONE = 고정 존 전체 면적 중 손 convex hull이 차지하는 비율
  - ZONE 값은 EMA smoothing으로 흔들림 완화
  - CTR = 손 중심이 고정 존 중심에서 떨어진 정도
  - HANDSHAKE True = FACING True + 손 검출 + ZONE_SMOOTH >= 0.150 + CTR dx/dy <= 0.70
  - HOLD/dwell 없음. 손이 빠지면 즉시 False.

발행 토픽:
  /person_detector/event    (std_msgs/String, JSON)
  /person_detector/detected (std_msgs/Bool)
"""
2
import copy
import json
import math
import time

import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from std_msgs.msg import Bool, String

from person_detector.realsense_camera import RealSenseCamera, WebcamCamera
from person_detector.stream_server import MjpegServer

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False


WINDOW_NAME = "person_detector"


class PersonDetectorNode(Node):
    def __init__(self):
        super().__init__("person_detector")

        # ------------------------------------------------------------------
        # Basic parameters
        # ------------------------------------------------------------------
        self.declare_parameter("distance_threshold", 3.0)
        self.declare_parameter("ignore_distance", False)
        self.declare_parameter("min_confidence", 0.35)
        self.declare_parameter("yolo_model", "yolov8s.pt")
        self.declare_parameter("imgsz", 640)
        self.declare_parameter("frame_timeout_sec", 0.0)

        # Camera
        self.declare_parameter("camera_type", "ros")
        self.declare_parameter("webcam_index", 0)
        self.declare_parameter("color_topic", "/camera/camera/color/image_raw")
        self.declare_parameter("depth_topic", "/camera/camera/aligned_depth_to_color/image_raw")
        self.declare_parameter("person_height_m", 1.7)
        self.declare_parameter("focal_px", 600.0)
        self.declare_parameter("width", 640)
        self.declare_parameter("height", 480)
        self.declare_parameter("fps", 30)

        # FACING gate
        self.declare_parameter("require_facing_for_handshake", True)
        self.declare_parameter("facing_area_ratio", 0.20)
        self.declare_parameter("front_height_ratio", 0.45)
        self.declare_parameter("front_center_x_margin_ratio", 0.35)
        self.declare_parameter("facing_dwell_sec", 1.0)

        # Fixed center handshake zone
        self.declare_parameter("show_center_handshake_zone", True)
        self.declare_parameter("center_handshake_zone_width_ratio", 0.65)
        self.declare_parameter("center_handshake_zone_height_ratio", 0.35)
        self.declare_parameter("center_handshake_zone_center_y_ratio", 0.50)
        self.declare_parameter("center_handshake_zone_hit_margin_px", 80)
        # 하단은 유지하고 상단만 위로 확장하고 싶을 때 사용. 0.0이면 확장 없음.
        self.declare_parameter("center_handshake_zone_top_expand_ratio", 0.25)

        # Final hand criteria
        # ZONE = hand_area_in_zone / zone_area
        self.declare_parameter("center_hand_min_zone_fill_ratio", 0.04)
        self.declare_parameter("center_hand_min_area_in_zone_px", 180.0)
        self.declare_parameter("center_hand_min_hull_area_px", 250.0)
        self.declare_parameter("center_hand_center_tolerance_x_ratio", 0.70)
        self.declare_parameter("center_hand_center_tolerance_y_ratio", 0.70)
        self.declare_parameter("center_hand_require_shape_ok", False)

        # ZONE smoothing
        self.declare_parameter("center_hand_zone_smoothing_alpha", 0.35)
        self.declare_parameter("center_hand_zone_smoothing_reset_when_no_hand", True)

        # MediaPipe Hands
        self.declare_parameter("enable_hand_shape_check", True)
        self.declare_parameter("hand_shape_min_detection_confidence", 0.20)
        self.declare_parameter("hand_shape_min_tracking_confidence", 0.20)
        self.declare_parameter("hand_shape_min_extended_fingers", 2)
        self.declare_parameter("hand_shape_open_ratio", 0.82)

        # Hold/publish/display
        self.declare_parameter("person_hold_sec", 0.40)
        self.declare_parameter("hand_detect_hold_sec", 0.20)
        self.declare_parameter("process_fps", 10.0)
        self.declare_parameter("publish_interval_sec", 1.0)
        self.declare_parameter("event_topic", "/person_detector/event")
        self.declare_parameter("detected_topic", "/person_detector/detected")
        self.declare_parameter("enable_display", False)
        self.declare_parameter("enable_stream", True)
        self.declare_parameter("stream_port", 8081)
        self.declare_parameter("camera_ok_sec", 2.0)

        # Overlay
        self.declare_parameter("show_debug_overlay", True)
        self.declare_parameter("overlay_font_scale", 0.5)
        self.declare_parameter("overlay_line_height", 20)
        self.declare_parameter("overlay_thickness", 1)
        self.declare_parameter("overlay_font_path", "")
        self.declare_parameter("overlay_korean_enable", True)

        # 기존 launch/yaml 호환용. 최종 판단에는 사용하지 않음.
        self._declare_compat_params()

        # ------------------------------------------------------------------
        # Load parameters
        # ------------------------------------------------------------------
        gp = lambda name: self.get_parameter(name).value

        self.distance_threshold = gp("distance_threshold")
        self.ignore_distance = gp("ignore_distance")
        self.min_confidence = gp("min_confidence")
        self.yolo_model_name = gp("yolo_model")
        self.imgsz = gp("imgsz")
        self.frame_timeout_sec = gp("frame_timeout_sec")

        self.camera_type = gp("camera_type")
        self.ignore_distance = self.ignore_distance or self.camera_type == "webcam"
        self.webcam_index = gp("webcam_index")
        self.color_topic = gp("color_topic")
        self.depth_topic = gp("depth_topic")
        self.person_height_m = gp("person_height_m")
        self.focal_px = gp("focal_px")
        self.width = gp("width")
        self.height = gp("height")
        self.fps = gp("fps")

        self.require_facing_for_handshake = gp("require_facing_for_handshake")
        self.facing_area_ratio = gp("facing_area_ratio")
        self.front_height_ratio = gp("front_height_ratio")
        self.front_center_x_margin_ratio = gp("front_center_x_margin_ratio")
        self.facing_dwell_sec = gp("facing_dwell_sec")

        self.show_center_handshake_zone = gp("show_center_handshake_zone")
        self.center_handshake_zone_width_ratio = gp("center_handshake_zone_width_ratio")
        self.center_handshake_zone_height_ratio = gp("center_handshake_zone_height_ratio")
        self.center_handshake_zone_center_y_ratio = gp("center_handshake_zone_center_y_ratio")
        self.center_handshake_zone_hit_margin_px = int(gp("center_handshake_zone_hit_margin_px"))
        self.center_handshake_zone_top_expand_ratio = gp("center_handshake_zone_top_expand_ratio")

        self.center_hand_min_zone_fill_ratio = gp("center_hand_min_zone_fill_ratio")
        self.center_hand_min_area_in_zone_px = float(gp("center_hand_min_area_in_zone_px"))
        self.center_hand_min_hull_area_px = float(gp("center_hand_min_hull_area_px"))
        self.center_hand_center_tolerance_x_ratio = gp("center_hand_center_tolerance_x_ratio")
        self.center_hand_center_tolerance_y_ratio = gp("center_hand_center_tolerance_y_ratio")
        self.center_hand_require_shape_ok = gp("center_hand_require_shape_ok")
        self.center_hand_zone_smoothing_alpha = float(gp("center_hand_zone_smoothing_alpha"))
        self.center_hand_zone_smoothing_reset_when_no_hand = gp("center_hand_zone_smoothing_reset_when_no_hand")

        self.enable_hand_shape_check = gp("enable_hand_shape_check")
        self.hand_shape_min_detection_confidence = gp("hand_shape_min_detection_confidence")
        self.hand_shape_min_tracking_confidence = gp("hand_shape_min_tracking_confidence")
        self.hand_shape_min_extended_fingers = int(gp("hand_shape_min_extended_fingers"))
        self.hand_shape_open_ratio = gp("hand_shape_open_ratio")

        self.person_hold_sec = gp("person_hold_sec")
        self.hand_detect_hold_sec = gp("hand_detect_hold_sec")
        self.process_fps = gp("process_fps")
        self._min_proc_interval = 1.0 / self.process_fps if self.process_fps > 0 else 0.0
        self._last_proc = 0.0

        self.publish_interval_sec = gp("publish_interval_sec")
        self.event_topic = gp("event_topic")
        self.detected_topic = gp("detected_topic")

        self.enable_display = gp("enable_display")
        self.enable_stream = gp("enable_stream")
        self.stream_port = gp("stream_port")
        self.camera_ok_sec = gp("camera_ok_sec")

        self.show_debug_overlay = gp("show_debug_overlay")
        self.overlay_font_scale = gp("overlay_font_scale")
        self.overlay_line_height = int(gp("overlay_line_height"))
        self.overlay_thickness = int(gp("overlay_thickness"))
        self.overlay_font_path = gp("overlay_font_path")
        self.overlay_korean_enable = gp("overlay_korean_enable")
        self._pil_font = self._load_korean_font()

        # ------------------------------------------------------------------
        # Publishers / state
        # ------------------------------------------------------------------
        self.event_pub = self.create_publisher(String, self.event_topic, 10)
        self.detected_pub = self.create_publisher(Bool, self.detected_topic, 10)

        self._front_since = None
        self._last_publish = 0.0
        self._last_frame_ts = time.time()
        self._last_proc = 0.0
        self._fps_t0 = time.time()
        self._fps_count = 0
        self._last_target_person = None
        self._last_target_person_ts = 0.0
        self._last_hand_detected_ts = 0.0
        self._last_debug = {}
        self._hs_dbg = ""
        self._status = self._empty_status()
        self._zone_fill_ema = 0.0
        self._zone_fill_ema_valid = False

        # ------------------------------------------------------------------
        # Model init
        # ------------------------------------------------------------------
        import torch
        from ultralytics import YOLO

        self.use_gpu = torch.cuda.is_available()
        self.device = 0 if self.use_gpu else "cpu"
        self._dev = "GPU" if self.use_gpu else "CPU"
        gpu_name = torch.cuda.get_device_name(0) if self.use_gpu else "CPU"

        self.mp_available = False
        self.mp_hands = None
        try:
            import mediapipe as mp
            self.mp_available = True
            self.mp_hands_module = mp.solutions.hands
            self.mp_hands = self.mp_hands_module.Hands(
                static_image_mode=False,
                max_num_hands=2,
                model_complexity=0,
                min_detection_confidence=self.hand_shape_min_detection_confidence,
                min_tracking_confidence=self.hand_shape_min_tracking_confidence,
            )
        except Exception as e:
            self.get_logger().error(f"MediaPipe Hands 초기화 실패: {e}")
            self.mp_available = False
            self.mp_hands = None

        self.get_logger().info(f"==== 추론 장치: {self._dev} ({gpu_name}) ====")
        self.yolo = YOLO(self.yolo_model_name)
        self.yolo.to("cuda" if self.use_gpu else "cpu")

        # ------------------------------------------------------------------
        # Camera init
        # ------------------------------------------------------------------
        if self.camera_type == "webcam":
            self.camera = WebcamCamera(self.webcam_index, self.width, self.height)
            self.depth_scale = self.camera.start()
            self.get_logger().info(f"웹캠 시작 완료(index={self.webcam_index})")
        elif self.camera_type == "ros":
            from person_detector.ros_camera import RosTopicCamera
            self.camera = RosTopicCamera(self, self.color_topic, self.depth_topic)
            self.depth_scale = 0.001
            self.camera.start()
            self.get_logger().info("ROS 토픽 구독 모드 시작")
        else:
            self.camera = RealSenseCamera(self.width, self.height, self.fps)
            self.depth_scale = self.camera.start()
            self.get_logger().info(f"RealSense 시작 완료. depth_scale={self.depth_scale}")

        # ------------------------------------------------------------------
        # Stream
        # ------------------------------------------------------------------
        self.stream = None
        if self.enable_stream:
            try:
                self.stream = MjpegServer(self.stream_port)
                self.stream.start()
                self.get_logger().info(f"웹 스트리밍 시작: http://<host>:{self.stream_port}/")
            except OSError as e:
                self.stream = None
                self.get_logger().warn(f"웹 스트리밍 비활성: {e}")

        self.get_logger().info(f"토픽 발행 시작: {self.event_topic}, {self.detected_topic}")

    def _declare_compat_params(self):
        compat = {
            "handshake_dwell_sec": 0.0,
            "center_handshake_dwell_sec": 0.0,
            "hand_ready_hold_sec": 0.0,
            "require_person_overlap_handshake_zone": False,
            "person_zone_min_overlap_ratio": 0.03,
            "show_person_mid_handshake_zone": False,
            "person_mid_zone_x_margin_ratio": 0.42,
            "person_mid_zone_y1_ratio": 0.30,
            "person_mid_zone_y2_ratio": 0.56,
            "person_mid_zone_extra_margin_px": 8,
            "person_mid_min_landmarks": 3,
            "person_mid_min_fingertips": 1,
            "person_mid_use_hand_area_ratio": True,
            "person_mid_min_hand_area_in_zone_ratio": 0.018,
            "person_mid_min_hand_overlap_ratio": 0.30,
            "person_mid_min_hand_hull_area_px": 250.0,
            "require_hand_lift_for_intent": False,
            "person_hand_lift_y_ratio": 0.55,
            "person_hand_lift_min_landmarks": 2,
            "person_hand_lift_min_fingertips": 1,
            "block_handshake_when_hand_low": False,
            "hand_low_center_y_ratio": 0.62,
            "hand_low_min_y_ratio": 0.56,
            "enable_pose_attention_check": False,
            "pose_min_detection_confidence": 0.35,
            "pose_min_tracking_confidence": 0.35,
            "pose_visibility_th": 0.25,
            "attention_min_arms_down": 2,
            "attention_wrist_body_x_ratio": 1.45,
            "attention_wrist_hip_y_margin_ratio": 0.35,
            "block_handshake_when_arms_down": False,
            "block_handshake_arms_down_count": 1,
            "block_handshake_when_arm_raised": False,
            "arm_raise_min_count": 1,
            "arm_raise_wrist_above_shoulder_margin": 0.03,
            "arm_raise_elbow_above_shoulder_margin": 0.01,
            "block_handshake_when_hand_too_high": False,
            "hand_too_high_y_ratio": 0.18,
            "enable_handshake_pose_check": False,
            "require_handshake_pose_for_ready": False,
            "handshake_pose_min_arms": 1,
            "handshake_pose_block_arms_down": False,
            "handshake_wrist_zone_margin_px": 35,
            "handshake_wrist_hip_y_margin_ratio": 0.25,
            "require_hand_forward_for_ready": False,
            "hand_forward_depth_delta_m": 0.015,
            "hand_forward_pose_z_delta": 0.025,
            "hand_depth_patch_px": 10,
            "require_standing_for_handshake": False,
            "standing_min_legs": 1,
            "standing_hip_knee_min_delta_y": 0.04,
            "standing_knee_ankle_min_delta_y": 0.03,
            "standing_allow_partial_body": True,
            "standing_partial_min_upper_points": 1,
            "standing_partial_allow_when_no_legs": True,
            "standing_bbox_fallback_enable": True,
            "standing_bbox_min_height_ratio": 0.30,
            "standing_bbox_min_aspect": 0.45,
            "standing_bbox_min_bottom_y_ratio": 0.50,
        }
        for key, value in compat.items():
            try:
                self.declare_parameter(key, value)
            except Exception:
                pass

    # ----------------------------------------------------------------------
    # Helpers
    # ----------------------------------------------------------------------
    def _empty_status(self):
        return {
            "camera_ok": False,
            "distance": None,
            "pose": None,
            "state": "NO_PERSON",
            "facing": False,
            "person_hold_active": False,
            "front_area_ok": False,
            "front_height_ok": False,
            "front_center_ok": False,
            "front_height_ratio_value": 0.0,
            "front_center_offset_ratio": 0.0,
            "hand_detected": False,
            "hand_detect_hold_active": False,
            "hand_shape_ok": False,
            "extended_fingers": 0,
            "hands_count": 0,
            "center_hand_zone_ok": False,
            "center_hand_center_ok": False,
            "center_hand_center_dx_ratio": 999.0,
            "center_hand_center_dy_ratio": 999.0,
            "center_hand_area_in_zone": 0.0,
            "center_hand_area_total": 0.0,
            "center_hand_zone_fill_ratio": 0.0,
            "center_hand_zone_fill_ratio_raw": 0.0,
            "center_hand_inside_ratio": 0.0,
            "center_hand_raw_ok": False,
            "handshake_ready": False,
            "raw_handshake_ready": False,
            "hand_ready_hold_active": False,
            "handshaking": False,
            "hand": None,
            "in_range": False,
        }

    @staticmethod
    def _bbox_area(person):
        if person is None:
            return 0.0
        bx = person["bbox"]
        return max(0.0, bx[2] - bx[0]) * max(0.0, bx[3] - bx[1])

    @staticmethod
    def _lm_dist(a, b):
        return math.hypot(a.x - b.x, a.y - b.y)

    @staticmethod
    def _bool_kr(value):
        return "예" if bool(value) else "아니오"

    @staticmethod
    def _has_korean(text):
        return any("\uac00" <= ch <= "\ud7a3" for ch in str(text))

    def _load_korean_font(self):
        if not PIL_AVAILABLE:
            return None
        candidates = []
        if self.overlay_font_path:
            candidates.append(self.overlay_font_path)
        candidates.extend([
            "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
            "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJKkr-Regular.otf",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ])
        font_size = max(12, int(float(self.overlay_font_scale) * 32))
        for path in candidates:
            try:
                return ImageFont.truetype(path, font_size)
            except Exception:
                continue
        try:
            return ImageFont.load_default()
        except Exception:
            return None

    # ----------------------------------------------------------------------
    # Zone
    # ----------------------------------------------------------------------
    def get_center_handshake_zone(self, frame_shape):
        h, w = frame_shape[:2]
        zw = int(w * self.center_handshake_zone_width_ratio)
        zh = int(h * self.center_handshake_zone_height_ratio)
        cx = w // 2
        cy = int(h * self.center_handshake_zone_center_y_ratio)

        x1 = max(0, cx - zw // 2)
        x2 = min(w - 1, cx + zw // 2)
        y1 = max(0, cy - zh // 2)
        y2 = min(h - 1, cy + zh // 2)

        # 하단 y2는 유지하고 상단 y1만 위로 확장
        top_expand_px = int(h * self.center_handshake_zone_top_expand_ratio)
        y1 = max(0, y1 - top_expand_px)

        return (x1, y1, x2, y2)

    def get_center_handshake_hit_zone(self, frame_shape):
        h, w = frame_shape[:2]
        x1, y1, x2, y2 = self.get_center_handshake_zone(frame_shape)
        m = self.center_handshake_zone_hit_margin_px
        return (
            max(0, x1 - m),
            max(0, y1 - m),
            min(w - 1, x2 + m),
            min(h - 1, y2 + m),
        )

    # ----------------------------------------------------------------------
    # Person detection
    # ----------------------------------------------------------------------
    def estimate_distance_depth(self, depth_image, x1, y1, x2, y2):
        if depth_image is None:
            return None
        h, w = depth_image.shape[:2]
        cx = int((x1 + x2) / 2)
        cy = int((y1 + y2) / 2)
        if not (0 <= cx < w and 0 <= cy < h):
            return None
        p = 5
        patch = depth_image[max(0, cy - p):min(h, cy + p + 1), max(0, cx - p):min(w, cx + p + 1)].astype(np.float32)
        valid = patch[patch > 0]
        if valid.size == 0:
            return None
        return float(np.median(valid)) * self.depth_scale

    def estimate_distance_bbox(self, y1, y2):
        bbox_h = max(1.0, y2 - y1)
        return self.person_height_m * self.focal_px / bbox_h

    def detect_persons(self, color_image, depth_image):
        results = self.yolo(color_image, classes=[0], device=self.device, imgsz=self.imgsz, verbose=False)
        if isinstance(results, list):
            results = results[0]

        persons = []
        for box in results.boxes:
            if int(box.cls[0]) != 0:
                continue
            conf = float(box.conf[0])
            if conf < self.min_confidence:
                continue
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            if depth_image is not None:
                distance = self.estimate_distance_depth(depth_image, x1, y1, x2, y2)
            else:
                distance = self.estimate_distance_bbox(y1, y2)
            persons.append({
                "distance": round(distance, 3) if distance is not None else None,
                "conf": round(conf, 3),
                "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                "near": distance is not None and distance <= self.distance_threshold,
                "facing": "unknown",
            })
        return persons

    def _select_target_with_hold(self, persons, now):
        nearest = None
        if persons:
            with_dist = [p for p in persons if p["distance"] is not None]
            if with_dist:
                nearest = min(with_dist, key=lambda p: p["distance"])
            else:
                nearest = max(persons, key=self._bbox_area)
        if nearest is not None:
            self._last_target_person = copy.deepcopy(nearest)
            self._last_target_person_ts = now
            return nearest, False
        if (
            self._last_target_person is not None
            and self.person_hold_sec > 0
            and (now - self._last_target_person_ts) <= self.person_hold_sec
        ):
            nearest = copy.deepcopy(self._last_target_person)
            nearest["held_person"] = True
            persons.append(nearest)
            return nearest, True
        return None, False

    def _evaluate_front_candidate(self, nearest, frame_shape, area_ratio):
        if nearest is None:
            return False, False, False, False, 0.0, 0.0
        h, w = frame_shape[:2]
        bx = nearest["bbox"]
        bh = max(1.0, bx[3] - bx[1])
        person_cx = (bx[0] + bx[2]) * 0.5
        frame_cx = w * 0.5
        height_ratio = bh / max(1.0, float(h))
        center_offset_ratio = abs(person_cx - frame_cx) / max(1.0, float(w))
        area_ok = area_ratio >= self.facing_area_ratio
        height_ok = height_ratio >= self.front_height_ratio
        center_ok = center_offset_ratio <= self.front_center_x_margin_ratio
        front_candidate = center_ok and (area_ok or height_ok)
        return front_candidate, area_ok, height_ok, center_ok, height_ratio, center_offset_ratio

    # ----------------------------------------------------------------------
    # Hand detection in fixed center zone
    # ----------------------------------------------------------------------
    def _count_extended_fingers(self, hand_landmarks):
        lm = hand_landmarks.landmark
        wrist = lm[0]
        checks = [(4, 3), (8, 6), (12, 10), (16, 14), (20, 18)]
        extended = 0
        for tip_i, joint_i in checks:
            tip_d = self._lm_dist(wrist, lm[tip_i])
            joint_d = self._lm_dist(wrist, lm[joint_i])
            if joint_d > 1e-6 and tip_d > joint_d * self.hand_shape_open_ratio:
                extended += 1
        return extended

    def _smooth_zone_ratio(self, raw_ratio, hand_detected):
        alpha = max(0.0, min(1.0, float(self.center_hand_zone_smoothing_alpha)))
        if not hand_detected and self.center_hand_zone_smoothing_reset_when_no_hand:
            self._zone_fill_ema = 0.0
            self._zone_fill_ema_valid = False
            return 0.0
        if not self._zone_fill_ema_valid:
            self._zone_fill_ema = float(raw_ratio)
            self._zone_fill_ema_valid = True
        else:
            self._zone_fill_ema = alpha * float(raw_ratio) + (1.0 - alpha) * self._zone_fill_ema
        return self._zone_fill_ema

    def detect_hand_in_center_zone(self, color_image):
        result = {
            "hand_detected": False,
            "hand_shape_ok": False,
            "extended_fingers": 0,
            "hands_count": 0,
            "hand_landmarks_abs": [],
            "finger_tips_abs": [],
            "center_hand_zone_ok": False,
            "center_hand_center_ok": False,
            "center_hand_center_dx_ratio": 999.0,
            "center_hand_center_dy_ratio": 999.0,
            "center_hand_area_in_zone": 0.0,
            "center_hand_area_total": 0.0,
            "center_hand_zone_fill_ratio": 0.0,
            "center_hand_zone_fill_ratio_raw": 0.0,
            "center_hand_inside_ratio": 0.0,
        }
        if not self.mp_available or self.mp_hands is None:
            self._smooth_zone_ratio(0.0, False)
            return result

        hx1, hy1, hx2, hy2 = self.get_center_handshake_hit_zone(color_image.shape)
        crop = color_image[hy1:hy2, hx1:hx2]
        if crop.size == 0:
            self._smooth_zone_ratio(0.0, False)
            return result

        crop_h, crop_w = crop.shape[:2]
        rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        mp_result = self.mp_hands.process(rgb)
        if not mp_result.multi_hand_landmarks:
            self._smooth_zone_ratio(0.0, False)
            return result

        frame_h, frame_w = color_image.shape[:2]
        zx1, zy1, zx2, zy2 = self.get_center_handshake_zone(color_image.shape)
        zone_w = max(1, zx2 - zx1)
        zone_h = max(1, zy2 - zy1)
        zone_area = float(zone_w * zone_h)
        zone_cx = (zx1 + zx2) * 0.5
        zone_cy = (zy1 + zy2) * 0.5
        zone_half_w = max(1.0, zone_w * 0.5)
        zone_half_h = max(1.0, zone_h * 0.5)
        tip_indices = {4, 8, 12, 16, 20}

        result["hand_detected"] = True
        result["hands_count"] = len(mp_result.multi_hand_landmarks)

        max_extended = 0
        max_area_total = 0.0
        max_area_in_zone = 0.0
        max_zone_fill_ratio_raw = 0.0
        max_inside_ratio = 0.0
        best_center_dx_ratio = 999.0
        best_center_dy_ratio = 999.0
        center_ok_any = False

        for hand_landmarks in mp_result.multi_hand_landmarks:
            extended = self._count_extended_fingers(hand_landmarks)
            max_extended = max(max_extended, extended)
            points_abs = []
            tips_abs = []
            for idx, lm in enumerate(hand_landmarks.landmark):
                px = int(hx1 + lm.x * crop_w)
                py = int(hy1 + lm.y * crop_h)
                points_abs.append((idx, px, py))
                if idx in tip_indices:
                    tips_abs.append((idx, px, py))
            result["hand_landmarks_abs"].append(points_abs)
            result["finger_tips_abs"].extend(tips_abs)

            if points_abs:
                hand_cx = sum(px for _, px, _ in points_abs) / float(len(points_abs))
                hand_cy = sum(py for _, _, py in points_abs) / float(len(points_abs))
                dx_ratio = abs(hand_cx - zone_cx) / zone_half_w
                dy_ratio = abs(hand_cy - zone_cy) / zone_half_h
                if dx_ratio + dy_ratio < best_center_dx_ratio + best_center_dy_ratio:
                    best_center_dx_ratio = dx_ratio
                    best_center_dy_ratio = dy_ratio
            else:
                dx_ratio = 999.0
                dy_ratio = 999.0

            try:
                pts = np.array([[int(px), int(py)] for _, px, py in points_abs], dtype=np.int32)
                if pts.shape[0] >= 3:
                    hull = cv2.convexHull(pts)
                    hand_mask = np.zeros((frame_h, frame_w), dtype=np.uint8)
                    zone_mask = np.zeros((frame_h, frame_w), dtype=np.uint8)
                    cv2.fillConvexPoly(hand_mask, hull, 255)
                    cv2.rectangle(zone_mask, (zx1, zy1), (zx2, zy2), 255, -1)
                    hand_area_total = float(cv2.countNonZero(hand_mask))
                    hand_area_in_zone = float(cv2.countNonZero(cv2.bitwise_and(hand_mask, zone_mask)))

                    if hand_area_total >= self.center_hand_min_hull_area_px:
                        zone_fill_ratio_raw = hand_area_in_zone / max(1.0, zone_area)
                        inside_ratio = hand_area_in_zone / max(1.0, hand_area_total)
                        center_ok = bool(
                            dx_ratio <= self.center_hand_center_tolerance_x_ratio
                            and dy_ratio <= self.center_hand_center_tolerance_y_ratio
                        )
                        if center_ok:
                            center_ok_any = True

                        max_area_total = max(max_area_total, hand_area_total)
                        max_area_in_zone = max(max_area_in_zone, hand_area_in_zone)
                        max_zone_fill_ratio_raw = max(max_zone_fill_ratio_raw, zone_fill_ratio_raw)
                        max_inside_ratio = max(max_inside_ratio, inside_ratio)
            except Exception:
                pass

        zone_fill_ratio_smooth = self._smooth_zone_ratio(max_zone_fill_ratio_raw, True)
        center_ok_final = bool(
            best_center_dx_ratio <= self.center_hand_center_tolerance_x_ratio
            and best_center_dy_ratio <= self.center_hand_center_tolerance_y_ratio
        )
        zone_ok = bool(
            zone_fill_ratio_smooth >= self.center_hand_min_zone_fill_ratio
            and max_area_in_zone >= self.center_hand_min_area_in_zone_px
            # and center_ok_final
        )

        result["extended_fingers"] = max_extended
        result["hand_shape_ok"] = max_extended >= self.hand_shape_min_extended_fingers
        result["center_hand_zone_ok"] = zone_ok
        result["center_hand_center_ok"] = center_ok_any or center_ok_final
        result["center_hand_center_dx_ratio"] = round(best_center_dx_ratio, 3)
        result["center_hand_center_dy_ratio"] = round(best_center_dy_ratio, 3)
        result["center_hand_area_in_zone"] = round(max_area_in_zone, 1)
        result["center_hand_area_total"] = round(max_area_total, 1)
        result["center_hand_zone_fill_ratio"] = round(zone_fill_ratio_smooth, 4)
        result["center_hand_zone_fill_ratio_raw"] = round(max_zone_fill_ratio_raw, 4)
        result["center_hand_inside_ratio"] = round(max_inside_ratio, 4)
        return result

    # ----------------------------------------------------------------------
    # Main loop
    # ----------------------------------------------------------------------
    def run(self):
        while rclpy.ok():
            if not self.process_once():
                break

    def process_once(self):
        now = time.time()
        if (now - self._last_publish) >= self.publish_interval_sec:
            self._status["camera_ok"] = (now - self._last_frame_ts) <= self.camera_ok_sec
            self.publish_status(self._status)
            self.detected_pub.publish(Bool(data=self._status.get("in_range", False)))
            self._last_publish = now
            s = self._status
            self.get_logger().info(
                f"[state] {s.get('state')} facing={s.get('facing')} "
                f"hand={s.get('hand_detected')} shape={s.get('hand_shape_ok')} "
                f"zone_ok={s.get('center_hand_zone_ok')} "
                f"zone={s.get('center_hand_zone_fill_ratio')} raw={s.get('center_hand_zone_fill_ratio_raw')} "
                f"ctr={s.get('center_hand_center_dx_ratio')},{s.get('center_hand_center_dy_ratio')} "
                f"handshaking={s.get('handshaking')} | {self._hs_dbg}"
            )

        try:
            color_image, depth_image = self.camera.read()
        except Exception as e:
            self.get_logger().warn(f"카메라 read 실패: {e}")
            return True

        if color_image is None:
            if self.frame_timeout_sec > 0 and (now - self._last_frame_ts) > self.frame_timeout_sec:
                self.get_logger().error(f"{self.frame_timeout_sec}s 동안 카메라 프레임 없음 -> 종료")
                return False
            return True

        self._last_frame_ts = now
        if self._min_proc_interval > 0 and (now - self._last_proc) < self._min_proc_interval:
            return True
        self._last_proc = now

        persons = self.detect_persons(color_image, depth_image)
        nearest, person_hold_active = self._select_target_with_hold(persons, now)
        distance = nearest["distance"] if nearest else None
        for p in persons:
            p["is_target"] = p is nearest

        frame_area = float(color_image.shape[0] * color_image.shape[1])
        area_ratio = self._bbox_area(nearest) / frame_area if nearest is not None else 0.0
        front_candidate, area_ok, height_ok, center_ok, height_ratio, center_offset_ratio = self._evaluate_front_candidate(
            nearest, color_image.shape, area_ratio
        )
        raw_front = front_candidate
        if raw_front:
            if self._front_since is None:
                self._front_since = now
        else:
            self._front_since = None
        facing_held_sec = now - self._front_since if raw_front and self._front_since is not None else 0.0
        facing = bool(raw_front and self._front_since is not None and facing_held_sec >= self.facing_dwell_sec)
        in_range = front_candidate

        hand = self.detect_hand_in_center_zone(color_image)
        raw_hand_detected = bool(hand.get("hand_detected", False))
        if raw_hand_detected:
            self._last_hand_detected_ts = now
            hand_detected = True
            hand_detect_hold_active = False
        else:
            hand_detect_hold_active = bool(
                self.hand_detect_hold_sec > 0
                and (now - self._last_hand_detected_ts) <= self.hand_detect_hold_sec
            )
            hand_detected = hand_detect_hold_active

        hand_shape_ok = bool(hand.get("hand_shape_ok", False))
        zone_ok = bool(hand.get("center_hand_zone_ok", False))
        shape_gate_ok = hand_shape_ok if self.center_hand_require_shape_ok else True
        facing_gate_ok = facing if self.require_facing_for_handshake else True
        center_hand_raw_ok = bool(raw_hand_detected and zone_ok and shape_gate_ok and facing_gate_ok)

        handshake_ready = center_hand_raw_ok
        handshaking = bool(center_hand_raw_ok)

        if not facing and self.require_facing_for_handshake:
            state = "NO_PERSON_OR_FAR"
        elif handshaking:
            state = "HANDSHAKING"
        elif center_hand_raw_ok:
            state = "HAND_READY"
        elif facing or not self.require_facing_for_handshake:
            state = "FACING"
        else:
            state = "NO_PERSON_OR_FAR"

        self._hs_dbg = (
            f"raw={center_hand_raw_ok} zone_ok={zone_ok} "
            f"zone={hand.get('center_hand_zone_fill_ratio', 0.0):.3f}/{self.center_hand_min_zone_fill_ratio:.3f} "
            f"raw_zone={hand.get('center_hand_zone_fill_ratio_raw', 0.0):.3f} "
            f"ctr=({hand.get('center_hand_center_dx_ratio', 999.0):.2f},{hand.get('center_hand_center_dy_ratio', 999.0):.2f})/({self.center_hand_center_tolerance_x_ratio:.2f},{self.center_hand_center_tolerance_y_ratio:.2f}) "
            f"in_px={hand.get('center_hand_area_in_zone', 0.0):.0f}/{self.center_hand_min_area_in_zone_px:.0f} "
            f"hull={hand.get('center_hand_area_total', 0.0):.0f}/{self.center_hand_min_hull_area_px:.0f} "
            f"shape_ok={hand_shape_ok} fingers={hand.get('extended_fingers', 0)}/{self.hand_shape_min_extended_fingers} "
            f"facing={facing}"
        )

        self._last_debug = {
            "state": state,
            "area_ratio": area_ratio,
            "front_area_ok": area_ok,
            "front_height_ok": height_ok,
            "front_center_ok": center_ok,
            "front_height_ratio_value": height_ratio,
            "front_center_offset_ratio": center_offset_ratio,
            "facing": facing,
            "facing_held_sec": facing_held_sec,
            "person_hold_active": person_hold_active,
            "in_range": in_range,
            "hand_detected": hand_detected,
            "hand_detect_hold_active": hand_detect_hold_active,
            "hand_shape_ok": hand_shape_ok,
            "extended_fingers": int(hand.get("extended_fingers", 0)),
            "hands_count": int(hand.get("hands_count", 0)),
            "center_hand_zone_ok": zone_ok,
            "center_hand_center_ok": bool(hand.get("center_hand_center_ok", False)),
            "center_hand_center_dx_ratio": float(hand.get("center_hand_center_dx_ratio", 999.0)),
            "center_hand_center_dy_ratio": float(hand.get("center_hand_center_dy_ratio", 999.0)),
            "center_hand_area_in_zone": float(hand.get("center_hand_area_in_zone", 0.0)),
            "center_hand_area_total": float(hand.get("center_hand_area_total", 0.0)),
            "center_hand_zone_fill_ratio": float(hand.get("center_hand_zone_fill_ratio", 0.0)),
            "center_hand_zone_fill_ratio_raw": float(hand.get("center_hand_zone_fill_ratio_raw", 0.0)),
            "center_hand_inside_ratio": float(hand.get("center_hand_inside_ratio", 0.0)),
            "center_hand_raw_ok": center_hand_raw_ok,
            "handshake_ready": handshake_ready,
            "raw_handshake_ready": center_hand_raw_ok,
            "hand_ready_hold_active": False,
            "handshaking": handshaking,
        }
        self._status = {
            "camera_ok": True,
            "distance": distance,
            "pose": "unknown" if nearest else None,
            **self._last_debug,
            "hand": "mp_hand" if handshaking else None,
        }

        self._fps_count += 1
        elapsed = now - self._fps_t0
        if elapsed >= 5.0:
            self.get_logger().info(f"처리 속도: {self._fps_count / elapsed:.1f} FPS ({self._dev})")
            self._fps_t0 = now
            self._fps_count = 0

        if self.enable_display or self.enable_stream:
            return self.render(color_image, persons, hand, distance, facing, handshaking, center_hand_raw_ok)
        return True

    # ----------------------------------------------------------------------
    # Publish
    # ----------------------------------------------------------------------
    def publish_status(self, status):
        payload = {
            "camera_ok": status.get("camera_ok", False),
            "distance": status.get("distance"),
            "pose": status.get("pose"),
            "state": status.get("state"),
            "facing": status.get("facing", False),
            "person_hold_active": status.get("person_hold_active", False),
            "front_area_ok": status.get("front_area_ok", False),
            "front_height_ok": status.get("front_height_ok", False),
            "front_center_ok": status.get("front_center_ok", False),
            "front_height_ratio_value": status.get("front_height_ratio_value", 0.0),
            "front_center_offset_ratio": status.get("front_center_offset_ratio", 0.0),
            "hand_detected": status.get("hand_detected", False),
            "hand_detect_hold_active": status.get("hand_detect_hold_active", False),
            "hand_shape_ok": status.get("hand_shape_ok", False),
            "extended_fingers": status.get("extended_fingers", 0),
            "hands_count": status.get("hands_count", 0),
            "center_hand_zone_ok": status.get("center_hand_zone_ok", False),
            "center_hand_center_ok": status.get("center_hand_center_ok", False),
            "center_hand_center_dx_ratio": status.get("center_hand_center_dx_ratio", 999.0),
            "center_hand_center_dy_ratio": status.get("center_hand_center_dy_ratio", 999.0),
            "center_hand_area_in_zone": status.get("center_hand_area_in_zone", 0.0),
            "center_hand_area_total": status.get("center_hand_area_total", 0.0),
            "center_hand_zone_fill_ratio": status.get("center_hand_zone_fill_ratio", 0.0),
            "center_hand_zone_fill_ratio_raw": status.get("center_hand_zone_fill_ratio_raw", 0.0),
            "center_hand_inside_ratio": status.get("center_hand_inside_ratio", 0.0),
            "center_hand_raw_ok": status.get("center_hand_raw_ok", False),
            "handshake_ready": status.get("handshake_ready", False),
            "raw_handshake_ready": status.get("raw_handshake_ready", False),
            "hand_ready_hold_active": status.get("hand_ready_hold_active", False),
            "handshaking": status.get("handshaking", False),
            "hand": status.get("hand"),
            "in_range": status.get("in_range", False),
        }
        msg = String()
        msg.data = json.dumps(payload, ensure_ascii=False)
        self.event_pub.publish(msg)
        if self.stream is not None and hasattr(self.stream, "append_log"):
            try:
                self.stream.append_log({"type": "status", "node": "person_detector", "payload": payload})
            except Exception:
                pass

    # ----------------------------------------------------------------------
    # Draw
    # ----------------------------------------------------------------------
    def _draw_text(self, img, text, x, y, color=(255, 255, 255)):
        text = str(text)
        if self.overlay_korean_enable and PIL_AVAILABLE and self._pil_font is not None and self._has_korean(text):
            try:
                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb)
                draw = ImageDraw.Draw(pil_img)
                rgb_color = (int(color[2]), int(color[1]), int(color[0]))
                draw.text((int(x), int(y - 16)), text, font=self._pil_font, fill=rgb_color)
                out = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                img[:, :, :] = out
                return
            except Exception:
                pass
        cv2.putText(img, text, (int(x), int(y)), cv2.FONT_HERSHEY_SIMPLEX, self.overlay_font_scale, color, self.overlay_thickness, cv2.LINE_AA)

    def _draw_status_badge(self, img, label, value, x, y, width=170, height=42):
        bg = (0, 150, 0) if value else (0, 0, 180)
        fg = (255, 255, 255)
        state = "ON" if value else "OFF"
        cv2.rectangle(img, (x, y), (x + width, y + height), bg, -1)
        cv2.rectangle(img, (x, y), (x + width, y + height), (220, 220, 220), 1)
        cv2.putText(img, f"{label}:{state}", (x + 9, y + 29), cv2.FONT_HERSHEY_SIMPLEX, 0.72, fg, 2, cv2.LINE_AA)

    def _draw_main_status_panel(self, img, facing, handshaking):
        badge_w = 170
        badge_h = 42
        gap = 12
        total_w = badge_w * 2 + gap
        h, w = img.shape[:2]
        x = max(8, (w - total_w) // 2)
        y = max(8, h - badge_h - 14)
        self._draw_status_badge(img, "FACING", facing, x, y, badge_w, badge_h)
        self._draw_status_badge(img, "HANDSHAKE", handshaking, x + badge_w + gap, y, badge_w, badge_h)

    def _draw_mediapipe_hand_landmarks(self, color_image, hand_result):
        if not hand_result:
            return
        hand_landmarks_abs = hand_result.get("hand_landmarks_abs", [])
        finger_tips_abs = hand_result.get("finger_tips_abs", [])
        connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),
            (0, 5), (5, 6), (6, 7), (7, 8),
            (0, 9), (9, 10), (10, 11), (11, 12),
            (0, 13), (13, 14), (14, 15), (15, 16),
            (0, 17), (17, 18), (18, 19), (19, 20),
            (5, 9), (9, 13), (13, 17),
        ]
        for hand_points in hand_landmarks_abs:
            point_map = {idx: (px, py) for idx, px, py in hand_points}
            for a, b in connections:
                if a in point_map and b in point_map:
                    cv2.line(color_image, point_map[a], point_map[b], (255, 180, 0), 1, cv2.LINE_AA)
            for _, px, py in hand_points:
                cv2.circle(color_image, (px, py), 2, (255, 255, 0), -1, cv2.LINE_AA)
        for _, px, py in finger_tips_abs:
            cv2.circle(color_image, (px, py), 7, (0, 0, 255), 2, cv2.LINE_AA)

    def _draw_debug_overlay(self, color_image, distance, facing, handshaking, center_hand_raw_ok):
        if not self.show_debug_overlay:
            return
        d = self._last_debug
        x = 8
        y = 28
        lh = self.overlay_line_height
        dist_str = f"{distance:.2f}m" if distance is not None else "none"
        lines = [
            (f"상태:{d.get('state', '-')}", (0, 255, 0) if d.get("state") in ("HAND_READY", "HANDSHAKING") else (220, 220, 220)),
            (
                f"정면 area:{self._bool_kr(d.get('front_area_ok'))} "
                f"{d.get('area_ratio', 0.0) * 100:.0f}/{self.facing_area_ratio * 100:.0f}% "
                f"height:{self._bool_kr(d.get('front_height_ok'))} "
                f"{d.get('front_height_ratio_value', 0.0) * 100:.0f}/{self.front_height_ratio * 100:.0f}% "
                f"center:{self._bool_kr(d.get('front_center_ok'))}",
                (0, 255, 0) if d.get("in_range") else (220, 220, 220),
            ),
            (
                f"FACING:{self._bool_kr(facing)} 유지 "
                f"{d.get('facing_held_sec', 0.0):.1f}/{self.facing_dwell_sec:.1f}s "
                f"거리:{dist_str}",
                (0, 255, 0) if facing else (220, 220, 220),
            ),
            (
                f"손검출:{self._bool_kr(d.get('hand_detected'))} "
                f"손모양:{self._bool_kr(d.get('hand_shape_ok'))} "
                f"손가락:{d.get('extended_fingers', 0)}/{self.hand_shape_min_extended_fingers} "
                f"hands:{d.get('hands_count', 0)}",
                (0, 255, 0) if d.get("hand_detected") else (80, 180, 255),
            ),
            (
                f"ZONE:{self._bool_kr(d.get('center_hand_zone_ok'))} "
                f"{d.get('center_hand_zone_fill_ratio', 0.0):.3f}/{self.center_hand_min_zone_fill_ratio:.3f} "
                f"raw:{d.get('center_hand_zone_fill_ratio_raw', 0.0):.3f} "
                f"CTR:{self._bool_kr(d.get('center_hand_center_ok'))} "
                f"{d.get('center_hand_center_dx_ratio', 999.0):.2f}/{self.center_hand_center_tolerance_x_ratio:.2f},"
                f"{d.get('center_hand_center_dy_ratio', 999.0):.2f}/{self.center_hand_center_tolerance_y_ratio:.2f}",
                (0, 255, 255) if d.get("center_hand_zone_ok") else (220, 220, 220),
            ),
            (
                f"판정:{self._bool_kr(center_hand_raw_ok)} HANDSHAKE:{self._bool_kr(handshaking)}",
                (0, 165, 255) if handshaking else (220, 220, 220),
            ),
        ]
        box_h = len(lines) * lh + 14
        box_w = min(color_image.shape[1] - 8, 1240)
        overlay = color_image.copy()
        cv2.rectangle(overlay, (4, 4), (box_w, box_h), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.45, color_image, 0.55, 0, color_image)
        for text, color in lines:
            self._draw_text(color_image, text, x, y, color)
            y += lh

    def render(self, color_image, persons, hand_result, distance, facing, handshaking, center_hand_raw_ok):
        self._draw_main_status_panel(color_image, facing, handshaking)

        if self.show_center_handshake_zone:
            gx1, gy1, gx2, gy2 = self.get_center_handshake_zone(color_image.shape)
            hx1, hy1, hx2, hy2 = self.get_center_handshake_hit_zone(color_image.shape)
            cv2.rectangle(color_image, (hx1, hy1), (hx2, hy2), (0, 220, 255), 1)
            zone_color = (0, 165, 255)
            if center_hand_raw_ok:
                zone_color = (0, 255, 255)
            if handshaking:
                zone_color = (0, 255, 0)
            cv2.rectangle(color_image, (gx1, gy1), (gx2, gy2), zone_color, 3)
            cv2.putText(
                color_image,
                "CENTER HANDSHAKE ZONE",
                (gx1, max(24, gy1 - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.60,
                zone_color,
                2,
                cv2.LINE_AA,
            )

            zone_ratio = self._last_debug.get("center_hand_zone_fill_ratio", 0.0)
            dxr = self._last_debug.get("center_hand_center_dx_ratio", 999.0)
            dyr = self._last_debug.get("center_hand_center_dy_ratio", 999.0)
            big1 = f"ZONE {zone_ratio:.3f}/{self.center_hand_min_zone_fill_ratio:.3f}"
            big2 = f"CTR {dxr:.2f},{dyr:.2f}"
            big_color = (0, 255, 0) if handshaking else ((0, 255, 255) if center_hand_raw_ok else (255, 255, 255))
            cv2.putText(color_image, big1, (gx1, min(color_image.shape[0] - 48, gy2 + 28)), cv2.FONT_HERSHEY_SIMPLEX, 0.62, big_color, 2, cv2.LINE_AA)
            cv2.putText(color_image, big2, (gx1, min(color_image.shape[0] - 22, gy2 + 52)), cv2.FONT_HERSHEY_SIMPLEX, 0.52, big_color, 1, cv2.LINE_AA)

        for p in persons:
            if not p.get("is_target"):
                continue
            x1, y1, x2, y2 = [int(v) for v in p["bbox"]]
            color = (0, 255, 0) if facing else (0, 0, 255)
            if p.get("held_person"):
                color = (0, 200, 255)
            cv2.rectangle(color_image, (x1, y1), (x2, y2), color, 2)
            dist_txt = f"{p['distance']:.2f}m" if p["distance"] is not None else "no depth"
            label = f"conf:{p['conf']:.2f} {dist_txt} facing:{facing}"
            if p.get("held_person"):
                label += " HELD"
            cv2.putText(color_image, label, (x1, max(18, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.50, color, 2, cv2.LINE_AA)

        self._draw_mediapipe_hand_landmarks(color_image, hand_result)
        self._draw_debug_overlay(color_image, distance, facing, handshaking, center_hand_raw_ok)

        if self.stream is not None:
            ok, jpeg = cv2.imencode(".jpg", color_image, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if ok:
                self.stream.update(jpeg.tobytes())
        if self.enable_display:
            cv2.imshow(WINDOW_NAME, color_image)
            if (cv2.waitKey(1) & 0xFF) == ord("q"):
                self.get_logger().info("'q' 입력 -> 종료")
                return False
        return True

    def destroy_node(self):
        try:
            if self.mp_hands is not None:
                self.mp_hands.close()
        except Exception:
            pass
        try:
            self.camera.stop()
        except Exception:
            pass
        if self.stream is not None:
            try:
                self.stream.stop()
            except Exception:
                pass
        if self.enable_display:
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = PersonDetectorNode()
    try:
        node.run()
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
