#!/bin/bash
set -euo pipefail

# scripts/deploy/ 에서 레포 루트로 이동 (compose.local.yml / .env.docker 가 루트에 있음)
cd "$(dirname "$0")/../.."


# 첫 번째 인자가 서비스명(예: event_receiver_service 등)이면 SERVICE 변수에 할당
MODE="dev"
SERVICE=""
if [ $# -ge 1 ]; then
  case "$1" in
    up|dev|down|logs)
      MODE="$1"
      ;;
    *)
      SERVICE="$1"
      if [ $# -ge 2 ]; then
        MODE="$2"
      fi
      ;;
  esac
fi


COMPOSE_FILE="compose.local.yml"


# .env.docker를 기본 env로 사용
export APP_ENV_FILE="${APP_ENV_FILE:-.env.docker}"

case "$MODE" in
  dev|""|up)
    if [ -n "$SERVICE" ]; then
      echo "[dev-docker-run] up $SERVICE (detached) APP_ENV_FILE=$APP_ENV_FILE"
      docker compose -f "$COMPOSE_FILE" up -d --build "$SERVICE"
      echo "  logs: docker compose -f $COMPOSE_FILE logs -f $SERVICE"
    else
      echo "[dev-docker-run] up all (detached) APP_ENV_FILE=$APP_ENV_FILE"
      docker compose -f "$COMPOSE_FILE" up -d --build
      echo "  logs: docker compose -f $COMPOSE_FILE logs -f"
    fi
    ;;
  down)
    if [ -n "$SERVICE" ]; then
      echo "[dev-docker-run] down $SERVICE"
      docker compose -f "$COMPOSE_FILE" down "$SERVICE"
    else
      echo "[dev-docker-run] down all"
      docker compose -f "$COMPOSE_FILE" down
    fi
    ;;
  logs)
    if [ -n "$SERVICE" ]; then
      docker compose -f "$COMPOSE_FILE" logs -f "$SERVICE"
    else
      docker compose -f "$COMPOSE_FILE" logs -f
    fi
    ;;
  *)
    echo "Usage: $0 [SERVICE] [up|down|logs]"
    echo "  ex) $0 event_receiver_service up"
    echo "      $0 event_receiver_service down"
    echo "      $0 logs"
    exit 1
    ;;
esac