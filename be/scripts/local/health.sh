#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../.."

MODE="${1:-local}"
TIMEOUT="${TIMEOUT:-5}"

SERVICES=(
  "event_generator:9001"
  "event_receiver:3001"
  "event_analyzer:3002"
  "llm_gateway:3003"
  "action_runner:3004"
  "report_manager:3005"
  "ai_chat_service:3007"
  "config_manager:3008"
)

usage() {
  echo "Usage:"
  echo "  ./scripts/local/health.sh                # local(127.0.0.1) health check"
  echo "  ./scripts/local/health.sh local          # local(127.0.0.1) health check"
  echo "  ./scripts/local/health.sh external       # app.github.dev health check"
  echo
  echo "Optional env:"
  echo "  TIMEOUT=5                                # curl max-time seconds"
  echo "  CODESPACE_NAME=<name>                    # required when MODE=external"
}

if [[ "$MODE" != "local" && "$MODE" != "external" ]]; then
  usage
  exit 1
fi

get_codespace_name() {
  if [[ -n "${CODESPACE_NAME:-}" ]]; then
    echo "$CODESPACE_NAME"
    return 0
  fi

  if [[ -n "${CODESPACES:-}" && -n "${CODESPACE_NAME:-}" ]]; then
    echo "$CODESPACE_NAME"
    return 0
  fi

  if command -v gh >/dev/null 2>&1; then
    gh codespace list -R "dsdskm/lge" --json name,state --jq '.[] | select(.state == "Available") | .name' | head -n1
    return 0
  fi

  return 1
}

build_url() {
  local port="$1"

  if [[ "$MODE" == "local" ]]; then
    echo "http://127.0.0.1:${port}/health"
    return 0
  fi

  local cs_name
  cs_name="$(get_codespace_name || true)"
  if [[ -z "$cs_name" ]]; then
    echo ""
    return 1
  fi

  echo "https://${cs_name}-${port}.app.github.dev/health"
}

echo "[health] mode=$MODE timeout=${TIMEOUT}s"

fail=0
for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  port="${entry#*:}"

  if ! url="$(build_url "$port")"; then
    echo "[FAIL] ${name}(${port}) codespace name not found"
    fail=1
    continue
  fi

  if [[ -z "$url" ]]; then
    echo "[FAIL] ${name}(${port}) empty target url"
    fail=1
    continue
  fi

  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$url" || echo 000)"
  if [[ "$code" == "200" ]]; then
    echo "[ OK ] ${name}(${port}) ${url} -> ${code}"
  else
    echo "[FAIL] ${name}(${port}) ${url} -> ${code}"
    fail=1
  fi
done

if [[ "$fail" -eq 0 ]]; then
  echo "[health] all services are healthy"
  exit 0
fi

echo "[health] some services are unhealthy"
exit 1
