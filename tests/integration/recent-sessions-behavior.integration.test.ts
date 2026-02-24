import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("history-search recent_sessions behavior", () => {
  it("aggregates sessions for selected providers", () => {
    const result = spawnSync(
      "node",
      [
        "dist/history-search.cjs",
        "--mode",
        "recent_sessions",
        "--providers",
        "claude,cursor",
        "--limit",
        "10",
        "--mock",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.providersUsed).toHaveLength(2);
    expect(payload.sessions).toHaveLength(2);
    const providers = payload.sessions.map((s: { provider: string }) => s.provider);
    expect(providers).toContain("claude");
    expect(providers).toContain("cursor");
  });
});
