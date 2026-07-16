#!/bin/bash

set -euo pipefail

MAIN_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🧹 Vite 캐시 제거 중..."
find "$MAIN_DIR" -name ".vite" -type d -prune -exec rm -rf {} + 2>/dev/null || true

echo "🚀 dev 서버 시작..."
cd "$MAIN_DIR"
pnpm dev
