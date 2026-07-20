#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.sh"

MODE="${1:-image}"

require_aws
require_docker

REPO_ROOT="$SCRIPT_DIR/../.."

cd "$REPO_ROOT"

log "ECR 로그인"

aws ecr get-login-password \
    --region "$AWS_REGION" \
    | docker login \
        --username AWS \
        --password-stdin \
        "$ECR_REGISTRY"

ok "ECR 로그인 완료"

log "Docker Build"

DOCKER_BUILDKIT=1 docker build \
    --platform "$TARGET_PLATFORM" \
    -t "$IMAGE_LOCAL" \
    .

ok "빌드 완료"

log "Docker Tag"

docker tag "$IMAGE_LOCAL" "$IMAGE_REMOTE"

ok "태그 완료"

log "Docker Push"

docker push "$IMAGE_REMOTE"

ok "푸시 완료"

# --------------------------------------------------------
# 현재 인스턴스 조회
# --------------------------------------------------------

INSTANCE_ID=$(aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names "$ASG_NAME" \
    --region "$AWS_REGION" \
    --query "AutoScalingGroups[0].Instances[?LifecycleState=='InService'].InstanceId | [0]" \
    --output text)

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
    err "InService 인스턴스를 찾지 못했습니다."
    exit 1
fi

ok "대상 인스턴스: $INSTANCE_ID"

# --------------------------------------------------------
# instance 모드
# --------------------------------------------------------

if [[ "$MODE" == "instance" ]]; then

    warn "인스턴스 교체 모드"

    aws autoscaling terminate-instance-in-auto-scaling-group \
        --instance-id "$INSTANCE_ID" \
        --no-should-decrement-desired-capacity \
        --region "$AWS_REGION"

    ok "인스턴스 종료 요청 완료"
    ok "ASG가 새 인스턴스를 생성합니다."

    exit 0
fi

# --------------------------------------------------------
# 기본(image) 모드
# --------------------------------------------------------

log "이미지 교체 배포"

REMOTE_CMD="set -e;
cd ${APP_DIR};
aws ecr get-login-password --region ${AWS_REGION} | sudo docker login --username AWS --password-stdin ${ECR_REGISTRY};
sudo docker pull ${IMAGE_REMOTE};
cid=\$(sudo docker create ${IMAGE_REMOTE});
sudo docker cp \$cid:/opt/app/compose.qa.yml ${COMPOSE_FILE};
sudo docker rm \$cid;
sudo docker compose -p ${COMPOSE_PROJECT_NAME} --env-file ${ENV_FILE} -f ${COMPOSE_FILE} up -d;
sudo docker image prune -f;"

CMD_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"$REMOTE_CMD\"]" \
    --region "$AWS_REGION" \
    --query "Command.CommandId" \
    --output text)

log "SSM CommandId=$CMD_ID"

aws ssm wait command-executed \
    --command-id "$CMD_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$AWS_REGION" \
    2>/dev/null || true

STATUS=$(aws ssm get-command-invocation \
    --command-id "$CMD_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$AWS_REGION" \
    --query 'Status' \
    --output text)

if [[ "$STATUS" == "Success" ]]; then
    ok "이미지 교체 완료"
else
    err "배포 실패 (Status=$STATUS)"
    exit 1
fi