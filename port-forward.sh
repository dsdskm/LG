#!/usr/bin/env bash

set -euo pipefail

REPO="${CODESPACE_REPO:-dsdskm/lge}"
CODESPACE_NAME="${CODESPACE_NAME:-${1:-}}"

log() { printf '%s\n' "$*"; }
err() { printf '❌ %s\n' "$*" >&2; }

if ! command -v gh >/dev/null 2>&1; then
  err "gh 명령을 찾을 수 없습니다. 먼저 설치하세요."
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
  err "CODESPACE_NAME=<이름> ./port-forward.sh"
  exit 1
fi

if [[ $# -gt 0 ]]; then
  shift
fi

if [[ $# -eq 0 ]]; then
  PORTS=(5173)
else
  PORTS=("$@")
fi

declare -a mappings=()
for port in "${PORTS[@]}"; do
  if [[ ! "$port" =~ ^[0-9]+$ ]]; then
    err "유효하지 않은 포트입니다: $port"
    exit 1
  fi
  mappings+=("${port}:${port}")
done

log "Codespace: $CODESPACE_NAME"
log "Forward: ${mappings[*]}"
log ""
log "로컬 PC에서 이 창을 닫지 마세요. 종료는 Ctrl+C"

# 로컬 PC에서 실행하면 localhost:<port> 로 접근 가능합니다.
gh codespace ports forward -c "$CODESPACE_NAME" "${mappings[@]}"
