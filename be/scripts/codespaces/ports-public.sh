#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../.."

REPO="${CODESPACE_REPO:-dsdskm/lge}"
CODESPACE_NAME="${CODESPACE_NAME:-}"
if [[ -z "$CODESPACE_NAME" && $# -gt 0 ]]; then
  CODESPACE_NAME="$1"
  shift
fi

log() { printf '%s\n' "$*"; }
ok() { printf '✅ %s\n' "$*"; }
warn() { printf '⚠️  %s\n' "$*"; }
err() { printf '❌ %s\n' "$*" >&2; }

get_forwarded_ports() {
  gh codespace ports -c "$CODESPACE_NAME" --json sourcePort --jq '.[].sourcePort' | sort -nu
}

if ! command -v gh >/dev/null 2>&1; then
  err "gh 명령을 찾을 수 없습니다. 먼저 'brew install gh' 로 설치하세요."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  err "gh 로그인이 필요합니다. 먼저 'gh auth login'을 실행하세요."
  exit 1
fi

if [[ -z "$CODESPACE_NAME" ]]; then
  CODESPACE_NAME="$(gh codespace list -R "$REPO" --json name,state --jq '.[] | select(.state == "Available") | .name' | head -n1 || true)"
fi

if [[ -z "$CODESPACE_NAME" ]]; then
  err "사용 가능한 Codespace를 찾지 못했습니다."
  err "CODESPACE_NAME=<이름> ./scripts/codespaces/ports-public.sh"
  exit 1
fi

declare -a target_ports=()

if [[ $# -eq 0 ]]; then
  mapfile -t target_ports < <(gh codespace ports -c "$CODESPACE_NAME" --json sourcePort --jq '.[].sourcePort' | sort -nu)
else
  for port in "$@"; do
    if [[ ! "$port" =~ ^[0-9]+$ ]]; then
      err "유효하지 않은 포트입니다: $port"
      exit 1
    fi
    target_ports+=("$port")
  done
fi

if [[ "${#target_ports[@]}" -eq 0 ]]; then
  warn "현재 포워딩된 포트가 없습니다."
  exit 0
fi

log "Codespace: $CODESPACE_NAME"
log "Repo: $REPO"
log "대상 포트: ${target_ports[*]}"

declare -A forwarded_set=()
while IFS= read -r port; do
  [[ -n "$port" ]] && forwarded_set["$port"]=1
done < <(get_forwarded_ports)

pending=0
failed=0

for port in "${target_ports[@]}"; do
  if [[ -z "${forwarded_set[$port]:-}" ]]; then
    warn "포트 $port 는 아직 포워딩되지 않았습니다. 서비스 기동 후 재시도합니다."
    pending=1
    continue
  fi

  if gh codespace ports visibility -c "$CODESPACE_NAME" "${port}:public" >/dev/null; then
    ok "포트 $port public 설정 완료"
  else
    err "포트 $port public 설정 실패"
    failed=1
  fi
done

if [[ "$failed" == "1" ]]; then
  exit 1
fi

if [[ "$pending" == "1" ]]; then
  warn "일부 포트가 아직 준비되지 않아 보류되었습니다."
  exit 2
fi

ok "선택한 포트를 모두 public으로 설정했습니다."
