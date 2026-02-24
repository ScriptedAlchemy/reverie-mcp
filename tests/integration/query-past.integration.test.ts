import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("history-search query_past integration (mock mode)", () => {
  it("returns citation-backed output", () => {
    const script = path.resolve(
      "skills/agentic-history-search/scripts/history-search.ts",
    );
    const result = spawnSync(
      "npx",
      [
        "tsx",
        script,
        "--mode",
        "query_past",
        "--query",
        "what are the test commands",
        "--mock",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.answer).toContain("history");
    expect(Array.isArray(payload.citations)).toBe(true);
    expect(payload.citations.length).toBeGreaterThan(0);
    expect(payload.providersUsed.length).toBeGreaterThan(0);
  });
});
