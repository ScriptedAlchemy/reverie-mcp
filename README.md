# agentic-history-search skill (TypeScript)

Portable Agent Skill for project-scoped conversation-history search across CLI agents.

## What it does

- Answers project-memory questions from history evidence:
  - test commands used before
  - implementation rationale
  - prior fixes and function context
- Uses agentic CLIs/protocols where available:
  - Claude CLI (`claude`)
  - Codex CLI (`codex exec --json`)
  - Cursor CLI (`agent` by default; override via `CURSOR_CLI_COMMAND` / `CURSOR_CLI_COMMANDS`)
- Returns structured output with citations, confidence, and provider diagnostics.

## Build / bundle (rslib)

For normal skill usage, no local build is required. This repo ships prebuilt artifacts in the skill directory.

If you are developing the skill and need to regenerate artifacts:

```bash
npm install
npm run build
```

Bundled outputs are written to `skills/agentic-history-search/dist/` and include:
- `history-search.js` + `history-search.mjs` (ESM)

## Run

### Query past (preferred launcher)

```bash
bash skills/agentic-history-search/scripts/run-history-search.sh --mode query_past --query "what are the test commands?"
```

### Recent sessions (preferred launcher)

```bash
bash skills/agentic-history-search/scripts/run-history-search.sh --mode recent_sessions --limit 10
```

Launcher behavior:

- Requires bundled CLI: `skills/agentic-history-search/dist/history-search.mjs`
- No build required for consumers when using this repository checkout.

## Validate

```bash
bash scripts/validate-skill.sh
```

## Install skill into local agent skill directories

```bash
bash scripts/install-skill.sh all symlink
```

The installer requires the prebuilt bundle shipped in this repository.
For Codex compatibility, the installer writes to both:
- `~/.agents/skills`
- `~/.codex/skills`

Arguments:
- target: `codex|claude|cursor|all`
- install mode: `symlink|copy`
- dry-run (optional third arg): `true|false`

## Tests

```bash
npm test
```

The test suite runs with **Rstest** (`rstest run`) in the same Rstack ecosystem as Rslib, with
`@rstest/adapter-rslib` to inherit relevant Rslib config.