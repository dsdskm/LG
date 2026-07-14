#!/usr/bin/env bash

set -euo pipefail

# 스크립트 위치 기준으로 동작 (어디서 실행해도 동일하게 .mcap 을 찾음)
cd "$(dirname "$0")"

FILE_PATH="${1:-./dwa_mcap_20260306_000540.mcap}"
HOST="${2:-http://localhost:3001}"
ENDPOINT="/events/ingest/mcap"
URL="${HOST}${ENDPOINT}"

if [ ! -f "${FILE_PATH}" ]; then
  echo "[ERROR] MCAP file not found: ${FILE_PATH}"
  exit 1
fi

echo "[INFO] Sending MCAP file: ${FILE_PATH}"
echo "[INFO] URL: ${URL}"

curl -v -X POST "${URL}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@${FILE_PATH}"

echo
echo "[INFO] Done."
