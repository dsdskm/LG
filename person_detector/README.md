# person_detector

RealSense + YOLO-pose 로 **가장 가까운 사람**을 보고, 정면 응시(대화 의도)와 손 든 자세(악수)를 판단해 ROS2 토픽으로 발행.

기본 동작: **ROS2 카메라 토픽 구독** + **웹 스트리밍(8081)** + **상호작용 거리 1m** + **1초 주기 발행**.

## ⭐ 로봇(Orin) 배포 — 이거 하나면 끝

컨테이너가 **카메라 노드까지 같이 띄우고**, ssh 빠져도/재부팅해도 자동 실행:

```bash
cd ~/workspace/person_detector
docker compose -f docker-compose.jetson.yaml up --build -d
```
- **`-d`(detached) 필수** → 빌드+시작 후 **명령 바로 리턴**(로그 attach 안 함). ssh 끊어도 컨테이너 계속 돎.
- 컨테이너 안에서 realsense2_camera + person_detector 다 실행 (`LAUNCH_CAMERA=true`)
- `restart: always` + `-d` → ssh 나가도, 재부팅해도 자동 (도커 데몬 부팅 자동이어야: `systemctl is-enabled docker`)
- 첫 빌드는 수~십수 분 (베이스 이미지 + realsense 설치)
- 빌드 전 체크: 디스크 여유(`df -h /`), 도커 DNS(`/etc/docker/daemon.json` 에 `"dns":["8.8.8.8"]`)

로그/상태/중지 (원할 때만 따로):
```bash
docker logs -f person-detector        # 실시간 로그
docker logs --tail=50 person-detector # 최근 50줄
docker ps                             # 동작 확인
docker compose -f docker-compose.jetson.yaml down   # 중지
```
- 영상 `http://localhost:8081/` / 토픽 `ros2 topic echo /person_detector/event`

조절:
```bash
# 카메라 해상도/fps
CAMERA_ARGS="rgb_camera.color_profile:=640x480x30 depth_module.depth_profile:=640x480x30" \
  docker compose -f docker-compose.jetson.yaml up --build -d
# 감지 파라미터
LAUNCH_ARGS="distance_threshold:=1.5 process_fps:=10" \
  docker compose -f docker-compose.jetson.yaml up --build -d
```

## 스크립트 (scripts/)

| 스크립트 | 용도 |
| --- | --- |
| `run_gpu.sh` | **GPU(Orin) 컨테이너** 빌드+실행 (`docker-compose.jetson.yaml`). `-d` 로 백그라운드 |
| `run_cpu.sh` | CPU(x86) 컨테이너 빌드+실행 (`docker-compose.yaml`) |
| `run.sh` | **컨테이너 없이** 직접 실행 (로컬 빌드+launch, ros 구독+스트림) |
| `camera.sh` | realsense2_camera 노드만 실행 (컨테이너 없이 테스트용) |
| `cam_test.sh` | 카메라 토픽 구독 → GUI 창 (수신 확인용) |
| `echo.sh` | `/person_detector/event` 토픽 구독 출력 |
| `deploy.sh [cpu\|gpu]` | PC→adb→ssh 로 src 전송 + 실행명령 안내 |

- 로봇 배포 = **위 `docker compose -f docker-compose.jetson.yaml up --build -d`** (또는 `./scripts/run_gpu.sh -d`)
- 컨테이너 없이 개발/테스트 = `./scripts/camera.sh` (별 터미널) + `./scripts/run.sh`
- `run.sh` 인자 예: `./scripts/run.sh distance_threshold:=1.5 process_fps:=10`

## 발행 토픽 `/person_detector/event`

`std_msgs/String` (JSON), **1초마다 발행 (카메라 프레임 없어도 발행)**:

```json
{ "distance": 1.8, "pose": "front", "facing": true, "handshaking": false, "hand": null }
```

| 필드 | 의미 |
| --- | --- |
| `distance` | 가장 가까운 사람까지 거리(m), 없으면 null |
| `pose` | 방향 front/back/left/right/unknown |
| `facing` | 임계거리 안 + 정면 + 유지 → 대화 의도(true) |
| `handshaking` | facing=true + 손 든 자세 유지 → true |
| `hand` | 뻗은 손(사람 본인 기준) right/left/all, 없으면 null |

