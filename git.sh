#!/usr/bin/env bash

set -euo pipefail

COMMIT_MSG="${1:-patch}"
REMOTE="${2:-origin}"
BRANCH="${3:-$(git rev-parse --abbrev-ref HEAD)}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[ERROR] Git repository가 아닙니다."
  exit 1
fi

# add * 대신 추적/삭제 변경까지 포함하도록 add -A 사용
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
else
  echo "[INFO] 커밋할 변경사항이 없습니다."
  exit 0
fi

git commit -m "$COMMIT_MSG"
git push "$REMOTE" "$BRANCH"

echo "[OK] pushed: $REMOTE/$BRANCH"
