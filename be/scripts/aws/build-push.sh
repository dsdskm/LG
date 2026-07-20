#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../.."

AWS_ACCOUNT_ID="398838060384"
AWS_REGION="ap-northeast-2"
ECR_REPOSITORY="ota-qa-1000-200-300-ota-demo-abbc6699"

IMAGE_TAG="${IMAGE_TAG:-latest}"

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

IMAGE_LOCAL="unified-service:${IMAGE_TAG}"
IMAGE_REMOTE="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

log() {
    echo "[INFO] $*"
}

ok() {
    echo "[ OK ] $*"
}

err() {
    echo "[ERROR] $*" >&2
}

warn() {
    echo "[WARN] $*"
}

command -v aws >/dev/null 2>&1 || {
    err "aws cli 가 필요합니다."
    exit 1
}

command -v docker >/dev/null 2>&1 || {
    err "docker 가 필요합니다."
    exit 1
}

aws sts get-caller-identity >/dev/null || {
    err "AWS 인증이 없습니다."
    exit 1
}

log "ECR 로그인: $ECR_REGISTRY"

aws ecr get-login-password \
    --region "$AWS_REGION" \
    | docker login \
        --username AWS \
        --password-stdin \
        "$ECR_REGISTRY"

ok "ECR 로그인 완료"

TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"

log "이미지 빌드: $IMAGE_LOCAL"

DOCKER_BUILDKIT=1 docker build \
    --platform "$TARGET_PLATFORM" \
    -t "$IMAGE_LOCAL" \
    .

ok "빌드 완료"

log "태그 지정"

docker tag "$IMAGE_LOCAL" "$IMAGE_REMOTE"

ok "태그 완료"

if [[ "${NO_PUSH:-0}" == "1" ]]; then
    warn "NO_PUSH=1 -> Push 생략"
    exit 0
fi

log "푸시: $IMAGE_REMOTE"

docker push "$IMAGE_REMOTE"

ok "푸시 완료"

echo
echo "이미지 URI"
echo "$IMAGE_REMOTE"
echo