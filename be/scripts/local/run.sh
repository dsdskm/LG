#!/bin/bash
set -euo pipefail

# scripts/run/ 에서 레포 루트로 이동 (스크립트 위치가 바뀌어도 루트 기준 동작)
cd "$(dirname "$0")/../.."

# 모던 Node 툴체인 고정: 시스템 /usr/bin/node 는 v12 라 최신 pnpm(옵셔널 체이닝)을 파싱 못 한다.
# 비로그인 셸(VSCode 터미널/태스크 등)에서 linuxbrew PATH 가 빠져 v12 가 잡히는 문제를 방지.
if [[ -x /home/linuxbrew/.linuxbrew/bin/node ]]; then
  export PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"
fi

APP="all"
MODE="start"

usage() {
  echo "Usage:"
  echo "  ./scripts/local/run.sh                   # all apps, start mode"
  echo "  ./scripts/local/run.sh <app>             # single app, start mode"
  echo "  ./scripts/local/run.sh dev               # all apps, dev mode"
  echo "  ./scripts/local/run.sh <app> dev         # single app, dev mode"
}

parse_args() {
  case "$#" in
    0)
      APP="all"
      MODE="start"
      ;;
    1)
      if [[ "$1" == "dev" ]]; then
        APP="all"
        MODE="dev"
      else
        APP="$1"
        MODE="start"
      fi
      ;;
    2)
      if [[ "$2" == "dev" ]]; then
        APP="$1"
        MODE="dev"
      else
        echo "[dev-run] ERROR: invalid arguments"
        usage
        exit 1
      fi
      ;;
    *)
      echo "[dev-run] ERROR: too many arguments"
      usage
      exit 1
      ;;
  esac
}

parse_args "$@"

SERVICES=(
  "config_manager:./apps/config_manager"
  "event_generator:./apps/event_generator"
  "event_receiver:./apps/event_receiver"
  "event_analyzer:./apps/event_analyzer"
  "llm_gateway:./apps/llm_gateway"
  "action_runner:./apps/action_runner"
  "report_manager:./apps/report_manager"
  "ai_chat_service:./apps/ai_chat_service"
)

find_service_path() {
  local target="$1"

  for item in "${SERVICES[@]}"; do
    local name="${item%%:*}"
    local path="${item#*:}"

    if [[ "$name" == "$target" ]]; then
      echo "$path"
      return 0
    fi
  done

  return 1
}

run_service() {
  local app_name="$1"
  local mode="$2"
  local app_path

  if ! app_path="$(find_service_path "$app_name")"; then
    echo "Unknown app: $app_name"
    exit 1
  fi

  echo "[dev-run] starting $app_name ($mode)"
  npx dotenv -e .env -- pnpm --filter "$app_path" "$mode"
}

run_build() {
  local target="$1"

  if [[ ! -x ./scripts/local/build.sh ]]; then
    echo "[dev-run] TIP: chmod +x ./scripts/local/build.sh"
    exit 1
  fi

  if [[ "$target" == "all" ]]; then
    echo "[dev-run] running build for all..."
    ./scripts/local/build.sh
  else
    echo "[dev-run] running build for $target..."
    ./scripts/local/build.sh "$target"
  fi
}

run_health_check_once() {
  if [[ "${RUN_HEALTH_CHECK_ON_BOOT:-1}" != "1" ]]; then
    return 0
  fi

  if [[ ! -x ./scripts/local/health.sh ]]; then
    echo "[dev-run] skip health check: ./scripts/local/health.sh not executable"
    return 0
  fi

  local delay_sec="${HEALTH_CHECK_DELAY_SEC:-8}"
  (
    sleep "$delay_sec"
    echo "[dev-run] running one-time local health check..."
    ./scripts/local/health.sh local || true
  ) &
}

# (1) start 모드일 때만 build
if [[ "$MODE" == "start" ]]; then
  run_build "$APP"
fi

# (2) DB 시작
echo "[dev-run] starting DB..."
./scripts/local/db.sh

# (3) 서비스 실행
if [[ "$APP" == "all" ]]; then
  echo "[dev-run] starting all services ($MODE)..."

  for item in "${SERVICES[@]}"; do
    app_name="${item%%:*}"
    run_service "$app_name" "$MODE" &
  done

  run_health_check_once

  wait
  exit 0
fi

run_service "$APP" "$MODE"
