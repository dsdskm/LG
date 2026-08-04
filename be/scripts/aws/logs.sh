#!/usr/bin/env bash
#
# CloudWatch Logs 확인
#
# 사용법:
#   ./scripts/aws/logs.sh                     # 서비스(로그 스트림) 목록
#   ./scripts/aws/logs.sh <service>           # 해당 서비스 실시간 로그 (--follow)
#   ./scripts/aws/logs.sh <service> 30m       # 최근 30분부터 실시간 로그
#
# 예:
#   ./scripts/aws/logs.sh event_analyzer
#
set -euo pipefail
source "$(dirname "$0")/config.sh"
require_aws

cmd="${1:-list}"

case "$cmd" in
  list|-l|--list)
    log "서비스(로그 스트림) 목록 (group=$LOG_GROUP)"
    aws logs describe-log-streams \
      --log-group-name "$LOG_GROUP" \
      --region "$AWS_REGION" \
      --order-by LastEventTime \
      --descending \
      --query 'logStreams[].{Stream:logStreamName,LastEvent:lastEventTimestamp}' \
      --output table
    ;;
  *)
    service="$cmd"
    since="${2:-5m}"
    log "실시간 로그: $LOG_GROUP / $service (since $since)"
    aws logs tail "$LOG_GROUP" \
      --log-stream-name-prefix "$service" \
      --since "$since" \
      --follow \
      --region "$AWS_REGION"
    ;;
esac
