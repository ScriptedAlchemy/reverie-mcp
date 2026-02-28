import { describe, expect, it } from "@rstest/core";

import { ClaudeProvider } from "../../../skills/agentic-history-search/scripts/providers/claude-provider.js";
import { resolveScope } from "../../../skills/agentic-history-search/scripts/core/scope.js";

describe("ClaudeProvider", () => {
  it("returns unavailable when claude command is missing", async () => {
    const provider = new ClaudeProvider({
      isCommandAvailable: async () => false,
      runCommand: async () => {
        throw new Error("should not be called");
      },
    });

    const result = await provider.queryPast({
      query: "test command history",
      scope: resolveScope(),
      timeBudgetMs: 1000,
    });
    expect(result.summary.available).toBe(false);
    expect(result.summary.used).toBe(false);
    expect(result.response.evidence).toHaveLength(0);
  });

  it("marks timeout status when command exceeds budget", async () => {
    const provider = new ClaudeProvider({
      isCommandAvailable: async () => true,
      runCommand: async () => ({
        code: null,
        stdout: "",
        stderr: "timed out",
        timedOut: true,
      }),
    });

    const result = await provider.queryPast({
      query: "how did we fix auth",
      scope: resolveScope(),
      timeBudgetMs: 1000,
    });
    expect(result.summary.status).toBe("timeout");
  });
});
