#!/usr/bin/env bash
set -euo pipefail

# Run from script location (main directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[run.sh] Clearing caches..."
rm -rf .turbo
rm -rf node_modules/.cache
find apps packages -type d \( -name .next -o -name .turbo \) -prune -exec rm -rf {} + 2>/dev/null || true

echo "[run.sh] Starting pnpm dev..."
pnpm dev
