import { spawnSync } from "node:child_process";

import { describe, expect, it } from "@rstest/core";

describe("history-search recent_sessions integration (mock mode)", () => {
  it("returns sessions with diagnostics", () => {
    const result = spawnSync(
      "node",
      [
        "skills/agentic-history-search/dist/history-search.cjs",
        "--mode",
        "recent_sessions",
        "--limit",
        "3",
        "--mock",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(Array.isArray(payload.sessions)).toBe(true);
    expect(payload.sessions.length).toBeGreaterThan(0);
    expect(payload.scopeDiagnostics.projectName.length).toBeGreaterThan(0);
    expect(payload.providersUsed.length).toBeGreaterThan(0);
  });
});
