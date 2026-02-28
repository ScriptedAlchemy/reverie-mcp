import { spawnSync } from "node:child_process";

import { describe, expect, it } from "@rstest/core";

describe("history-search query_past integration (mock mode)", () => {
  it("returns citation-backed output", () => {
    const result = spawnSync(
      "node",
      [
        "skills/agentic-history-search/dist/history-search.mjs",
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
