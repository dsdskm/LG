#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if [ "$#" -gt 0 ]; then
  echo "[dev-docker-run] docker compose up -d --build $*"
  docker compose up -d --build "$@"
else
  echo "[dev-docker-run] docker compose up -d --build"
  docker compose up -d --build
fi

docker exec -it ollama ollama pull phi3