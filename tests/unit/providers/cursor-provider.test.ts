import { describe, expect, it } from "@rstest/core";

import { CursorProvider } from "../../../skills/agentic-history-search/scripts/providers/cursor-provider.js";
import { resolveScope } from "../../../skills/agentic-history-search/scripts/core/scope.js";

describe("CursorProvider", () => {
  it("uses first available cursor command candidate", async () => {
    const provider = new CursorProvider({
      isCommandAvailable: async (command) => command === "agent",
      runCommand: async (command) => ({
        code: 0,
        timedOut: false,
        stderr: "",
        stdout: JSON.stringify({
          results: [
            {
              snippet: `Used command ${command} in mock history`,
            },
          ],
        }),
      }),
    });

    const result = await provider.queryPast({
      query: "history query",
      scope: resolveScope(),
      timeBudgetMs: 1000,
    });
    expect(result.summary.available).toBe(true);
    expect(result.summary.capabilityNotes.join(" ")).toContain("agent");
    expect(result.response.evidence.length).toBeGreaterThan(0);
  });

  it("uses CURSOR_CLI_COMMAND override when provided", async () => {
    const original = process.env.CURSOR_CLI_COMMAND;
    process.env.CURSOR_CLI_COMMAND = "custom-cursor";

    try {
      const provider = new CursorProvider({
        isCommandAvailable: async (command) => command === "custom-cursor",
        runCommand: async (command) => ({
          code: 0,
          timedOut: false,
          stderr: "",
          stdout: JSON.stringify({
            results: [
              {
                snippet: `Used command ${command} in mock history`,
              },
            ],
          }),
        }),
      });

      const result = await provider.queryPast({
        query: "history query",
        scope: resolveScope(),
        timeBudgetMs: 1000,
      });
      expect(result.summary.available).toBe(true);
      expect(result.summary.capabilityNotes.join(" ")).toContain("custom-cursor");
      expect(result.response.evidence[0]?.snippet).toContain("custom-cursor");
    } finally {
      if (original === undefined) {
        delete process.env.CURSOR_CLI_COMMAND;
      } else {
        process.env.CURSOR_CLI_COMMAND = original;
      }
    }
  });
});
