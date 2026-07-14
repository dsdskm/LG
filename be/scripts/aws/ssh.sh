#!/usr/bin/env bash
#
# EC2 인스턴스 SSH 접속 (디버깅용)
#   인스턴스는 Private Subnet 에 위치하므로, Public IP 가 없으면 접속이 안 될 수 있습니다.
#   그 경우 SSM Session Manager(aws ssm start-session) 사용을 권장합니다.
#
# 사용법:
#   ./scripts/aws/ssh.sh                       # ASG 의 첫 인스턴스에 접속
#   ./scripts/aws/ssh.sh i-0f724c83b243f983e   # 특정 인스턴스에 접속
#   ./scripts/aws/ssh.sh <host-or-ip>          # 호스트/IP 직접 지정
#   SSM=1 ./scripts/aws/ssh.sh i-xxxx          # SSM Session Manager 로 접속
#
set -euo pipefail
source "$(dirname "$0")/config.sh"
require_aws

target="${1:-}"

# 인자가 없으면 ASG 첫 인스턴스 사용
if [[ -z "$target" ]]; then
  log "ASG($ASG_NAME) 첫 인스턴스 조회 중..."
  read -r -a ids <<< "$(asg_instance_ids)"
  [[ ${#ids[@]} -gt 0 ]] || { err "인스턴스를 찾지 못했습니다."; exit 1; }
  target="${ids[0]}"
fi

# SSM 모드
if [[ "${SSM:-0}" == "1" ]]; then
  [[ "$target" == i-* ]] || { err "SSM 모드에는 인스턴스 ID(i-...)가 필요합니다."; exit 1; }
  log "SSM Session Manager 접속: $target"
  exec aws ssm start-session --target "$target" --region "$AWS_REGION"
fi

# 인스턴스 ID 면 Public IP(없으면 Private IP) 조회
if [[ "$target" == i-* ]]; then
  log "인스턴스 IP 조회: $target"
  ip=$(aws ec2 describe-instances \
    --instance-ids "$target" \
    --region "$AWS_REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)
  if [[ -z "$ip" || "$ip" == "None" ]]; then
    ip=$(aws ec2 describe-instances \
      --instance-ids "$target" \
      --region "$AWS_REGION" \
      --query 'Reservations[0].Instances[0].PrivateIpAddress' \
      --output text)
    warn "Public IP 없음 → Private IP($ip) 사용. VPN/Bastion 또는 SSM(SSM=1)이 필요할 수 있습니다."
  fi
  target="$ip"
fi

[[ -f "$SSH_KEY" ]] || { err "SSH 키를 찾을 수 없습니다: $SSH_KEY"; exit 1; }

log "SSH 접속: $SSH_USER@$target (key=$SSH_KEY)"
exec ssh -i "$SSH_KEY" "$SSH_USER@$target"
