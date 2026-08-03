#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./generate.sh 30
#   ./generate.sh 30 random
#   MOCK_COUNT=50 ./generate.sh
#
# Optional envs:
#   CONFIG_MANAGER_URL (default: http://localhost:3008)
#   ACTION_RUNNER_URL  (default: http://localhost:3004)
#   EVENT_GENERATOR_URL(default: http://localhost:9001)
#   EVENT_RECEIVER_URL (default: http://localhost:3001)
#   EVENT_ANALYZER_URL (default: http://localhost:3002)
#   KEEP_PROVIDER=true  (default: false)

COUNT="${1:-${MOCK_COUNT:-10}}"
DATE_MODE="${2:-fixed}"
if [[ ! "$COUNT" =~ ^[0-9]+$ ]] || (( COUNT <= 0 )); then
  echo "[ERROR] count must be a positive integer. (example: ./generate.sh 20)"
  exit 1
fi

if [[ "$DATE_MODE" != "fixed" && "$DATE_MODE" != "random" ]]; then
  echo "[ERROR] date mode must be 'fixed' or 'random'. (example: ./generate.sh 30 random)"
  exit 1
fi

CONFIG_MANAGER_URL="${CONFIG_MANAGER_URL:-http://localhost:3008}"
ACTION_RUNNER_URL="${ACTION_RUNNER_URL:-http://localhost:3004}"
EVENT_GENERATOR_URL="${EVENT_GENERATOR_URL:-http://localhost:9001}"
EVENT_RECEIVER_URL="${EVENT_RECEIVER_URL:-http://localhost:3001}"
EVENT_ANALYZER_URL="${EVENT_ANALYZER_URL:-http://localhost:3002}"
KEEP_PROVIDER="${KEEP_PROVIDER:-false}"
MIN_GAP_MINUTES="${MIN_GAP_MINUTES:-2}"
MAX_GAP_MINUTES="${MAX_GAP_MINUTES:-30}"

if [[ ! "$MIN_GAP_MINUTES" =~ ^[0-9]+$ ]] || [[ ! "$MAX_GAP_MINUTES" =~ ^[0-9]+$ ]]; then
  echo "[ERROR] MIN_GAP_MINUTES and MAX_GAP_MINUTES must be integers."
  exit 1
fi

if (( MIN_GAP_MINUTES < 1 || MAX_GAP_MINUTES < 1 || MIN_GAP_MINUTES > MAX_GAP_MINUTES )); then
  echo "[ERROR] invalid gap range. require 1 <= MIN_GAP_MINUTES <= MAX_GAP_MINUTES"
  exit 1
fi

for cmd in curl jq awk shuf; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[ERROR] required command not found: $cmd"
    exit 1
  fi
done

TMP_DIR="$(mktemp -d)"
FUNCS_JSON="$TMP_DIR/funcs.json"
ACTIONS_JSON="$TMP_DIR/actions.json"
HEADER_FILE="$TMP_DIR/send.headers"

ORIGINAL_PROVIDER=""
PROVIDER_CAPTURED="false"
LAST_SEVERITY=""

cleanup() {
  if [[ "$KEEP_PROVIDER" != "true" ]] && [[ "$PROVIDER_CAPTURED" == "true" ]] && [[ -n "$ORIGINAL_PROVIDER" ]]; then
    curl -sS -X PUT \
      -H 'Content-Type: application/json' \
      -d "$(jq -nc --arg provider "$ORIGINAL_PROVIDER" '{provider:$provider}')" \
      "$CONFIG_MANAGER_URL/config/llm/active-provider" >/dev/null || true
    echo "[INFO] restored llm provider to '$ORIGINAL_PROVIDER'"
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

request_json() {
  local method="$1"
  local url="$2"
  local data="${3:-}"

  if [[ -n "$data" ]]; then
    curl -sS -X "$method" "$url" \
      -H 'Content-Type: application/json' \
      -d "$data"
  else
    curl -sS -X "$method" "$url"
  fi
}

get_active_provider() {
  request_json GET "$CONFIG_MANAGER_URL/config/llm/active-provider" |
    jq -r '.data.provider // empty'
}

set_active_provider() {
  local provider="$1"
  request_json PUT "$CONFIG_MANAGER_URL/config/llm/active-provider" \
    "$(jq -nc --arg provider "$provider" '{provider:$provider}')" >/dev/null
}

fetch_catalogs() {
  request_json GET "$CONFIG_MANAGER_URL/config/fun" > "$FUNCS_JSON"
  request_json GET "$ACTION_RUNNER_URL/actions" > "$ACTIONS_JSON"

  local func_count action_count
  func_count="$(jq -r '.data | length // 0' "$FUNCS_JSON")"
  action_count="$(jq -r '.data | length // 0' "$ACTIONS_JSON")"

  echo "[INFO] fetched funcs=$func_count, actions=$action_count"
}

pick_func() {
  local picked
  picked="$({
    jq -r '.data[]? | select((.func // "") != "" and .func != "default") | .func' "$FUNCS_JSON"
    jq -r '.data[]? | select((.func // "") == "default") | (.tags // [])[]?' "$FUNCS_JSON"
  } | awk 'NF > 0' | shuf -n 1)"

  if [[ -z "$picked" ]]; then
    picked="system"
  fi
  echo "$picked"
}

