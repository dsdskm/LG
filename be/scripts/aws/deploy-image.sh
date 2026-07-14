#!/usr/bin/env bash
#
# 이미지만 교체하는 배포 (인스턴스 교체 X → 도커 볼륨/DB 유지)
#
#   deploy.sh 는 ASG 인스턴스를 종료/재생성하므로 컨테이너 볼륨(DB)이 사라진다.
#   이 스크립트는 인스턴스를 그대로 두고, ECR 최신 이미지를 pull 한 뒤
#   `docker compose up -d` 로 앱 컨테이너만 재생성한다.
#   → Postgres 컨테이너(*_db)와 named volume 은 그대로 유지되어 데이터가 보존된다.
#
# 동작:
#   1) (기본) 이미지 빌드 → ECR 푸시  (--no-build 로 생략 가능)
#   2) ASG 의 InService 인스턴스에 SSM 으로 원격 명령 실행:
#        ECR 로그인 → compose pull → compose up -d
#
# 사용법:
#   ./scripts/aws/deploy-image.sh                 # 빌드+푸시 후 이미지 교체 배포
#   ./scripts/aws/deploy-image.sh --no-build      # 빌드 생략, 이미 푸시된 이미지로 재배포
#   ./scripts/aws/deploy-image.sh i-0abc...        # 대상 인스턴스 직접 지정
#
# 전제:
#   - 인스턴스가 user-data.sh 로 부팅되어 /opt/rsp-qa-ai/compose.qa.yml 보유
#   - 인스턴스 IAM Role 에 SSM + ECR read 권한
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.sh"
require_aws

APP_DIR="/opt/rsp-qa-ai"
COMPOSE="$APP_DIR/compose.qa.yml"
ENV_FILE="$APP_DIR/.image.env"

DO_BUILD=1
TARGET=""
for a in "$@"; do
  case "$a" in
    --no-build) DO_BUILD=0 ;;
    i-*) TARGET="$a" ;;
    *) err "알 수 없는 인자: $a"; exit 1 ;;
  esac
done

# ── 1) 빌드 + 푸시 ───────────────────────────────────────────
if [[ "$DO_BUILD" == "1" ]]; then
  log "이미지 빌드 + ECR 푸시 (build-push.sh)"
  "$SCRIPT_DIR/build-push.sh"
else
  warn "--no-build → 빌드/푸시 생략 (ECR 의 ${IMAGE_TAG} 태그를 그대로 사용)"
fi

# ── 2) 대상 인스턴스 결정 ────────────────────────────────────
if [[ -z "$TARGET" ]]; then
  log "ASG($ASG_NAME) 의 InService 인스턴스 조회 중..."
  TARGET=$(aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names "$ASG_NAME" \
    --region "$AWS_REGION" \
    --query "AutoScalingGroups[0].Instances[?LifecycleState=='InService'].InstanceId | [0]" \
    --output text)
fi
if [[ -z "$TARGET" || "$TARGET" == "None" ]]; then
  err "InService 인스턴스를 찾지 못했습니다. ./scripts/aws/status.sh 로 확인하세요."
  exit 1
fi
ok "대상 인스턴스: $TARGET"

# ── 3) 원격 명령: 로그인 → pull → up -d (볼륨/DB 유지) ───────
# up -d 는 이미지가 바뀐 컨테이너(앱)만 재생성하고, 변경 없는 DB 컨테이너는 그대로 둔다.
#
# ⚠ 중요: compose 프로젝트명을 systemd(WorkingDirectory=/opt/rsp-qa-ai)와 동일하게 맞춰야
#   같은 named volume(rsp-qa-ai_*_db_data)에 붙는다. cd + -p 로 고정한다.
#   (cwd 가 다르면 다른 프로젝트명 → 새 빈 볼륨이 생겨 DB 가 비어 보인다.)
PROJECT="${COMPOSE_PROJECT_NAME:-rsp-qa-ai}"
# 이미지를 pull 한 뒤, 이미지에 동봉된 compose 정본(/opt/app/compose.qa.yml)을 꺼내
# ${COMPOSE} 로 갱신한다 → 이미지 교체만으로도 compose 변경(env/logging 등)이 반영된다.
REMOTE_CMD="set -e; cd ${APP_DIR}; \
aws ecr get-login-password --region ${AWS_REGION} | sudo docker login --username AWS --password-stdin ${ECR_REGISTRY}; \
sudo docker pull ${IMAGE_REMOTE}; \
cid=\$(sudo docker create ${IMAGE_REMOTE}); sudo docker cp \$cid:/opt/app/compose.qa.yml ${COMPOSE}; sudo docker rm \$cid; \
sudo docker compose -p ${PROJECT} --env-file ${ENV_FILE} -f ${COMPOSE} up -d; \
sudo docker image prune -f; \
sudo docker compose -p ${PROJECT} -f ${COMPOSE} ps"

log "원격 이미지 교체 실행 @ $TARGET"
cmd_id=$(aws ssm send-command \
  --instance-ids "$TARGET" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"$REMOTE_CMD\"]" \
  --region "$AWS_REGION" \
  --query 'Command.CommandId' --output text)
log "CommandId=$cmd_id (결과 대기 중...)"
aws ssm wait command-executed \
  --command-id "$cmd_id" --instance-id "$TARGET" --region "$AWS_REGION" 2>/dev/null || true

status=$(aws ssm get-command-invocation \
  --command-id "$cmd_id" --instance-id "$TARGET" --region "$AWS_REGION" \
  --query 'Status' --output text)

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

if [[ "$status" == "Success" ]]; then
  ok "이미지 교체 배포 완료 (인스턴스/DB 유지)."
  log "헬스 확인: ./scripts/aws/health-check.sh"
else
  err "원격 명령 상태: $status — 위 로그를 확인하세요."
  exit 1
fi
