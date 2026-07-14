#!/usr/bin/env bash
#
# ALB 경유 각 서비스 /health 엔드포인트 점검
#
# 사용법:
#   ./scripts/aws/health-check.sh            # ALB DNS 로 점검
#   ./scripts/aws/health-check.sh <host>     # 임의 호스트(예: localhost)로 점검
#   HEALTH_PATH=/ ./scripts/aws/health-check.sh   # 경로를 / 로 변경
#
set -euo pipefail
source "$(dirname "$0")/config.sh"

HOST="${1:-$ALB_DNS}"
TIMEOUT="${TIMEOUT:-10}"
# ALB 리스너가 HTTPS 이므로 기본 https. 평문 HTTP 로 바꾸려면 SCHEME=http 로 실행.
SCHEME="${SCHEME:-https}"

# https 일 때는 ALB DNS 가 인증서 CN/SAN 과 맞지 않으므로 인증서 검증을 생략(-k).
curl_opts=()
[[ "$SCHEME" == "https" ]] && curl_opts+=(-k)

log "헬스체크 대상: ${SCHEME}://$HOST  (path=$HEALTH_PATH)"
echo

fail=0
for entry in "${SERVICES[@]}"; do
  IFS=':' read -r name port _tg <<< "$entry"
  url="${SCHEME}://${HOST}:${port}${HEALTH_PATH}"
  code=$(curl -s "${curl_opts[@]}" -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$url" || echo "000")
  if [[ "$code" == "200" ]]; then
    ok  "$(printf '%-16s %-6s' "$name" "$port") $url → $code"
  else
    err "$(printf '%-16s %-6s' "$name" "$port") $url → $code"
    fail=1
  fi
done

echo
if [[ "$fail" == "0" ]]; then
  ok "모든 서비스 정상(200)."
else
  err "일부 서비스가 비정상입니다. status.sh / logs.sh 로 확인하세요."
  exit 1
fi
