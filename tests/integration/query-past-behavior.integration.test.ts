import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("history-search query_past behavior", () => {
  it("merges mock evidence across selected providers", () => {
    const result = spawnSync(
      "node",
      [
        "skills/agentic-history-search/dist/history-search.cjs",
        "--mode",
        "query_past",
        "--query",
        "what are the test commands",
        "--providers",
        "claude,codex",
        "--mock",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.providersUsed).toHaveLength(2);
    expect(payload.citations.length).toBeGreaterThanOrEqual(2);
    expect(payload.insufficientEvidence).toBe(false);
  });

  it("returns insufficient evidence when mock query requests no evidence", () => {
    const result = spawnSync(
      "node",
      [
        "skills/agentic-history-search/dist/history-search.cjs",
        "--mode",
        "query_past",
        "--query",
        "no evidence for this query",
        "--mock",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.insufficientEvidence).toBe(true);
    expect(payload.citations).toHaveLength(0);
    expect(payload.answer).toContain("could not find sufficient history evidence");
  });
});
