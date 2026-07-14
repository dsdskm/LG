#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

HOST="${1:-localhost}"
OUT_DIR="docs/openapi"

SERVICES=(
  "event_generator:9001"
  "config_manager:3008"
  "event_receiver:3001"
  "event_analyzer:3002"
  "llm_gateway:3003"
  "action_runner:3004"
  "report_manager:3005"
  "ai_chat_service:3007"
)

mkdir -p "$OUT_DIR"

echo "== Export OpenAPI specs (host=$HOST) =="

pass=0
fail=0

for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  port="${entry##*:}"
  url="http://$HOST:$port/docs-json"
  out_file="$OUT_DIR/$name.json"
  tmp_file="$out_file.tmp"

  if curl -fsS "$url" > "$tmp_file"; then
    mv "$tmp_file" "$out_file"
    echo "[OK] $name -> $out_file"
    pass=$((pass + 1))
  else
    rm -f "$tmp_file"
    echo "[FAIL] $name ($url)"
    fail=$((fail + 1))
  fi
done

echo
echo "== Summary =="
echo "PASS: $pass"
echo "FAIL: $fail"

if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
