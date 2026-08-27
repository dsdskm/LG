#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="${DB_NAME:-ai_chat_service_db}"
CONTAINER_NAME="${CONTAINER_NAME:-ai-chat-service-pg}"
BACKUP_PATH="${1:-${ROOT_DIR}/ai_chat_service_db}"
TEMP_DUMP="/tmp/${DB_NAME}.dump"

if [[ ! -f "$BACKUP_PATH" ]]; then
  echo "❌ 백업 파일을 찾지 못했습니다: $BACKUP_PATH"
  echo "예: ./restore/ai_chat_service_db.sh"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "❌ 컨테이너가 없습니다: $CONTAINER_NAME"
  exit 1
fi

echo "[1/4] 백업 파일 복사"
docker cp "$BACKUP_PATH" "${CONTAINER_NAME}:${TEMP_DUMP}"

echo "[2/4] 기존 DB 초기화"
docker exec "$CONTAINER_NAME" bash -lc "
set -euo pipefail
export PGUSER=root
export PGDATABASE=postgres

psql -v ON_ERROR_STOP=1 -U root -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();\"
psql -v ON_ERROR_STOP=1 -U root -d postgres -c \"DROP DATABASE IF EXISTS ${DB_NAME};\"
psql -v ON_ERROR_STOP=1 -U root -d postgres -c \"CREATE DATABASE ${DB_NAME} OWNER root;\"
"

echo "[3/4] 복원 중..."
docker exec "$CONTAINER_NAME" bash -lc "
set -euo pipefail
export PGUSER=root
export PGDATABASE=${DB_NAME}
pg_restore -U root -d ${DB_NAME} --clean --if-exists --no-owner --no-privileges '${TEMP_DUMP}'
"

echo "[4/4] 복구 확인"
docker exec "$CONTAINER_NAME" psql -U root -d "$DB_NAME" -c "\dt"
docker exec "$CONTAINER_NAME" psql -U root -d "$DB_NAME" -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"

echo "✅ ai_chat_service DB 복구 완료"
echo "DB: ${DB_NAME}"
echo "컨테이너: ${CONTAINER_NAME}"
