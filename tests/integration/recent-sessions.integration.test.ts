import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("history-search recent_sessions integration (mock mode)", () => {
  it("returns sessions with diagnostics", () => {
    const script = path.resolve(
      "skills/agentic-history-search/scripts/history-search.ts",
    );
    const result = spawnSync(
      "npx",
      ["tsx", script, "--mode", "recent_sessions", "--limit", "3", "--mock"],
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
