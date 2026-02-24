import { describe, expect, it } from "vitest";

import { CodexProvider } from "../../../skills/agentic-history-search/scripts/providers/codex-provider.js";
import { resolveScope } from "../../../skills/agentic-history-search/scripts/core/scope.js";

describe("CodexProvider", () => {
  it("parses evidence from JSON output", async () => {
    const provider = new CodexProvider({
      isCommandAvailable: async () => true,
      runCommand: async () => ({
        code: 0,
        timedOut: false,
        stderr: "",
        stdout: JSON.stringify({
          results: [
            {
              snippet: "Used npm test -- auth suite",
              sourceId: "codex-session-1",
              timestamp: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      }),
    });

    const result = await provider.queryPast({
      query: "test commands",
      scope: resolveScope(),
      timeBudgetMs: 1000,
    });
    expect(result.summary.status).toBe("ok");
    expect(result.response.evidence[0]?.sourceId).toBe("codex-session-1");
  });
});
