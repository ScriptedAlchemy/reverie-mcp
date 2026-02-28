import { describe, expect, it } from "@rstest/core";

import { rankEvidence } from "../../skills/agentic-history-search/scripts/core/ranking.js";
import { resolveScope } from "../../skills/agentic-history-search/scripts/core/scope.js";
import type { EvidenceItem } from "../../skills/agentic-history-search/scripts/core/schemas.js";

describe("rankEvidence", () => {
  it("ranks lexical and scoped matches higher", () => {
    const scope = resolveScope();
    const query = "test commands rstest";
    const evidence: EvidenceItem[] = [
      {
        provider: "claude",
        snippet: `In ${scope.projectName}, run rstest for targeted tests`,
        sourceId: "a",
        metadata: {},
        relevanceScore: 0,
      },
      {
        provider: "cursor",
        snippet: "Unrelated note about CSS color updates",
        sourceId: "b",
        metadata: {},
        relevanceScore: 0,
      },
    ];

    const ranked = rankEvidence(query, evidence, scope);
    expect(ranked[0]?.sourceId).toBe("a");
    expect(ranked[0]?.relevanceScore).toBeGreaterThan(ranked[1]?.relevanceScore ?? 0);
  });
});
