#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

BUNDLED_CLI="$REPO_ROOT/dist/history-search.cjs"
SOURCE_CLI="$SKILL_DIR/scripts/history-search.ts"

if [[ -f "$BUNDLED_CLI" ]]; then
  exec node "$BUNDLED_CLI" "$@"
fi

if command -v npx >/dev/null 2>&1; then
  exec npx tsx "$SOURCE_CLI" "$@"
fi

echo "No bundled CLI found and npx is unavailable for tsx fallback." >&2
echo "Expected bundle at: $BUNDLED_CLI" >&2
echo "Expected source at: $SOURCE_CLI" >&2
exit 1