앱은 보통 **`facing` / `handshaking`** 만 보면 됨.

구독:
```bash
export ROS_DOMAIN_ID=19
ros2 topic echo /person_detector/event
```

## 주요 파라미터

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `distance_threshold` | `1.0` | 상호작용 거리(m) |
| `facing_dwell_sec` | `1.0` | 정면 유지 시간(초) → facing:true |
| `handshake_dwell_sec` | `1.0` | 손 든 자세 유지 시간(초) → handshaking:true |
| `publish_interval_sec` | `1.0` | 토픽 발행 간격(초) |
| `camera_type` | `ros` | `ros`(토픽 구독) / `realsense` / `webcam` |
| `color_topic` / `depth_topic` | `/camera/camera/...` | ros 모드 토픽 |
| `enable_stream` | `true` | MJPEG 웹 스트리밍 |
| `enable_display` | `true` | OpenCV 로컬 창 |

화면: 가장 가까운 사람만 박스 — 평소 빨강, `facing=true` 면 초록.

## Docker (타겟)

```bash
# CPU (기본 ros 토픽 구독) — 코드 바뀌어도 매번 이것만 실행
docker compose --profile realsense up --build
```

- 기본 `camera_type=ros`. USB 직접 쓰려면 `CAMERA_TYPE=realsense docker compose ...`.
- `up --build` = 빌드(캐시) + 실행. 코드만 바뀌면 즉시 통과 후 컨테이너가 colcon build 로 반영.
- ros 모드는 카메라 노드(`./scripts/camera.sh` 또는 회사 스택)가 토픽을 쏘고 있어야 함.
- 로그에서 GPU 여부: 시작 로그 `==== 추론 장치: GPU/CPU ====`.

### Jetson Orin GPU (원본과 별개 파일)

x86/CPU 용은 `Dockerfile` / `docker-compose.yaml` 그대로 두고, Orin GPU 는 `*.jetson` 사용:

```bash
# 타겟 L4T 버전 확인 -> 베이스 태그 맞추기
cat /etc/nv_tegra_release            # 예: R36 REVISION 2.0 -> r36.2.0

# 빌드 + 실행 (기본 태그 r36.4.0 = JetPack 6, L4T R36.4.x)
docker compose -f docker-compose.jetson.yaml up --build

# 태그 다르면
BASE_IMAGE=dustynv/ros:humble-pytorch-l4t-r35.4.1 \
  docker compose -f docker-compose.jetson.yaml up --build
```

- 베이스(dusty-nv)에 ROS2 humble + CUDA PyTorch 포함 → GPU 사용. 시작 로그 `device=` 가 `Orin`/`cuda` 면 GPU.
- `runtime: nvidia` (JetPack 의 nvidia-container-runtime). 없으면 `sudo apt install nvidia-container` 후 docker 재시작.

## 타겟 접속 (adb)

타겟은 외부에서 직접 안 닿고 **adb 디바이스 안에서만 ssh** 가능.

### adb 무선 연결
```bash
# (USB 로 1회) 무선 모드 전환
adb tcpip 5555
# 이후 USB 빼고 무선 연결 (기기 IP)
adb connect <기기IP>:5555
adb devices                 # <기기IP>:5555  device 로 뜨면 OK

# 그 다음 쉘 / 타겟 접속
adb shell
ssh mantis@192.168.225.30   # adb 쉘 안에서
```

### 배포 (PC → adb → ssh)
```bash
./scripts/deploy.sh gpu          # src 압축 후 타겟(mantis@192.168.225.30)으로 전송
```

## 웹 화면 보기 (PC 브라우저, adb→ssh 2-홉 포워딩)

```bash
# 1) adb 쉘에서: 타겟:8080 -> adb디바이스:8080 (이 ssh 세션 열어둠)
ssh -L 8080:localhost:8080 mantis@192.168.225.30

# 2) PC에서: PC:8080 -> adb디바이스:8080
adb forward tcp:8080 tcp:8080

# 3) PC 브라우저: http://localhost:8080/
```

- 체인: `PC:8080 → adb디바이스:8080 → (ssh터널) → 타겟:8080`
- `adb forward --list` 로 포워딩 확인. ssh `-L` 터널 세션은 열어둬야 함.

