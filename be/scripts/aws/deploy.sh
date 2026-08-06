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
# 현재 인스턴스 조회 (SSM 실행 가능한 인스턴스 선택)
# --------------------------------------------------------

read -r -a CANDIDATE_INSTANCE_IDS <<<"$(
    aws autoscaling describe-auto-scaling-groups \
        --auto-scaling-group-names "$ASG_NAME" \
        --region "$AWS_REGION" \
        --query "AutoScalingGroups[0].Instances[?LifecycleState=='InService' && HealthStatus=='Healthy'].InstanceId" \
        --output text
)"

if [[ ${#CANDIDATE_INSTANCE_IDS[@]} -eq 0 || "${CANDIDATE_INSTANCE_IDS[0]}" == "None" ]]; then
    err "InService + Healthy 인스턴스를 찾지 못했습니다."
    exit 1
fi

VALID_INSTANCE_IDS=()
for candidate in "${CANDIDATE_INSTANCE_IDS[@]}"; do
    [[ -z "$candidate" || "$candidate" == "None" ]] && continue

    INSTANCE_STATE=$(aws ec2 describe-instances \
        --instance-ids "$candidate" \
        --region "$AWS_REGION" \
        --query "Reservations[0].Instances[0].State.Name" \
        --output text 2>/dev/null || true)

    SSM_PING_STATUS=$(aws ssm describe-instance-information \
        --region "$AWS_REGION" \
        --filters "Key=InstanceIds,Values=$candidate" \
        --query "InstanceInformationList[0].PingStatus" \
        --output text 2>/dev/null || true)

    if [[ "$INSTANCE_STATE" == "running" && "$SSM_PING_STATUS" == "Online" ]]; then
        VALID_INSTANCE_IDS+=("$candidate")
        continue
    fi

    warn "후보 제외: $candidate (state=${INSTANCE_STATE:-unknown}, ssm=${SSM_PING_STATUS:-unknown})"
done

if [[ ${#VALID_INSTANCE_IDS[@]} -eq 0 ]]; then
    err "SSM 실행 가능한 인스턴스를 찾지 못했습니다. (조건: state=running, ssm=Online)"
    err "ASG=${ASG_NAME} 의 인스턴스 상태/SSM 에이전트를 확인하세요."
    exit 1
fi

if [[ ${#VALID_INSTANCE_IDS[@]} -ne 1 ]]; then
    err "현재 유효 인스턴스 수=${#VALID_INSTANCE_IDS[@]} (1대 고정 위반)"
    err "ASG=${ASG_NAME} 의 desired/min/max 를 1로 맞추고 다시 실행하세요."
    err "감지된 인스턴스: ${VALID_INSTANCE_IDS[*]}"
    exit 1
fi

INSTANCE_ID="${VALID_INSTANCE_IDS[0]}"

ok "배포 대상 인스턴스 수: ${#VALID_INSTANCE_IDS[@]}"
ok "배포 대상: ${VALID_INSTANCE_IDS[*]}"

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

if [[ "$STATUS" != "Success" ]]; then
    err "배포 실패: $INSTANCE_ID (Status=$STATUS)"
    exit 1
fi

ok "이미지 교체 완료 (1대: $INSTANCE_ID)"