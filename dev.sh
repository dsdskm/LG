#!/bin/bash
# 기존 Vite 프로세스 종료 + env 자동 설정 + 캐시 제거 후 dev 서버 시작

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN_DIR="$ROOT_DIR/main"
ENV_FILE="$MAIN_DIR/packages/apis/.env.local"

ensure_public_ports_in_codespaces() {
  if [[ -z "${CODESPACE_NAME:-}" ]]; then
    return 0
  fi

  if ! command -v gh >/dev/null 2>&1; then
    echo "⚠️ gh 명령이 없어 포트 public 전환을 건너뜁니다."
    return 0
  fi

  if ! gh auth status >/dev/null 2>&1; then
    echo "⚠️ gh 인증이 없어 포트 public 전환을 건너뜁니다."
    return 0
  fi

  local domain
  domain="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"

  echo "🌐 Codespaces 포트 visibility를 public으로 설정 중..."
  gh codespace ports visibility -c "$CODESPACE_NAME" \
    3001:public 3002:public 3004:public 3005:public 3007:public 3008:public \
    5173:public 5174:public 5175:public 5176:public 5177:public 5178:public \
    5179:public 5180:public 5181:public 5182:public 5183:public 5184:public \
    >/dev/null 2>&1 || echo "⚠️ 일부 포트 public 전환 실패 (실행은 계속)"

  echo "✅ 공개 URL 예시: https://${CODESPACE_NAME}-5173.${domain}"
}

echo "🔪 기존 Vite 프로세스 종료 중..."
kill $(lsof -t -i:5173 -i:5174 -i:5175 -i:5176 -i:5177 -i:5178 -i:5179 -i:5180 -i:5181 -i:5182 -i:5183 -i:5184) 2>/dev/null
sleep 1

# Codespaces 환경이면 공개 URL로 자동 설정
if [[ -n "$CODESPACE_NAME" ]]; then
  DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  BASE="https://${CODESPACE_NAME}"

  echo "🌐 Codespaces 감지 - API URL 자동 설정 중..."
  cat > "$ENV_FILE" <<EOF
VITE_AUTH_API_BASE_URL=https://dm.qa.hcrsp.com
VITE_CMS_API_BASE_URL=https://cms.qa.hcrsp.com
VITE_OTA_API_BASE_URL=https://ota.qa.hcrsp.com
VITE_AUTO_REFRESH_TOKEN=Y

VITE_EVENT_RECEIVER_URL=${BASE}-3001.${DOMAIN}
VITE_EVENT_ANALYZER_URL=${BASE}-3002.${DOMAIN}
VITE_ACTION_RUNNER_URL=${BASE}-3004.${DOMAIN}
VITE_REPORT_MANAGER_URL=${BASE}-3005.${DOMAIN}
VITE_AI_CHAT_SERVICE_URL=${BASE}-3007.${DOMAIN}
VITE_CONFIG_MANAGER_URL=${BASE}-3008.${DOMAIN}
EOF
  echo "✅ API URL 설정 완료 (Codespaces: $CODESPACE_NAME)"
else
  echo "💻 로컬 환경 - localhost URL 사용"
  cat > "$ENV_FILE" <<EOF
VITE_AUTH_API_BASE_URL=https://dm.qa.hcrsp.com
VITE_CMS_API_BASE_URL=https://cms.qa.hcrsp.com
VITE_OTA_API_BASE_URL=https://ota.qa.hcrsp.com
VITE_AUTO_REFRESH_TOKEN=Y

VITE_EVENT_RECEIVER_URL=http://localhost:3001
VITE_EVENT_ANALYZER_URL=http://localhost:3002
VITE_ACTION_RUNNER_URL=http://localhost:3004
VITE_REPORT_MANAGER_URL=http://localhost:3005
VITE_AI_CHAT_SERVICE_URL=http://localhost:3007
VITE_CONFIG_MANAGER_URL=http://localhost:3008
EOF
fi

echo "🧹 Vite 캐시 제거 중..."
find "$MAIN_DIR" -name ".vite" -type d | xargs rm -rf 2>/dev/null

ensure_public_ports_in_codespaces

echo "🚀 dev 서버 시작..."
cd "$MAIN_DIR"
pnpm --filter main dev -- --host 0.0.0.0 --port 5173