pick_action_for_func() {
  local func="$1"
  local picked

  picked="$(jq -r --arg func "$func" '
    [ .data[]?
      | select((.enable // true) == true)
      | select(((.funcs // []) | length == 0) or ((.funcs // []) | index($func)))
      | .name
    ] | .[]?
  ' "$ACTIONS_JSON" | awk 'NF > 0' | shuf -n 1)"

  if [[ -z "$picked" ]]; then
    picked="$(jq -r '[.data[]? | select((.enable // true) == true) | .name] | .[]?' "$ACTIONS_JSON" | awk 'NF > 0' | shuf -n 1)"
  fi

  if [[ -z "$picked" ]]; then
    picked="manual-follow-up"
  fi
  echo "$picked"
}

latest_event_id() {
  request_json GET "$EVENT_RECEIVER_URL/events?startIndex=0&count=20" |
    jq -r '[.data[]?.id] | max // 0'
}

create_event_via_generator() {
  local payload
  payload="$(jq -nc --arg receiverUrl "$EVENT_RECEIVER_URL" '{durationMinutes:1, logsPerSecond:40, errorCount:8, receiverUrl:$receiverUrl}')"

  curl -sS -X POST "$EVENT_GENERATOR_URL/send" \
    -H 'Content-Type: application/json' \
    -D "$HEADER_FILE" \
    -o /dev/null \
    -d "$payload"

  local receiver_status
  receiver_status="$(awk -F': ' 'tolower($1)=="x-receiver-status" {gsub("\r", "", $2); print $2}' "$HEADER_FILE" | tail -n 1)"
  if [[ -z "$receiver_status" ]]; then
    receiver_status="unknown"
  fi

  echo "$receiver_status"
}

find_new_event_id() {
  local before_id="$1"
  local found=""

  for _ in {1..30}; do
    found="$(request_json GET "$EVENT_RECEIVER_URL/events?startIndex=0&count=30" | jq -r --argjson before "$before_id" '[.data[]? | select((.id // 0) > $before) | .id] | max // empty')"
    if [[ -n "$found" ]]; then
      echo "$found"
      return 0
    fi
  done

  return 1
}

patch_analysis() {
  local event_id="$1"
  local func="$2"
  local action_name="$3"
  local idx="$4"
  local at="${5:-}"

  local severity
  severity="$(random_severity)"
  LAST_SEVERITY="$severity"

  local confidence
  confidence="$(awk 'BEGIN{srand(); printf "%.2f", 0.62 + rand()*0.36}')"

  local summary reason solutions
  summary="${func} subsystem anomaly detected in batch #${idx} (${severity})"
  reason="Intermittent signal loss and delayed response were observed around ${func} execution path."
  solutions="1) Apply ${action_name}. 2) Restart related node sequence. 3) Verify dependency health and retry workflow."

  local body
  body="$(jq -nc \
    --arg summary "$summary" \
    --arg reason "$reason" \
    --arg solutions "$solutions" \
    --arg func "$func" \
    --arg severity "$severity" \
    --argjson confidence "$confidence" \
    '{summary:$summary, reason:$reason, solutions:$solutions, func:$func, severity:$severity, confidence:$confidence}')"

  local ok_value="false"
  for _ in {1..30}; do
    ok_value="$(request_json PATCH "$EVENT_ANALYZER_URL/analysis/$event_id" "$body" | jq -r '.data.ok // false')"
    if [[ "$ok_value" == "true" ]]; then
      break
    fi
  done

  if [[ "$ok_value" != "true" ]]; then
    return 1
  fi

  request_json PATCH "$EVENT_RECEIVER_URL/events/$event_id/status" '{"status":"ANALYZED"}' >/dev/null || true

  if [[ -n "$at" ]]; then
    local event_ts_ok analysis_ts_ok
    event_ts_ok="$(request_json PATCH "$EVENT_RECEIVER_URL/events/$event_id/timestamp" \
      "$(jq -nc --arg at "$at" '{at:$at}')" | jq -r '.data.ok // false')"
    analysis_ts_ok="$(request_json PATCH "$EVENT_ANALYZER_URL/analysis/$event_id/timestamp" \
      "$(jq -nc --arg at "$at" '{at:$at}')" | jq -r '.data.ok // false')"

    if [[ "$event_ts_ok" != "true" || "$analysis_ts_ok" != "true" ]]; then
      echo "[WARN] timestamp override failed event_id=$event_id event_ok=$event_ts_ok analysis_ok=$analysis_ts_ok at=$at"
      return 1
    fi
  fi

  return 0
}

random_timestamp_in_last_3_months() {
  local now start span offset target
  now="$(date +%s)"
  start="$((now - 90 * 24 * 60 * 60))"
  span="$((now - start))"
  offset="$((RANDOM * 32768 + RANDOM))"
  target="$((start + (offset % (span + 1))))"
  date -u -d "@$target" +"%Y-%m-%dT%H:%M:%SZ"
}

timestamp_with_offset_minutes() {
  local base_iso="$1"
  local offset_min="$2"
  date -u -d "$base_iso +${offset_min} minutes" +"%Y-%m-%dT%H:%M:%SZ"
}

random_gap_minutes() {
  local span
  span="$((MAX_GAP_MINUTES - MIN_GAP_MINUTES + 1))"
  echo "$((MIN_GAP_MINUTES + (RANDOM % span)))"
}

random_severity() {
  local severities=("low" "medium" "high")
  echo "${severities[$RANDOM % ${#severities[@]}]}"
}

build_unique_timestamp() {
  local gap
  gap="$(random_gap_minutes)"
  CURRENT_OFFSET_MINUTES="$((CURRENT_OFFSET_MINUTES + gap))"

  # 간격도 랜덤으로 증가시켜 이벤트 발생 시각이 규칙적이지 않게 만든다.
  timestamp_with_offset_minutes "$TIMESTAMP_BASE" "$CURRENT_OFFSET_MINUTES"
}

main() {
  echo "[INFO] start generating mock rows count=$COUNT"
  echo "[INFO] date mode: $DATE_MODE"

  ORIGINAL_PROVIDER="$(get_active_provider || true)"
  if [[ -n "$ORIGINAL_PROVIDER" ]]; then
    PROVIDER_CAPTURED="true"
    echo "[INFO] current llm provider: $ORIGINAL_PROVIDER"
  fi

  echo "[INFO] set llm provider -> off (bypass llm pipeline)"
  set_active_provider "off"

  fetch_catalogs

  local success=0
  local failed=0
  local timestamp_base_random
  local current_offset

  if [[ "$DATE_MODE" == "random" ]]; then
    # random 모드는 시작시각을 최근 3개월 내에서 랜덤으로 뽑고,
    # 각 이벤트는 랜덤 분 간격 누적으로 분/시 단위 차이와 유일성을 보장한다.
    timestamp_base_random="$(random_timestamp_in_last_3_months)"
    TIMESTAMP_BASE="$timestamp_base_random"
  else
    TIMESTAMP_BASE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  fi

  CURRENT_OFFSET_MINUTES=0

  echo "[INFO] timestamp base: $TIMESTAMP_BASE"
  echo "[INFO] minute gap range: ${MIN_GAP_MINUTES}..${MAX_GAP_MINUTES}"

  for ((i=1; i<=COUNT; i++)); do
    local before_id receiver_status event_id func action random_at

    before_id="$(latest_event_id)"
    receiver_status="$(create_event_via_generator)"

    if [[ "$receiver_status" != "200" && "$receiver_status" != "202" ]]; then
      echo "[WARN] [$i/$COUNT] receiver status=$receiver_status, skip"
      ((failed+=1))
      continue
    fi

    if ! event_id="$(find_new_event_id "$before_id")"; then
      echo "[WARN] [$i/$COUNT] could not detect new event id"
      ((failed+=1))
      continue
    fi

    func="$(pick_func)"
    action="$(pick_action_for_func "$func")"

    random_at="$(build_unique_timestamp)"

    if patch_analysis "$event_id" "$func" "$action" "$i" "$random_at"; then
      if [[ -n "$random_at" ]]; then
        echo "[OK] [$i/$COUNT] event_id=$event_id func=$func severity=$LAST_SEVERITY action=$action at=$random_at"
      else
        echo "[OK] [$i/$COUNT] event_id=$event_id func=$func severity=$LAST_SEVERITY action=$action"
      fi
      ((success+=1))
    else
      echo "[WARN] [$i/$COUNT] event_id=$event_id analysis patch failed"
      ((failed+=1))
    fi
  done

  echo "[DONE] requested=$COUNT success=$success failed=$failed"
}

main
