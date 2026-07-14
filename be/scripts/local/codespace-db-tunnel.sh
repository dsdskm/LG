#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../.."

REPO="${CODESPACE_REPO:-dsdskm/lge}"
CODESPACE_NAME="${CODESPACE_NAME:-${1:-}}"
PORT_OFFSET="${PORT_OFFSET:-0}"

SERVICES=(
  config_manager
  event_receiver
  event_analyzer
  action_runner
  report_manager
  ai_chat_service
)

db_port_for() {
  case "$1" in
    config_manager) echo 5440 ;;
    event_receiver) echo 5433 ;;
    event_analyzer) echo 5434 ;;
    action_runner) echo 5436 ;;
    report_manager) echo 5437 ;;
    ai_chat_service) echo 5439 ;;
    *) return 1 ;;
  esac
}

log() { printf '%s\n' "$*"; }
ok() { printf '✅ %s\n' "$*"; }
warn() { printf '⚠️  %s\n' "$*"; }
err() { printf '❌ %s\n' "$*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "'$1' 명령을 찾을 수 없습니다."
    exit 1
  fi
}

if ! command -v gh >/dev/null 2>&1; then
  err "gh 명령을 찾을 수 없습니다. 먼저 'brew install gh' 로 설치하세요."
  exit 1
fi

if [[ -z "$CODESPACE_NAME" ]]; then
  CODESPACE_NAME="$(gh codespace list -R "$REPO" --json name,state --jq '.[] | select(.state == "Available") | .name' | head -n1 || true)"
fi

if ! gh auth status >/dev/null 2>&1; then
  err "gh 로그인이 필요합니다. 먼저 'gh auth login'을 실행하세요."
  exit 1
fi

if [[ -z "$CODESPACE_NAME" ]]; then
  err "사용 가능한 Codespace를 찾지 못했습니다."
  err "CODESPACE_NAME=<이름> ./scripts/local/codespace-db-tunnel.sh"
  exit 1
fi

LOG_DIR="${TMPDIR:-/tmp}/codespace-db-tunnel"
mkdir -p "$LOG_DIR"

pids=()

cleanup() {
  log ""
  warn "터널 종료 중..."
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  ok "종료 완료"
}

trap cleanup INT TERM EXIT

log "Codespace: $CODESPACE_NAME"
log "Repo: $REPO"
log "포트 오프셋: $PORT_OFFSET"
log ""
log "포트 포워딩 시작 중..."

for service in "${SERVICES[@]}"; do
  remote_port="$(db_port_for "$service")"
  local_port="$((remote_port + PORT_OFFSET))"
  logfile="$LOG_DIR/$service.log"

  log "- $service: 127.0.0.1:$local_port -> $CODESPACE_NAME:127.0.0.1:$remote_port"
  gh codespace ssh -c "$CODESPACE_NAME" -- -N -L "${local_port}:127.0.0.1:${remote_port}" >"$logfile" 2>&1 &
  pids+=("$!")
done

log ""
ok "pgAdmin4 접속 정보"
log "Host=127.0.0.1"
log "User=root"
log "Password=root"
log "Port=<기본포트 + $PORT_OFFSET>"
log "DB=<서비스>_db"
log ""
warn "이 창을 닫지 마세요. 종료하려면 Ctrl+C."
warn "문제가 있으면 로그를 확인하세요: $LOG_DIR"

wait