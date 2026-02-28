# Provider Compatibility

This skill attempts three providers in parallel where available.

## Claude provider

- Command probe: `claude`
- Query invocation: `claude -p "<prompt>" --output-format json`
- Best for: Claude Code conversation history workflows.

## Codex provider

- Command probe: `codex`
- Query invocation: `codex exec --json "<prompt>"`
- Best for: Codex sessions and app-server-compatible workflows.

## Cursor provider

- Command probe default: `agent`
- Optional override: set `CURSOR_CLI_COMMAND` (single command) or `CURSOR_CLI_COMMANDS` (comma-separated list) to customize probe order.
- Query invocation: `<command> -p "<prompt>" --output-format json`
- Best for: Cursor headless/CLI-accessible history workflows.

## Capability behavior

- If a provider command is not present, the skill marks it `available=false` and continues.
- Provider failures/timeouts do not fail the entire run.
- Results include per-provider diagnostics to make capability status explicit.

## Skill install path notes

- Codex installs are written to both `~/.agents/skills` and `~/.codex/skills` for compatibility with multiple Codex skill discovery patterns.
