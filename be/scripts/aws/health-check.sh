#!/usr/bin/env bash
#
# 2단계 헬스체크
#
# 1. ASG InService EC2 인스턴스 내부에서 Docker 컨테이너 상태 확인
# 2. 1번이 정상이면 외부(ALB)에서 각 서비스 /health 호출 확인
#
# 사용법:
#   ./scripts/aws/health-check.sh
#   ./scripts/aws/health-check.sh <alb-host>
#
# 환경변수:
#   SCHEME=https
#   TIMEOUT=10
#   HEALTH_PATH=/health
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.sh"

require_aws
require_curl

HOST="${1:-${ALB_DNS:-}}"
TIMEOUT="${TIMEOUT:-10}"
SCHEME="${SCHEME:-https}"
HEALTH_PATH="${HEALTH_PATH:-/health}"

if [[ -z "$HOST" ]]; then
    err "ALB_DNS 값이 비어 있습니다."
    err "config.sh 에 ALB_DNS 를 설정하거나 아래처럼 실행하세요."
    err "./scripts/aws/health-check.sh rsp-qa-ai-app-alb-1274790156.ap-northeast-2.elb.amazonaws.com"
    exit 1
fi

# =========================================================
# 대상 EC2 조회
# =========================================================

log "ASG($ASG_NAME) 의 InService+Healthy 인스턴스 조회 중..."

read -r -a CANDIDATE_INSTANCE_IDS <<<"$(aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names "$ASG_NAME" \
    --region "$AWS_REGION" \
    --query "AutoScalingGroups[0].Instances[?LifecycleState=='InService' && HealthStatus=='Healthy'].InstanceId" \
    --output text)"

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
    err "헬스체크 가능한 인스턴스를 찾지 못했습니다. (조건: state=running, ssm=Online)"
    exit 1
fi

ok "VM 점검 대상 인스턴스 수: ${#VALID_INSTANCE_IDS[@]}"
ok "VM 점검 대상: ${VALID_INSTANCE_IDS[*]}"

# =========================================================
# 1. VM 내부 Docker 컨테이너 체크
# =========================================================

echo
echo "=========================================================="
echo "1. Docker Container Health Check inside VM"
echo "=========================================================="

REMOTE_SCRIPT=$(cat <<EOF
#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$APP_DIR"
COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME"
COMPOSE_FILE="$COMPOSE_FILE"

echo "[INFO] APP_DIR=\$APP_DIR"
echo "[INFO] COMPOSE_PROJECT_NAME=\$COMPOSE_PROJECT_NAME"
echo "[INFO] COMPOSE_FILE=\$COMPOSE_FILE"
echo

if [[ ! -d "\$APP_DIR" ]]; then
    echo "[ERROR] APP_DIR not found: \$APP_DIR"
    exit 1
fi

cd "\$APP_DIR"

echo "--- docker compose ps ---"
sudo docker compose -p "\$COMPOSE_PROJECT_NAME" -f "\$COMPOSE_FILE" ps || true
echo

echo "--- container health/status ---"

fail=0

containers=\$(sudo docker ps -a \
    --filter "label=com.docker.compose.project=\$COMPOSE_PROJECT_NAME" \
    --format '{{.Names}}')

if [[ -z "\$containers" ]]; then
    echo "[ERROR] compose project container not found: \$COMPOSE_PROJECT_NAME"
    echo
    echo "--- all containers ---"
    sudo docker ps -a
    exit 1
fi

for c in \$containers; do
    running=\$(sudo docker inspect --format='{{.State.Running}}' "\$c")
    status=\$(sudo docker inspect --format='{{.State.Status}}' "\$c")
    health=\$(sudo docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "\$c")

    if [[ "\$running" == "true" ]] && { [[ "\$health" == "healthy" ]] || [[ "\$health" == "no-healthcheck" ]]; }; then
        printf '[ OK ] %-45s status=%s health=%s\n' "\$c" "\$status" "\$health"
    else
        printf '[FAIL] %-45s status=%s health=%s\n' "\$c" "\$status" "\$health"
        fail=1
    fi
done

exit "\$fail"
EOF
)

