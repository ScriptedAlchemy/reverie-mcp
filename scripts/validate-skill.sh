#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_FILE="$ROOT_DIR/skills/agentic-history-search/SKILL.md"

echo "[validate] checking SKILL frontmatter"
if ! rg -q "^name:\s*agentic-history-search$" "$SKILL_FILE"; then
  echo "Missing required name frontmatter in SKILL.md" >&2
  exit 1
fi
if ! rg -q "^description:\s*" "$SKILL_FILE"; then
  echo "Missing required description frontmatter in SKILL.md" >&2
  exit 1
fi

echo "[validate] typecheck"
(cd "$ROOT_DIR" && npm run typecheck)

echo "[validate] build bundle"
(cd "$ROOT_DIR" && npm run build)

echo "[validate] smoke test (query_past mock mode)"
(cd "$ROOT_DIR" && node dist/history-search.cjs --mode query_past --query "what are test commands" --mock >/dev/null)

echo "[validate] smoke test (recent_sessions mock mode)"
(cd "$ROOT_DIR" && node dist/history-search.cjs --mode recent_sessions --limit 5 --mock >/dev/null)

echo "Validation passed."
