#!/usr/bin/env bash
#
# CloudWatch Logs 확인
#
# 사용법:
#   ./scripts/aws/logs.sh            # 로그 그룹 목록 조회
#   ./scripts/aws/logs.sh tail       # 실시간 tail (--follow)
#   ./scripts/aws/logs.sh tail 30m   # 최근 30분부터 tail
#
set -euo pipefail
source "$(dirname "$0")/config.sh"
require_aws

cmd="${1:-list}"

case "$cmd" in
  list)
    log "로그 그룹 목록 (prefix=$LOG_GROUP_PREFIX)"
    aws logs describe-log-groups \
      --log-group-name-prefix "$LOG_GROUP_PREFIX" \
      --region "$AWS_REGION" \
      --query 'logGroups[].{LogGroup:logGroupName,Retention:retentionInDays,StoredMB:storedBytes}' \
      --output table
    ;;
  tail)
    since="${2:-5m}"
    log "실시간 로그: $LOG_GROUP_PREFIX (since $since)"
    aws logs tail "$LOG_GROUP_PREFIX" \
      --since "$since" \
      --follow \
      --region "$AWS_REGION"
    ;;
  *)
    err "사용법: $0 [list|tail [since]]"
    exit 1
    ;;
esac
