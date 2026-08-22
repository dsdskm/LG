#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
./be/scripts/db/db-tunnel-codespace.sh
