# Usage Patterns

## Query past implementation rationale

```bash
node skills/agentic-history-search/dist/history-search.mjs \
  --mode query_past \
  --query "How did we implement feature flags and why?"
```

## Query past testing commands

```bash
node skills/agentic-history-search/dist/history-search.mjs \
  --mode query_past \
  --query "What are the test commands we used recently?"
```

## Query specific function understanding

```bash
node skills/agentic-history-search/dist/history-search.mjs \
  --mode query_past \
  --query "What does function parseSessionTrace do?"
```

## List recent sessions

```bash
node skills/agentic-history-search/dist/history-search.mjs \
  --mode recent_sessions \
  --limit 15
```

## Restrict providers

```bash
node skills/agentic-history-search/dist/history-search.mjs \
  --mode query_past \
  --providers claude,codex \
  --query "How did we fix flaky CI?"
```

## Mock mode for local test runs

Build first:

```bash
npm run build
```

Then run:

```bash
node skills/agentic-history-search/dist/history-search.mjs \
  --mode query_past \
  --query "what are test commands" \
  --mock
```
