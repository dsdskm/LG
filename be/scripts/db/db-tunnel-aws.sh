#!/usr/bin/env bash
#
# SSM 포트포워딩으로 EC2 안 "DB 컨테이너"(5432)를 로컬로 끌어옵니다.
# (pgAdmin4 / DBeaver 등에서 localhost 로 접속하기 위함)
#
# 이 프로젝트의 DB 는 호스트에 포트를 publish 하지 않고 도커 네트워크 안
# 컨테이너(*_db)로만 떠 있어, 컨테이너의 도커 IP:5432 로 포워딩합니다.
# (AWS-StartPortForwardingSessionToRemoteHost)
#
# 사용법:
#   ./db-tunnel-aws.sh                       # 전체 DB 터널 일괄 (기본)
#   ./db-tunnel-aws.sh all                   # 동일
#   ./db-tunnel-aws.sh event_receiver        # 특정 서비스 하나만(포그라운드)
#   ./db-tunnel-aws.sh event_receiver 15433  # 로컬 포트 직접 지정
#   INSTANCE_ID=i-0123... ./db-tunnel-aws.sh # 인스턴스 직접 지정
#
# 접속(터널 뜬 뒤): Host=127.0.0.1, 아래 포트, User=root, Password=root, DB=<서비스>_db
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../aws/config.sh"
require_aws

PROJECT_TAG="${PROJECT_TAG:-rsp-ai-analysis}"
REMOTE_PORT="${REMOTE_PORT:-5432}"
# 로컬 dev DB(dev-db.sh)와 포트가 겹치면 동시에 못 띄운다.
# 마이그레이션처럼 양쪽을 동시에 열어야 할 때는 PORT_OFFSET 으로 비켜 띄운다.
#   예) PORT_OFFSET=10000 ./db-tunnel-aws.sh   → event_receiver 가 15433 로 열림
PORT_OFFSET="${PORT_OFFSET:-0}"
ALL_SERVICES="config_manager event_receiver event_analyzer action_runner report_manager ai_chat_service"

# 서비스 → 기본 로컬포트 (dev-db.sh 관례와 동일). bash 3.2 호환 위해 case 사용.
db_localport_for() {
  local base
  case "$1" in
    config_manager) base=5440 ;;
    event_receiver) base=5433 ;;
    event_analyzer) base=5434 ;;
    action_runner)  base=5436 ;;
    report_manager) base=5437 ;;
    ai_chat_service) base=5439 ;;
    *) echo ""; return ;;
  esac
  echo $(( base + PORT_OFFSET ))
}

# 로컬 포트가 이미 사용 중인지 검사(사용 중이면 0=true).
port_in_use() {  # $1=port
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$1" >/dev/null 2>&1
  else
    return 1  # 검사 도구 없음 → 점유 아님으로 간주
  fi
}

# ── session-manager-plugin 확인 ─────────────────────────────
if ! command -v session-manager-plugin >/dev/null 2>&1; then
  err "session-manager-plugin 이 없습니다. 포트포워딩에 필요합니다."
  err "설치: brew install --cask session-manager-plugin"
  exit 1
fi

# ── 대상 인스턴스 (한 번만 조회) ────────────────────────────
INSTANCE_ID="${INSTANCE_ID:-}"
for a in "$@"; do [[ "$a" == i-* ]] && INSTANCE_ID="$a"; done
if [[ -z "$INSTANCE_ID" ]]; then
  log "Project=$PROJECT_TAG 의 running 인스턴스 조회 중..."
  INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=tag:Project,Values=$PROJECT_TAG" "Name=instance-state-name,Values=running" \
    --region "$AWS_REGION" \
    --query "Reservations[].Instances[].InstanceId | [0]" --output text)
fi
if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  err "대상 인스턴스를 찾지 못했습니다. (PROJECT_TAG=$PROJECT_TAG 확인 또는 i-xxxx 직접 지정)"
  exit 1
fi
ok "대상 인스턴스: $INSTANCE_ID"

# ── DB 컨테이너의 도커 네트워크 IP 조회 ─────────────────────
# DB 서비스는 container_name 이 없어 compose 가 프로젝트명을 붙인 이름으로 뜨므로
# 정확한 이름 대신 name 필터로 찾는다.
container_ip() {  # $1=service
  local container inspect_cmd cmd_id
  container="${1}_db"
  inspect_cmd="cid=\$(sudo docker ps -q --filter name=$container | head -n1); sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \$cid"
  cmd_id=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"$inspect_cmd\"]" \
    --region "$AWS_REGION" --query 'Command.CommandId' --output text)
  aws ssm wait command-executed \
    --command-id "$cmd_id" --instance-id "$INSTANCE_ID" --region "$AWS_REGION" 2>/dev/null || true
  aws ssm get-command-invocation \
    --command-id "$cmd_id" --instance-id "$INSTANCE_ID" --region "$AWS_REGION" \
    --query 'StandardOutputContent' --output text | tr -d '[:space:]'
}

