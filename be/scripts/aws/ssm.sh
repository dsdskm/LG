#!/usr/bin/env bash
#
# SSM Session Manager 로 EC2 인스턴스 접속 (Private Subnet 권장 경로)
#
# 사용법:
#   ./scripts/aws/ssm.sh                       # ASG 의 InService 인스턴스에 접속
#   ./scripts/aws/ssm.sh i-076fc7f8617a39baf   # 특정 인스턴스에 접속
#   ./scripts/aws/ssm.sh -- "sudo docker ps -a"   # 접속 대신 원격 명령 1회 실행 후 종료
#
# 전제:
#   - 인스턴스에 SSM Agent 실행 + IAM Role 에 AmazonSSMManagedInstanceCore 권한
#   - 로컬에 session-manager-plugin 설치 (없으면 안내 출력)
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.sh"
require_aws

# 인자 파싱: "-- <command>" 형태면 원격 1회 실행 모드
REMOTE_CMD=""
TARGET=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --) shift; REMOTE_CMD="$*"; break ;;
    i-*) TARGET="$1"; shift ;;
    *) err "알 수 없는 인자: $1"; exit 1 ;;
  esac
done

# session-manager-plugin 확인 (대화형 세션에 필요)
if [[ -z "$REMOTE_CMD" ]] && ! command -v session-manager-plugin >/dev/null 2>&1; then
  warn "session-manager-plugin 이 없습니다. 대화형 세션이 안 될 수 있어요."
  warn "설치: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
fi

# 대상 인스턴스 결정: 미지정 시 ASG 의 InService 인스턴스
if [[ -z "$TARGET" ]]; then
  log "ASG($ASG_NAME) 의 InService 인스턴스 조회 중..."
  TARGET=$(aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names "$ASG_NAME" \
    --region "$AWS_REGION" \
    --query "AutoScalingGroups[0].Instances[?LifecycleState=='InService'].InstanceId | [0]" \
    --output text)
  if [[ -z "$TARGET" || "$TARGET" == "None" ]]; then
    err "InService 인스턴스를 찾지 못했습니다. ./scripts/aws/status.sh 로 확인하세요."
    exit 1
  fi
  ok "대상 인스턴스: $TARGET"
fi

# SSM 연결 가능(Online) 여부 사전 확인
ping_status=$(aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$TARGET" \
  --region "$AWS_REGION" \
  --query 'InstanceInformationList[0].PingStatus' \
  --output text 2>/dev/null || echo "")
if [[ "$ping_status" != "Online" ]]; then
  warn "SSM PingStatus=$ping_status (Online 이 아님). SSM Agent/권한/부팅 상태를 확인하세요."
  warn "그래도 접속을 시도합니다..."
fi

# 원격 1회 실행 모드
if [[ -n "$REMOTE_CMD" ]]; then
  log "원격 실행 @ $TARGET: $REMOTE_CMD"
  cmd_id=$(aws ssm send-command \
    --instance-ids "$TARGET" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"$REMOTE_CMD\"]" \
    --region "$AWS_REGION" \
    --query 'Command.CommandId' --output text)
  log "CommandId=$cmd_id (결과 대기 중...)"
  aws ssm wait command-executed \
    --command-id "$cmd_id" --instance-id "$TARGET" --region "$AWS_REGION" 2>/dev/null || true
  echo "─── STDOUT ───────────────────────────────"
  aws ssm get-command-invocation \
    --command-id "$cmd_id" --instance-id "$TARGET" --region "$AWS_REGION" \
    --query 'StandardOutputContent' --output text
  errout=$(aws ssm get-command-invocation \
    --command-id "$cmd_id" --instance-id "$TARGET" --region "$AWS_REGION" \
    --query 'StandardErrorContent' --output text)
  if [[ -n "$errout" && "$errout" != "None" ]]; then
    echo "─── STDERR ───────────────────────────────"
    echo "$errout"
  fi
  exit 0
fi

# 대화형 세션
log "SSM 세션 시작: $TARGET"
exec aws ssm start-session --target "$TARGET" --region "$AWS_REGION"
