#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_NAME="agentic-history-search"
SKILL_SRC="$ROOT_DIR/skills/$SKILL_NAME"

TARGET="${1:-all}"      # codex|claude|cursor|all
INSTALL_MODE="${2:-symlink}" # symlink|copy
DRY_RUN="${3:-false}"   # true|false

if [[ ! -d "$SKILL_SRC" ]]; then
  echo "Skill source not found: $SKILL_SRC" >&2
  exit 1
fi

install_to() {
  local label="$1"
  local base="$2"
  local dst="$base/$SKILL_NAME"

  echo "[$label] target: $dst"
  if [[ "$DRY_RUN" == "true" ]]; then
    return 0
  fi

  mkdir -p "$base"
  rm -rf "$dst"
  if [[ "$INSTALL_MODE" == "copy" ]]; then
    cp -R "$SKILL_SRC" "$dst"
  else
    ln -s "$SKILL_SRC" "$dst"
  fi
}

case "$TARGET" in
  codex)
    install_to "codex" "$HOME/.agents/skills"
    ;;
  claude)
    install_to "claude" "$HOME/.claude/skills"
    ;;
  cursor)
    install_to "cursor" "$HOME/.cursor/skills"
    ;;
  all)
    install_to "codex" "$HOME/.agents/skills"
    install_to "claude" "$HOME/.claude/skills"
    install_to "cursor" "$HOME/.cursor/skills"
    ;;
  *)
    echo "Unknown target: $TARGET (expected codex|claude|cursor|all)" >&2
    exit 1
    ;;
esac

echo "Install complete."