REMOTE_SCRIPT_B64=$(printf "%s" "$REMOTE_SCRIPT" | base64 | tr -d '\n')
REMOTE_CMD="echo '$REMOTE_SCRIPT_B64' | base64 -d | bash"

CMD_ID=$(aws ssm send-command \
    --instance-ids "${VALID_INSTANCE_IDS[@]}" \
    --document-name "AWS-RunShellScript" \
        --parameters "commands=$REMOTE_CMD" \
    --region "$AWS_REGION" \
    --query "Command.CommandId" \
    --output text)

log "SSM CommandId=$CMD_ID"

VM_FAIL=0
for target in "${VALID_INSTANCE_IDS[@]}"; do
    aws ssm wait command-executed \
        --command-id "$CMD_ID" \
        --instance-id "$target" \
        --region "$AWS_REGION" \
        2>/dev/null || true

    DOCKER_STATUS=$(aws ssm get-command-invocation \
        --command-id "$CMD_ID" \
        --instance-id "$target" \
        --region "$AWS_REGION" \
        --query "Status" \
        --output text)

    DOCKER_STDOUT=$(aws ssm get-command-invocation \
        --command-id "$CMD_ID" \
        --instance-id "$target" \
        --region "$AWS_REGION" \
        --query "StandardOutputContent" \
        --output text)

    DOCKER_STDERR=$(aws ssm get-command-invocation \
        --command-id "$CMD_ID" \
        --instance-id "$target" \
        --region "$AWS_REGION" \
        --query "StandardErrorContent" \
        --output text)

    echo
    echo "--- INSTANCE: $target ---"
    echo "$DOCKER_STDOUT"

    if [[ -n "$DOCKER_STDERR" && "$DOCKER_STDERR" != "None" ]]; then
        echo
        echo "─── STDERR ($target) ─────────────────────"
        echo "$DOCKER_STDERR"
    fi

    if [[ "$DOCKER_STATUS" != "Success" ]]; then
        VM_FAIL=1
        err "VM 내부 Docker 컨테이너 체크 실패: $target (Status=$DOCKER_STATUS)"
    else
        ok "VM 내부 Docker 컨테이너 정상: $target"
    fi
done

if [[ "$VM_FAIL" != "0" ]]; then
    echo
    err "VM 내부 Docker 컨테이너 체크 실패 인스턴스가 있어 외부 헬스체크를 수행하지 않습니다."
    exit 1
fi

ok "VM 내부 Docker 컨테이너 정상 (${#VALID_INSTANCE_IDS[@]}대)"

# =========================================================
# 2. 외부 ALB Health Check
# =========================================================

echo
echo "=========================================================="
echo "2. External Health Check via ALB"
echo "=========================================================="

log "헬스체크 대상: ${SCHEME}://${HOST}"
log "HEALTH_PATH=${HEALTH_PATH}"
echo

curl_opts=()
if [[ "$SCHEME" == "https" ]]; then
    curl_opts+=(-k)
fi

FAIL=0

for entry in "${SERVICES[@]}"; do
    IFS=':' read -r NAME PORT _TG <<< "$entry"

    URL="${SCHEME}://${HOST}:${PORT}${HEALTH_PATH}"

    CODE="000"

    if CODE=$(curl \
        -s \
        "${curl_opts[@]}" \
        -o /dev/null \
        -w "%{http_code}" \
        --max-time "$TIMEOUT" \
        "$URL"); then
        :
    else
        CODE="000"
    fi

    if [[ "$CODE" == "200" ]]; then
        ok "$(printf '%-25s %-6s' "$NAME" "$PORT") $URL -> $CODE"
    else
        err "$(printf '%-25s %-6s' "$NAME" "$PORT") $URL -> $CODE"
        FAIL=1
    fi
done

echo
echo "=========================================================="

if [[ "$FAIL" == "0" ]]; then
    ok "모든 헬스체크 정상"
    exit 0
else
    err "외부 호출 기준 비정상 서비스가 있습니다."
    exit 1
fi