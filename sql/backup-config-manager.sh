#!/usr/bin/env bash
set -Eeuo pipefail

CONTAINER_NAME="config-manager-pg"
TARGET_DB="config_manager_db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP="$(date '+%m%d%H%M')"
DUMP_NAME="${1:-${TARGET_DB}_${TIMESTAMP}}"
DUMP_PATH="$SCRIPT_DIR/$DUMP_NAME"
TMP_PATH="/tmp/$DUMP_NAME"

if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [dump_name]"
  echo "Example: $0 config_manager_db_08281543"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Error: container '$CONTAINER_NAME' is not running."
  exit 1
fi

echo "[1/3] Creating dump from $TARGET_DB in container: $TMP_PATH"
docker exec "$CONTAINER_NAME" bash -lc "pg_dump -U root -d '$TARGET_DB' --format=custom --file '$TMP_PATH'"

echo "[2/3] Copying dump to host: $CONTAINER_NAME:$TMP_PATH -> $DUMP_PATH"
docker cp "$CONTAINER_NAME:$TMP_PATH" "$DUMP_PATH"

echo "[3/3] Cleaning temporary dump from container"
docker exec "$CONTAINER_NAME" bash -lc "rm -f '$TMP_PATH'"

echo "Backup complete: $DUMP_PATH"
ls -lh "$DUMP_PATH"
