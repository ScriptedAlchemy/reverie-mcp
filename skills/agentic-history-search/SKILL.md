---
name: agentic-history-search
description: Use this skill when a user asks what was done previously in this project (implementation decisions, test commands, prior fixes, function history). The skill searches conversation history with CLI-based agents (Claude/Codex/Cursor), scoped to the current project, and returns citation-backed answers.
---

# Agentic History Search

Use this skill for project-memory questions, such as:
- "what are the test commands?"
- "how did we implement xyz and why?"
- "what does function x do?"
- "when did we fix this bug before?"

## Hard guardrails

1. Use conversation history evidence only.
2. If evidence is weak, explicitly say so.
3. Always return citations when answering.
4. Keep scope project-specific unless user asks otherwise.

## Execution

Use the launcher (compiled bundle required):

```bash
bash skills/agentic-history-search/scripts/run-history-search.sh --mode query_past --query "<user question>"
```

Recent sessions helper mode:

```bash
bash skills/agentic-history-search/scripts/run-history-search.sh --mode recent_sessions --limit 10
```

The launcher requires `dist/history-search.cjs`. Build first with:

```bash
npm run build
```

## Output expectations

For `query_past`, include:
- concise answer grounded in history
- citations with provider + snippet + source ids when available
- confidence + insufficientEvidence flag
- provider diagnostics

For `recent_sessions`, include:
- ordered recent sessions
- provider diagnostics

## References

- Detailed output contract: `references/OUTPUT_SCHEMA.md`
- Provider notes and capability behavior: `references/PROVIDER_COMPATIBILITY.md`
- Usage patterns and examples: `references/USAGE_PATTERNS.md`
