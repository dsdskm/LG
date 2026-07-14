#!/usr/bin/env bash
#
# 배포 상태 점검: ASG 인스턴스 + 각 Target Group 헬스
#
# 사용법:
#   ./scripts/aws/status.sh
#
set -euo pipefail
source "$(dirname "$0")/config.sh"
require_aws

log "Auto Scaling Group: $ASG_NAME"
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$ASG_NAME" \
  --region "$AWS_REGION" \
  --query 'AutoScalingGroups[0].Instances[].{Instance:InstanceId,AZ:AvailabilityZone,Lifecycle:LifecycleState,Health:HealthStatus}' \
  --output table

echo
log "Target Group 헬스"
for entry in "${SERVICES[@]}"; do
  IFS=':' read -r name port tg <<< "$entry"

  tg_arn=$(aws elbv2 describe-target-groups \
    --names "$tg" \
    --region "$AWS_REGION" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>/dev/null || echo "")

  if [[ -z "$tg_arn" || "$tg_arn" == "None" ]]; then
    err "$name ($tg): Target Group 을 찾지 못했습니다."
    continue
  fi

  printf "\n${_c_blue}▶ %s (%s, :%s)${_c_reset}\n" "$name" "$tg" "$port"
  aws elbv2 describe-target-health \
    --target-group-arn "$tg_arn" \
    --region "$AWS_REGION" \
    --query 'TargetHealthDescriptions[].{Target:Target.Id,Port:Target.Port,State:TargetHealth.State,Reason:TargetHealth.Reason}' \
    --output table
done
