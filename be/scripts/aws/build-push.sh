#!/usr/bin/env bash
#
# unified-service Docker 이미지 빌드 → ECR 푸시
#
# 사용법:
#   ./scripts/aws/build-push.sh                 # 빌드 후 푸시
#   IMAGE_TAG=v1.2.3 ./scripts/aws/build-push.sh
#   NO_PUSH=1 ./scripts/aws/build-push.sh        # 빌드만 (푸시 생략)
#
# 어느 위치에서 실행해도 동작합니다(인자 위치로 스크립트 경로를 먼저 확정).
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"   # 스크립트 위치를 먼저 고정 (cd 전에)
source "$SCRIPT_DIR/config.sh"
cd "$SCRIPT_DIR/../.."                         # repo 루트로 이동 (Dockerfile 위치)

require_aws
command -v docker >/dev/null 2>&1 || { err "docker 가 필요합니다."; exit 1; }

log "ECR 로그인: $ECR_REGISTRY"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
ok "ECR 로그인 완료"

# EC2(t3.medium)는 x86_64(amd64). Apple Silicon(arm64)에서 빌드해도 amd64 이미지가
# 나오도록 플랫폼을 강제한다. (arm64 이미지는 amd64 인스턴스에서 exec format error)
TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"
log "이미지 빌드: $IMAGE_LOCAL (platform=$TARGET_PLATFORM)"
# 환경별 설정은 빌드가 아니라 런타임(.env / compose environment)에서 주입한다.
DOCKER_BUILDKIT=1 docker build --platform "$TARGET_PLATFORM" -t "$IMAGE_LOCAL" .
ok "빌드 완료"

log "태그 지정: $IMAGE_LOCAL → $IMAGE_REMOTE"
docker tag "$IMAGE_LOCAL" "$IMAGE_REMOTE"

if [[ "${NO_PUSH:-0}" == "1" ]]; then
  warn "NO_PUSH=1 → 푸시를 건너뜁니다."
  exit 0
fi

log "푸시: $IMAGE_REMOTE"
docker push "$IMAGE_REMOTE"
ok "푸시 완료: $IMAGE_REMOTE"

echo
log "다음 단계: ./scripts/aws/deploy-image.sh : 이미지 교체."
log "다음 단계: ./scripts/aws/deploy.sh : 인스턴스 교체"
