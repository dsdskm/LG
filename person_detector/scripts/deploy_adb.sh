#!/usr/bin/env bash
# person_detector 타겟 배포 전용
#
# 사용:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh gpu
#   ./scripts/deploy.sh gpu distance_threshold:=1.5 process_fps:=10
#   ./scripts/deploy.sh cpu enable_display:=false
#
# 로컬 원본:
#   ~/workspace/PersonDetector/person_detector
#
# 원격 대상:
#   ~/workspace/person_detector
#
# 특징:
#   - sshpass 사용 안 함
#   - ssh 접속 시 비밀번호 직접 입력
#   - 배포만 수행
#   - 원격 docker compose 빌드/실행은 하지 않음

set -e

MODE="cpu"

case "$1" in
  cpu|gpu)
    MODE="$1"
    shift
    ;;
esac

LAUNCH_ARGS_STR="$*"

TARGET="${TARGET:-mantis@192.168.225.30}"
REMOTE_DIR="${REMOTE_DIR:-~/workspace}"
TGZ="/tmp/pd.tgz"
PUSH_PATH="/data/local/tmp/pd.tgz"

WS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT="$(dirname "$WS_DIR")"
PKG="$(basename "$WS_DIR")"

LOCAL_NODE_PATH="$WS_DIR/src/person_detector/person_detector/detector_node.py"
REMOTE_PROJECT_DIR="$REMOTE_DIR/$PKG"
REMOTE_NODE_PATH="$REMOTE_PROJECT_DIR/src/person_detector/person_detector/detector_node.py"

echo "[0/5] 로컬/ADB 환경 확인"

if ! command -v adb >/dev/null 2>&1; then
  echo "ERROR: 로컬 PC에 adb가 없습니다."
  exit 1
fi

adb get-state >/dev/null

if [ ! -f "$LOCAL_NODE_PATH" ]; then
  echo "ERROR: 로컬 detector_node.py 없음:"
  echo "  $LOCAL_NODE_PATH"
  exit 1
fi

echo ""
echo "[로컬 프로젝트]"
echo "  WS_DIR=$WS_DIR"
echo "  PARENT=$PARENT"
echo "  PKG=$PKG"
echo "  LOCAL_NODE_PATH=$LOCAL_NODE_PATH"

echo ""
echo "[로컬 소스 확인]"
grep -n "return False, False, False" "$LOCAL_NODE_PATH" || true
grep -n "hand_shape_min_extended_fingers" "$LOCAL_NODE_PATH" || true
grep -n "block_handshake_when_arms_down" "$LOCAL_NODE_PATH" || true

echo ""
echo "[1/5] 압축: $PKG -> $TGZ"

cd "$PARENT"

tar czf "$TGZ" \
  --exclude="$PKG/venv" \
  --exclude="$PKG/build" \
  --exclude="$PKG/install" \
  --exclude="$PKG/log" \
  --exclude="$PKG/.git" \
  --exclude='*.pt' \
  --exclude='__pycache__' \
  "$PKG"

echo "[2/5] adb push -> $PUSH_PATH"

adb push "$TGZ" "$PUSH_PATH"

echo ""
echo "[3/5] adb shell에서 타겟($TARGET)으로 전송 + 해제"
echo "비밀번호를 물어보면 입력하세요."

UNPACK_CMD="rm -rf $REMOTE_PROJECT_DIR && mkdir -p $REMOTE_DIR && tar xzf - -C $REMOTE_DIR"

adb shell -t "cat $PUSH_PATH | ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $TARGET '$UNPACK_CMD'"

echo ""
echo "[4/5] 타겟 소스 반영 확인"
echo "비밀번호를 물어보면 입력하세요."

VERIFY_CMD="
set -e
echo '[remote project]'
cd $REMOTE_PROJECT_DIR
pwd

echo ''
echo '[remote node path]'
ls -l $REMOTE_NODE_PATH

echo ''
echo '[remote source check: return]'
grep -n 'return False, False, False' $REMOTE_NODE_PATH || true

echo ''
echo '[remote source check: hand_shape_min_extended_fingers]'
grep -n 'hand_shape_min_extended_fingers' $REMOTE_NODE_PATH || true

echo ''
echo '[remote source check: block_handshake_when_arms_down]'
grep -n 'block_handshake_when_arms_down' $REMOTE_NODE_PATH || true

echo ''
echo '[remote source check: html escape]'
grep -n '&gt;\\|&lt;\\|&amp;' $REMOTE_NODE_PATH || true
"

adb shell -t "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $TARGET \"$VERIFY_CMD\""

echo ""
echo "[5/5] 배포 완료"
echo ""
echo "완료: 배포만 완료됨"
echo ""
echo "원격에서 직접 빌드/실행하려면:"
echo "  ssh $TARGET"
echo "  cd $REMOTE_PROJECT_DIR"
echo ""

if [ "$MODE" = "gpu" ]; then
  if [ -n "$LAUNCH_ARGS_STR" ]; then
    echo "  docker compose -f docker-compose.jetson.yaml down"
    echo "  LAUNCH_ARGS=\"$LAUNCH_ARGS_STR\" docker compose -f docker-compose.jetson.yaml up --build -d"
  else
    echo "  docker compose -f docker-compose.jetson.yaml down"
    echo "  docker compose -f docker-compose.jetson.yaml up --build -d"
  fi
else
  if [ -n "$LAUNCH_ARGS_STR" ]; then
    echo "  CAMERA_TYPE=ros docker compose --profile realsense down"
    echo "  LAUNCH_ARGS=\"$LAUNCH_ARGS_STR\" CAMERA_TYPE=ros docker compose --profile realsense up --build -d"
  else
    echo " 