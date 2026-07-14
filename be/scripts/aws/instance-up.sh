#!/usr/bin/env bash
#
# [EC2 인스턴스에서 실행] ECR 최신 이미지를 받아 서비스별 컨테이너를 기동한다.
#   - 인스턴스의 IAM Role(AmazonEC2ContainerRegistryReadOnly)로 ECR 로그인
#   - deploy/compose.qa.yml 로 pull → up -d
#
# 전제:
#   - 인스턴스에 docker / docker compose plugin 설치
#   - 레포(또는 최소 deploy/compose.qa.yml + .env)가 인스턴스에 존재
#   - 시크릿이 필요하면 compose 파일과 같은 디렉터리에 .env 배치(선택)
#
# 사용:
#   ./scripts/aws/instance-up.sh            # pull 후 up -d
#   ./scripts/aws/instance-up.sh down       # 전체 중지/삭제
#   ./scripts/aws/instance-up.sh logs       # 로그 follow
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.sh"
require_aws

cd "$SCRIPT_DIR/../.."     # repo 루트
COMPOSE_FILE="deploy/compose.qa.yml"
export IMAGE_REMOTE

[[ -f "$COMPOSE_FILE" ]] || { err "compose 파일이 없습니다: $COMPOSE_FILE"; exit 1; }
command -v docker >/dev/null 2>&1 || { err "docker 가 필요합니다."; exit 1; }

cmd="${1:-up}"
case "$cmd" in
  up)
    log "ECR 로그인: $ECR_REGISTRY"
    aws ecr get-login-password --region "$AWS_REGION" \
      | docker login --username AWS --password-stdin "$ECR_REGISTRY"
    log "이미지 pull: $IMAGE_REMOTE"
    docker compose -f "$COMPOSE_FILE" pull
    log "컨테이너 기동 (up -d)"
    docker compose -f "$COMPOSE_FILE" up -d
    ok "기동 완료. 상태: docker compose -f $COMPOSE_FILE ps"
    ;;
  down)
    log "컨테이너 중지/삭제"
    docker compose -f "$COMPOSE_FILE" down
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100
    ;;
  ps|status)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  *)
    err "사용법: $0 [up|down|logs|ps]"
    exit 1
    ;;
esac
