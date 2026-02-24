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
  - Cursor CLI (`agent`, `cursor-agent`, or `cursor`)
- Returns structured output with citations, confidence, and provider diagnostics.

## Build / bundle (rslib)

```bash
npm install
npm run build
```

Bundled outputs are written to `skills/agentic-history-search/dist/` and include:
- `history-search.cjs` (CommonJS)
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

- Requires bundled CLI: `skills/agentic-history-search/dist/history-search.cjs`
- Build before running: `npm run build`

## Validate

```bash
bash scripts/validate-skill.sh
```

## Install skill into local agent skill directories

```bash
bash scripts/install-skill.sh all symlink
```

The installer ensures the compiled skill bundle exists (builds automatically if missing).

Arguments:
- target: `codex|claude|cursor|all`
- install mode: `symlink|copy`
- dry-run (optional third arg): `true|false`

## Tests

```bash
npm test
```