#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8765}"
echo "NO WAY OUT → http://127.0.0.1:${PORT}/"
exec python3 -m http.server "$PORT"
