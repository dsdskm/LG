#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APPS_DIR="$ROOT_DIR/apps"

usage() {
  cat <<'EOF'
사용법:
  ./dev-build.sh                    # 전체 빌드
  ./dev-build.sh 전체               # 전체 빌드
  ./dev-build.sh all                # 전체 빌드
  ./dev-build.sh <앱이름>           # 해당 앱만 빌드
  ./dev-build.sh <앱1> <앱2> ...    # 지정 앱들 빌드
EOF
}

if [[ ! -d "$APPS_DIR" ]]; then
  echo "apps 디렉터리를 찾을 수 없습니다: $APPS_DIR"
  exit 1
fi

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

# 인자가 없으면 전체 빌드
if [[ $# -eq 0 ]]; then
  echo "전체 빌드를 시작합니다..."
  cd "$ROOT_DIR"
  pnpm build
  exit 0
fi

# '전체' 또는 'all' 입력 시 전체 빌드
if [[ "$1" == "전체" || "$1" == "all" ]]; then
  echo "전체 빌드를 시작합니다..."
  cd "$ROOT_DIR"
  pnpm build
  exit 0
fi

filters=()

for app_name in "$@"; do
  # 한국어 설명 단어가 함께 들어오면 무시 (예: ./dev-build.sh 전체 빌드)
  if [[ "$app_name" == "빌드" ]]; then
    continue
  fi

  if [[ ! -d "$APPS_DIR/$app_name" ]]; then
    echo "존재하지 않는 앱입니다: $app_name"
    echo "사용 가능한 앱 목록:"
    ls -1 "$APPS_DIR"
    exit 1
  fi

  filters+=("--filter=./apps/$app_name")
done

if [[ ${#filters[@]} -eq 0 ]]; then
  echo "빌드할 앱이 지정되지 않았습니다."
  exit 1
fi

echo "선택 앱 빌드를 시작합니다: $*"
cd "$ROOT_DIR"
pnpm exec dotenv -- turbo run build "${filters[@]}"
