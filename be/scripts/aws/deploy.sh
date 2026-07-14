#!/usr/bin/env bash
#
# 인스턴스 교체로 배포
#   ASG 의 현재 인스턴스를 종료하면, ASG 가 최신 이미지를 받은 새 인스턴스로 자동 교체합니다.
#   (desired capacity 는 줄이지 않습니다 → --should-decrement-desired-capacity false)
#
# 사용법:
#   ./scripts/aws/deploy.sh                       # ASG 의 모든 현재 인스턴스 교체
#   ./scripts/aws/deploy.sh i-0f724c83b243f983e   # 특정 인스턴스만 교체
#   ./scripts/aws/deploy.sh --yes                 # 확인 프롬프트 없이 진행
#
set -euo pipefail
source "$(dirname "$0")/config.sh"
require_aws

AUTO_YES=0
TARGET_IDS=()
for arg in "$@"; do
  case "$arg" in
    --yes|-y) AUTO_YES=1 ;;
    i-*)      TARGET_IDS+=("$arg") ;;
    *)        err "알 수 없는 인자: $arg"; exit 1 ;;
  esac
done

# 대상 인스턴스 결정
if [[ ${#TARGET_IDS[@]} -eq 0 ]]; then
  log "ASG($ASG_NAME) 의 현재 인스턴스 조회 중..."
  read -r -a TARGET_IDS <<< "$(asg_instance_ids)"
fi

if [[ ${#TARGET_IDS[@]} -eq 0 ]]; then
  err "교체할 인스턴스를 찾지 못했습니다."
  exit 1
fi

warn "교체(종료) 대상 인스턴스: ${TARGET_IDS[*]}"
warn "ELB Health Check(Grace 600초) 통과 후 트래픽이 새 인스턴스로 전환됩니다."

if [[ "$AUTO_YES" != "1" ]]; then
  read -r -p "진행할까요? [y/N] " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || { log "취소되었습니다."; exit 0; }
fi

for id in "${TARGET_IDS[@]}"; do
  log "인스턴스 종료 요청: $id"
  aws autoscaling terminate-instance-in-auto-scaling-group \
    --instance-id "$id" \
    --no-should-decrement-desired-capacity \
    --region "$AWS_REGION" \
    --output table
done

ok "배포(인스턴스 교체) 요청 완료."
log "진행 상황: ./scripts/aws/status.sh  /  새 인스턴스 헬스: ./scripts/aws/health-check.sh"
