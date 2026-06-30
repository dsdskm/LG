"""pose 단독 점검 스크립트 (ROS/거리/dwell 전부 제외).

웹캠 프레임마다 YOLO-pose 를 돌려, 검출된 사람의 키포인트 신뢰도와
estimate_facing 결과(pose)를 터미널에 출력한다.

실행:
  cd person_detector
  source venv/bin/activate
  export PYTHONPATH="$PWD/venv/lib/python3.10/site-packages:$PYTHONPATH"
  source install/setup.bash
  python tools/pose_check.py
"""

import time

import cv2
import torch
from ultralytics import YOLO

from person_detector.pose_analysis import estimate_facing, NOSE, LEYE, REYE, LSH, RSH

CONF = 0.3   # estimate_facing 키포인트 임계값

dev = 0 if torch.cuda.is_available() else 'cpu'
print(f"device={dev} (cuda_avail={torch.cuda.is_available()})  half=False(FP32)")
model = YOLO('yolov8n-pose.pt')

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
if not cap.isOpened():
    raise SystemExit('웹캠을 열 수 없음 (/dev/video0)')

print("Ctrl+C 로 종료. 카메라 앞에 서보세요.\n")
try:
    while True:
        ok, frame = cap.read()
        if not ok:
            continue
        r = model(frame, classes=[0], device=dev, half=False, verbose=False)[0]
        n = len(r.boxes)
        if r.keypoints is None:
            print("keypoints 없음 — pose 모델이 아님")
            time.sleep(0.5)
            continue
        if n == 0:
            print("사람 미검출")
            time.sleep(0.4)
            continue
        kp = r.keypoints.data.cpu().numpy()
        for i in range(n):
            k = kp[i]
            box = r.boxes[i].xyxy[0].tolist()
            pose = estimate_facing(k, box, CONF)
            print(f"p{i}: pose={pose:8s} | nose={k[NOSE][2]:.2f} "
                  f"Leye={k[LEYE][2]:.2f} Reye={k[REYE][2]:.2f} "
                  f"Lsh={k[LSH][2]:.2f} Rsh={k[RSH][2]:.2f}")
        time.sleep(0.4)
except KeyboardInterrupt:
    pass
finally:
    cap.release()
