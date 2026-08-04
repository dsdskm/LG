#!/bin/bash
set -eu

# scripts/run/ 에서 레포 루트로 이동
cd "$(dirname "$0")/../.."

start_db() {
  local name=$1 port=$2 dbname=$3

  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    docker start "$name"
    echo "♻️  $name restarted"
  else
    docker run -d \
      --name "$name" \
      -p "${port}:5432" \
      -e POSTGRES_DB="$dbname" \
      -e POSTGRES_USER=root \
      -e POSTGRES_PASSWORD=root \
      postgres:latest

    echo "✅ $name created"
  fi
}

start_dbs() {
  echo "🚀 Starting PostgreSQL containers..."

  start_db event-receiver-pg 5433 event_receiver_db
  start_db config-manager-pg 5440 config_manager_db
  start_db event-analyzer-pg 5434 event_analyzer_db
  start_db action-runner-pg 5436 action_runner_db
  start_db report-manager-pg 5437 report_manager_db
  start_db mcp-tools-pg 5438 mcp_tools_db
  start_db ai-chat-service-pg 5439 ai_chat_service_db

  echo "✅ All PostgreSQL containers running!"
}

ACTION="${1:-start}"

if [ "$ACTION" = "stop" ]; then
  docker stop event-receiver-pg config-manager-pg event-analyzer-pg action-runner-pg report-manager-pg mcp-tools-pg ai-chat-service-pg
  echo "⏹️  DBs stopped"

elif [ "$ACTION" = "rm" ]; then
  docker stop event-receiver-pg config-manager-pg event-analyzer-pg action-runner-pg report-manager-pg mcp-tools-pg ai-chat-service-pg 2>/dev/null || true
  docker rm event-receiver-pg config-manager-pg event-analyzer-pg action-runner-pg report-manager-pg mcp-tools-pg ai-chat-service-pg
  echo "🗑️  DBs removed"

else
  start_dbs
fi