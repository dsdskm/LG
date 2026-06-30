#!/usr/bin/env bash
# person_detector 타겟 배포 전용
#
# 사용:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh gpu

set -euo pipefail

MODE="cpu"

case "${1:-}" in
  cpu|gpu)
    MODE="$1"
    shift
    ;;
esac

LAUNCH_ARGS_STR="$*"

# ==========================================
# 네트워크 / 계정 설정
# ==========================================
JUMP_HOST="root@192.168.0.35"
JUMP_PASS='mantis123$'

FINAL_TARGET="mantis@192.168.225.30"
FINAL_PASS='mantis123$'

REMOTE_TARGET_DIR="/home/mantis/workspace/person_detector"
REMOTE_PARENT_DIR="/home/mantis/workspace"
TGZ="/tmp/pd.tgz"

# ==========================================
# 로컬 경로 계산
# ==========================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PARENT="$(dirname "$WS_DIR")"
PKG="$(basename "$WS_DIR")"

LOCAL_NODE_PATH="$WS_DIR/src/person_detector/person_detector/detector_node.py"
REMOTE_NODE_PATH="$REMOTE_TARGET_DIR/src/person_detector/person_detector/detector_node.py"

SSH_COMMON_OPTS=(
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
  -o PreferredAuthentications=password
  -o PubkeyAuthentication=no
  -o LogLevel=ERROR
)

PROXY_CMD="sshpass -p '$JUMP_PASS' ssh -W %h:%p -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR $JUMP_HOST"

echo "[0/4] 로컬 환경 확인"

if ! command -v sshpass >/dev/null 2>&1; then
  echo "ERROR: 로컬 PC에 sshpass가 없습니다."
  echo "설치:"
  echo "  sudo apt-get update"
  echo "  sudo apt-get install -y sshpass"
  exit 1
fi

if [ ! -f "$LOCAL_NODE_PATH" ]; then
  echo "ERROR: 로컬 detector_node.py 없음:"
  echo "  $LOCAL_NODE_PATH"
  exit 1
fi

echo "LOCAL WS_DIR: $WS_DIR"
echo "LOCAL PKG   : $PKG"
echo "MODE        : $MODE"

echo ""
echo "[1/4] 압축: $PKG -> $TGZ"

cd "$PARENT"

rm -f "$TGZ"

tar czf "$TGZ" \
  --exclude="$PKG/venv" \
  --exclude="$PKG/build" \
  --exclude="$PKG/install" \
  --exclude="$PKG/log" \
  --exclude="$PKG/.git" \
  --exclude="$PKG/.pytest_cache" \
  --exclude="$PKG/__pycache__" \
  --exclude="$PKG/**/*.pyc" \
  --exclude="$PKG/*.pt" \
  --exclude="$PKG/**/*.pt" \
  "$PKG"

if [ ! -s "$TGZ" ]; then
  echo "ERROR: 압축 파일 생성 실패 또는 크기 0:"
  echo "  $TGZ"
  exit 1
fi

echo "TGZ 생성 완료:"
ls -lh "$TGZ"

echo ""
echo "[2/4] 중간 서버($JUMP_HOST)를 거쳐 최종 타겟($FINAL_TARGET)으로 자동 배포"

UNPACK_CMD="
set -e
mkdir -p '$REMOTE_PARENT_DIR'
tar xzf - --overwrite -C '$REMOTE_PARENT_DIR'
sync
"

# 중요:
# - tar 스트리밍이므로 ssh -t 사용 금지
# - 최종 타겟 로그인은 FINAL_PASS 사용
# - ProxyCommand 안에서만 JUMP_PASS 사용
sshpass -p "$FINAL_PASS" ssh \
  "${SSH_COMMON_OPTS[@]}" \
  -o ProxyCommand="$PROXY_CMD" \
  "$FINAL_TARGET" \
  "$UNPACK_CMD" < "$TGZ"

echo ""
echo "[3/4] 최종 타겟 소스 반영 확인"

VERIFY_CMD="
set -e

echo '[remote project]'
cd '$REMOTE_TARGET_DIR'
pwd

echo ''
echo '[remote node path]'
ls -l '$REMOTE_NODE_PATH'

echo ''
echo '[remote source check: block_handshake_when_arms_down]'
grep -n 'block_handshake_when_arms_down' '$REMOTE_NODE_PATH' || true

echo ''
echo '[remote source check: return False, False, False]'
grep -n 'return False, False, False' '$REMOTE_NODE_PATH' || true

echo ''
echo '[remote file timestamp]'
stat '$REMOTE_NODE_PATH' || true
"

sshpass -p "$FINAL_PASS" ssh \
  "${SSH_COMMON_OPTS[@]}" \
  -o ProxyCommand="$PROXY_CMD" \
  "$FINAL_TARGET" \
  "$VERIFY_CMD"

echo ""
echo "[4/4] 배포 완료"
echo "완료: 최종 목적지($FINAL_TARGET:$REMOTE_TARGET_DIR)로 자동 복사 및 덮어쓰기 완료"
echo ""