start_session() {  # $1=ip  $2=localport
  aws ssm start-session \
    --target "$INSTANCE_ID" --region "$AWS_REGION" \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "{\"host\":[\"$1\"],\"portNumber\":[\"$REMOTE_PORT\"],\"localPortNumber\":[\"$2\"]}"
}

# ── 단일 서비스 모드 ────────────────────────────────────────
SERVICE="${1:-all}"
if [[ "$SERVICE" != "all" && "$SERVICE" != i-* ]]; then
  lp="$(db_localport_for "$SERVICE")"
  if [[ -z "$lp" ]]; then
    err "알 수 없는 서비스: $SERVICE"
    err "가능: $ALL_SERVICES"
    exit 1
  fi
  [[ "${2:-}" =~ ^[0-9]+$ ]] && lp="$2"
  if port_in_use "$lp"; then
    err "로컬 포트 $lp 가 이미 사용 중입니다. 기존 터널/프로세스를 종료하거나 다른 포트를 지정하세요."
    err "  점유 확인: lsof -nP -iTCP:$lp -sTCP:LISTEN"
    exit 1
  fi
  log "컨테이너(${SERVICE}_db) IP 조회 중..."
  ip="$(container_ip "$SERVICE")"
  [[ -z "$ip" ]] && { err "컨테이너 IP 조회 실패 (${SERVICE}_db 가 떠 있는지 확인)"; exit 1; }
  ok "컨테이너 IP: $ip"
  log "포트포워딩: 127.0.0.1:$lp → ${SERVICE}_db($ip):$REMOTE_PORT"
  log "pgAdmin4 → Host=127.0.0.1  Port=$lp  User=root  Password=root  DB=${SERVICE}_db"
  log "(종료: Ctrl+C)"
  exec aws ssm start-session \
    --target "$INSTANCE_ID" --region "$AWS_REGION" \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "{\"host\":[\"$ip\"],\"portNumber\":[\"$REMOTE_PORT\"],\"localPortNumber\":[\"$lp\"]}"
fi

# ── 전체 모드 ───────────────────────────────────────────────
LOG_DIR="${TMPDIR:-/tmp}/db-tunnel"
mkdir -p "$LOG_DIR"
PIDS=""

cleanup() {
  echo
  log "터널 종료 중..."
  for p in $PIDS; do kill "$p" 2>/dev/null || true; done
  wait 2>/dev/null || true
  ok "모든 터널 종료 완료."
}
trap cleanup INT TERM EXIT

# 시작 전에 점유 포트 먼저 걸러낸다(사용 중이면 SSM 세션이 조용히 죽어 오탐이 난다).
busy=""
for svc in $ALL_SERVICES; do
  lp="$(db_localport_for "$svc")"
  if port_in_use "$lp"; then
    busy="$busy $svc(:$lp)"
  fi
done
if [[ -n "$busy" ]]; then
  err "이미 사용 중인 로컬 포트가 있습니다:$busy"
  err "기존 터널/프로세스를 종료하거나 PORT_OFFSET 으로 비켜 띄우세요. (예: PORT_OFFSET=10000 $0)"
  exit 1
fi

log "DB 터널 일괄 시작 (서비스 5개)"
for svc in $ALL_SERVICES; do
  lp="$(db_localport_for "$svc")"
  logfile="$LOG_DIR/$svc.log"
  (
    ip="$(container_ip "$svc")"
    if [[ -z "$ip" ]]; then echo "__IP_FAIL__"; exit 1; fi
    echo "__IP_OK__ $ip"
    start_session "$ip" "$lp"
  ) >"$logfile" 2>&1 &
  PIDS="$PIDS $!"
done

# 각 세션이 "Waiting for connections" 를 찍으면 준비완료로 판단(최대 40초 대기)
echo
log "터널 수립 대기 중 (컨테이너 IP 조회 → 세션 수립)..."
for svc in $ALL_SERVICES; do
  lp="$(db_localport_for "$svc")"
  logfile="$LOG_DIR/$svc.log"
  state="timeout"
  for _ in $(seq 1 40); do
    if grep -q "Waiting for connections" "$logfile" 2>/dev/null; then state="ready"; break; fi
    if grep -q "__IP_FAIL__" "$logfile" 2>/dev/null; then state="ipfail"; break; fi
    sleep 1
  done
  case "$state" in
    ready)  ok  "$(printf '%-16s 127.0.0.1:%-6s db=%s_db' "$svc" "$lp" "$svc")" ;;
    ipfail) err "$(printf '%-16s 컨테이너 IP 조회 실패 — %s' "$svc" "$logfile")" ;;
    *)      err "$(printf '%-16s 준비 실패/지연 — %s' "$svc" "$logfile")" ;;
  esac
done

echo
ok "준비 완료. pgAdmin4 → Host=127.0.0.1 / 위 포트 / User=root / Password=root"
warn "이 창을 닫지 마세요. 종료하려면 Ctrl+C."
wait
