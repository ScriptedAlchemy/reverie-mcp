#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BUNDLED_CLI="$SKILL_DIR/dist/history-search.mjs"

if [[ -f "$BUNDLED_CLI" ]]; then
  exec node "$BUNDLED_CLI" "$@"
fi

echo "Bundled CLI not found." >&2
echo "Expected bundle at: $BUNDLED_CLI" >&2
echo "Run 'npm run build' from repository root before invoking this launcher." >&2
exit 1
