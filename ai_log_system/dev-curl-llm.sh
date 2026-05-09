#!/usr/bin/env bash
set -euo pipefail

echo "▶️  Sending test log to LLM gateway..."

curl -sS -X POST "http://localhost:3003/llm/analyze/logs" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "batchId": "test_local",
  "source": "manual",
  "logs": [
    {
      "level": "ERROR",
      "message": "Failed to compute path: no valid transform from map to base_link (TF timeout)"
    }
  ]
}
EOF

echo
echo "✅ Request finished."