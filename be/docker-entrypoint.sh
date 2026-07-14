#!/bin/sh
###############################################################################
# unified-service 엔트리포인트
#   실행할 서비스를 다음 우선순위로 결정한다.
#     1) 환경변수 SERVICE_NAME
#     2) 첫 번째 인자 (docker run/CMD)
#   둘 다 없으면 사용법을 출력하고 종료한다.
#
#   예)
#     docker run -e SERVICE_NAME=event_analyzer unified-service
#     docker run unified-service report_manager
###############################################################################
set -e

SVC="${SERVICE_NAME:-$1}"

case "$SVC" in
  event_receiver|event_analyzer|action_runner|report_manager|config_manager|llm_gateway|ai_chat_service)
    MAIN="apps/${SVC}/dist/main.js"
    if [ ! -f "$MAIN" ]; then
      echo "✗ 빌드 산출물이 없습니다: $MAIN" >&2
      exit 1
    fi
    echo "▶ starting service: ${SVC} ($MAIN)"
    exec node "$MAIN"
    ;;
  demo)
    # Next.js 앱: dist/main.js 대신 next start 로 기동 (포트 4000)
    if [ ! -d "apps/demo/.next" ]; then
      echo "✗ 빌드 산출물이 없습니다: apps/demo/.next" >&2
      exit 1
    fi
    echo "▶ starting service: demo (next start :4000)"
    exec pnpm --filter demo start
    ;;
  "")
    echo "✗ 실행할 서비스가 지정되지 않았습니다. SERVICE_NAME 또는 인자를 주세요." >&2
    echo "  유효값: event_receiver event_analyzer action_runner report_manager config_manager llm_gateway" >&2
    exit 1
    ;;
  *)
    echo "✗ 알 수 없는 서비스: $SVC" >&2
    echo "  유효값: event_receiver event_analyzer action_runner report_manager config_manager llm_gateway" >&2
    exit 1
    ;;
esac
