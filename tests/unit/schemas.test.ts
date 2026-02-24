import { describe, expect, it } from "@rstest/core";

import {
  QueryPastInputSchema,
  RecentSessionsInputSchema,
} from "../../skills/agentic-history-search/scripts/core/schemas.js";

describe("schema validation", () => {
  it("parses valid query_past input", () => {
    const parsed = QueryPastInputSchema.parse({
      mode: "query_past",
      query: "how did we implement feature x",
      providers: ["claude"],
      maxCitations: 3,
    });
    expect(parsed.mode).toBe("query_past");
    expect(parsed.providers).toEqual(["claude"]);
  });

  it("rejects invalid provider names", () => {
    expect(() =>
      QueryPastInputSchema.parse({
        mode: "query_past",
        query: "test",
        providers: ["bad-provider"],
      }),
    ).toThrow();
  });

  it("parses recent_sessions input", () => {
    const parsed = RecentSessionsInputSchema.parse({
      mode: "recent_sessions",
      limit: 5,
    });
    expect(parsed.limit).toBe(5);
  });
});
