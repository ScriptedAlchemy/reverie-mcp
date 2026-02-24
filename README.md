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

Bundled outputs are written to `dist/` and can be executed with Node.

## Run

### Query past

```bash
node dist/history-search.cjs --mode query_past --query "what are the test commands?"
```

### Recent sessions

```bash
node dist/history-search.cjs --mode recent_sessions --limit 10
```

### Development fallback (direct TS execution)

```bash
npx tsx skills/agentic-history-search/scripts/history-search.ts --mode query_past --query "how did we implement xyz and why?"
```

## Validate

```bash
bash scripts/validate-skill.sh
```

## Install skill into local agent skill directories

```bash
bash scripts/install-skill.sh all symlink
```

Arguments:
- target: `codex|claude|cursor|all`
- install mode: `symlink|copy`
- dry-run (optional third arg): `true|false`

## Tests

```bash
npm test
```