#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ "${1:-}" == "-f" ]]; then
	RESET_DB_CONTAINERS=1 ./be/scripts/local/run.sh
	exit 0
fi

if [[ "$#" -gt 0 ]]; then
	echo "Usage: ./run_be.sh [-f]"
	exit 1
fi

./be/scripts/local/run.sh
