#!/usr/bin/env bash
set -Eeuo pipefail

CONTAINER_NAME="ai-chat-service-pg"
TARGET_DB="ai_chat_service_db"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <dump_name>"
  echo "Example: $0 ai_chat_service_db_0828"
  exit 1
fi

DUMP_NAME="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_PATH="$SCRIPT_DIR/$DUMP_NAME"
TMP_PATH="/tmp/$DUMP_NAME"

if [[ ! -e "$DUMP_PATH" ]]; then
  echo "Error: dump not found: $DUMP_PATH"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Error: container '$CONTAINER_NAME' is not running."
  exit 1
fi

echo "[1/4] Copying dump into container: $DUMP_PATH -> $CONTAINER_NAME:$TMP_PATH"
docker cp "$DUMP_PATH" "$CONTAINER_NAME:$TMP_PATH"

echo "[2/4] Terminating active sessions on $TARGET_DB"
docker exec "$CONTAINER_NAME" psql -U root -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TARGET_DB' AND pid <> pg_backend_pid();"

echo "[3/4] Dropping and recreating database: $TARGET_DB"
docker exec "$CONTAINER_NAME" psql -U root -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $TARGET_DB;"
docker exec "$CONTAINER_NAME" createdb -U root -O root "$TARGET_DB"

echo "[4/4] Restoring dump into $TARGET_DB from $TMP_PATH"
docker exec "$CONTAINER_NAME" pg_restore -U root -d "$TARGET_DB" --clean --if-exists "$TMP_PATH"

echo "[5/5] Listing tables in $TARGET_DB"
docker exec "$CONTAINER_NAME" psql -U root -d "$TARGET_DB" -c "\dt"

echo "Restore complete."
