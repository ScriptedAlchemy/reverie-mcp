import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveScope, scopeRelevance } from "../../skills/agentic-history-search/scripts/core/scope.js";

describe("scope resolver", () => {
  it("resolves scope for current repository", () => {
    const scope = resolveScope(path.resolve("."));
    expect(scope.cwd.length).toBeGreaterThan(0);
    expect(scope.scopePath.length).toBeGreaterThan(0);
    expect(scope.projectName.length).toBeGreaterThan(0);
    expect(scope.aliases.length).toBeGreaterThan(0);
    expect(scope.confidence).toBeGreaterThan(0.5);
  });

  it("scores relevance for matching project text", () => {
    const scope = resolveScope(path.resolve("."));
    const score = scopeRelevance(
      `Discussion for ${scope.projectName} located at ${scope.scopePath}`,
      scope,
    );
    expect(score).toBeGreaterThan(0.3);
  });
});
