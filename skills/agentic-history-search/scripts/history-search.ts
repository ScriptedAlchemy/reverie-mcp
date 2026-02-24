#!/usr/bin/env node
import { rankEvidence, rankSessions } from "./core/ranking.js";
import { resolveScope } from "./core/scope.js";
import {
  ProviderNameSchema,
  QueryPastInputSchema,
  QueryPastOutputSchema,
  RecentSessionsInputSchema,
  RecentSessionsOutputSchema,
  type Citation,
  type EvidenceItem,
  type ProviderName,
  type QueryPastInput,
  type RecentSession,
  type RecentSessionsInput,
} from "./core/schemas.js";
import { ClaudeProvider } from "./providers/claude-provider.js";
import { CodexProvider } from "./providers/codex-provider.js";
import { CursorProvider } from "./providers/cursor-provider.js";
import type { HistoryProvider } from "./providers/base.js";

type ParsedArgs = Record<string, string | boolean | undefined>;

const providers: Record<ProviderName, HistoryProvider> = {
  claude: new ClaudeProvider(),
  codex: new CodexProvider(),
  cursor: new CursorProvider(),
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const parsed: ParsedArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    i += 1;
  }
  return parsed;
};

const parseProviderList = (raw?: string): ProviderName[] | undefined => {
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .map((value) => ProviderNameSchema.parse(value));
};

const inferMode = (args: ParsedArgs): "query_past" | "recent_sessions" =>
  args.mode === "recent_sessions" ? "recent_sessions" : "query_past";

const parseInput = (args: ParsedArgs): QueryPastInput | RecentSessionsInput => {
  const mode = inferMode(args);
  if (mode === "recent_sessions") {
    return RecentSessionsInputSchema.parse({
      mode,
      scopePath: typeof args["scope-path"] === "string" ? args["scope-path"] : undefined,
      providers:
        typeof args.providers === "string" ? parseProviderList(args.providers) : undefined,
      limit: typeof args.limit === "string" ? Number(args.limit) : undefined,
      timeBudgetMs:
        typeof args["time-budget-ms"] === "string"
          ? Number(args["time-budget-ms"])
          : undefined,
    });
  }
  return QueryPastInputSchema.parse({
    mode,
    query: typeof args.query === "string" ? args.query : "",
    scopePath: typeof args["scope-path"] === "string" ? args["scope-path"] : undefined,
    providers: typeof args.providers === "string" ? parseProviderList(args.providers) : undefined,
    maxCitations:
      typeof args["max-citations"] === "string" ? Number(args["max-citations"]) : undefined,
    timeBudgetMs:
      typeof args["time-budget-ms"] === "string"
        ? Number(args["time-budget-ms"])
        : undefined,
  });
};

const synthesizeAnswer = (query: string, rankedEvidence: EvidenceItem[]): string => {
  if (!rankedEvidence.length) {
    return `I could not find sufficient history evidence to answer: "${query}".`;
  }

  const top = rankedEvidence.slice(0, 3);
  const bullets = top
    .map(
      (item, index) =>
        `${index + 1}. [${item.provider}] ${item.snippet.replace(/\s+/g, " ").slice(0, 280)}`,
    )
    .join("\n");

  return `Based only on matching conversation history, here are the strongest findings:\n${bullets}`;
};

const toCitations = (rankedEvidence: EvidenceItem[], maxCitations: number): Citation[] =>
  rankedEvidence.slice(0, maxCitations).map((item) => ({
    provider: item.provider,
    sourceId: item.sourceId,
    snippet: item.snippet.slice(0, 500),
    timestamp: item.timestamp,
    sessionTitle: item.sessionTitle,
  }));

const mockQueryResult = (input: QueryPastInput) => {
  const scope = resolveScope(input.scopePath);
  const syntheticEvidence: EvidenceItem[] = [
    {
      provider: "claude",
      snippet: `Mock history says query "${input.query}" was solved using npm test and targeted vitest commands.`,
      sourceId: "mock-session-1",
      timestamp: new Date().toISOString(),
      sessionTitle: "Mock debugging session",
      metadata: {},
      relevanceScore: 0,
    },
  ];
  const ranked = rankEvidence(input.query, syntheticEvidence, scope);
  return QueryPastOutputSchema.parse({
    answer: synthesizeAnswer(input.query, ranked),
    citations: toCitations(ranked, input.maxCitations ?? 5),
    confidence: ranked.length ? Math.min(0.95, ranked[0].relevanceScore + 0.2) : 0.15,
    insufficientEvidence: ranked.length === 0,
    scopeDiagnostics: scope,
    providersUsed: [
      {
        provider: "claude",
        available: true,
        used: true,
        status: "ok",
        latencyMs: 1,
        capabilityNotes: ["mock mode"],
      },
    ],
  });
};

const runQueryPast = async (input: QueryPastInput, mockMode: boolean) => {
  if (mockMode) return mockQueryResult(input);

  const scope = resolveScope(input.scopePath);
  const providerNames = input.providers ?? (Object.keys(providers) as ProviderName[]);
  const selected = providerNames.map((name) => providers[name]);

  const responses = await Promise.allSettled(
    selected.map((provider) =>
      provider.queryPast({
        query: input.query,
        scope,
        timeBudgetMs: input.timeBudgetMs ?? 12_000,
      }),
    ),
  );

  const evidence: EvidenceItem[] = [];
  const summaries = responses.map((result, idx) => {
    if (result.status === "fulfilled") {
      evidence.push(...result.value.response.evidence);
      return result.value.summary;
    }
    return {
      provider: selected[idx].name,
      available: true,
      used: true,
      status: "error",
      latencyMs: 0,
      capabilityNotes: [],
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });

  const ranked = rankEvidence(input.query, evidence, scope);
  const output = {
    answer: synthesizeAnswer(input.query, ranked),
    citations: toCitations(ranked, input.maxCitations ?? 5),
    confidence: ranked.length ? Math.min(0.98, ranked[0].relevanceScore + 0.12) : 0.12,
    insufficientEvidence: ranked.length < 1,
    scopeDiagnostics: scope,
    providersUsed: summaries,
  };
  return QueryPastOutputSchema.parse(output);
};

const runRecentSessions = async (input: RecentSessionsInput, mockMode: boolean) => {
  const scope = resolveScope(input.scopePath);
  if (mockMode) {
    return RecentSessionsOutputSchema.parse({
      sessions: [
        {
          provider: "claude",
          sessionId: "mock-session-recent",
          timestamp: new Date().toISOString(),
          title: "Mock recent session",
          summary: "Mocked recent session summary.",
          projectHint: scope.projectName,
        },
      ],
      scopeDiagnostics: scope,
      providersUsed: [
        {
          provider: "claude",
          available: true,
          used: true,
          status: "ok",
          latencyMs: 1,
          capabilityNotes: ["mock mode"],
        },
      ],
    });
  }

  const providerNames = input.providers ?? (Object.keys(providers) as ProviderName[]);
  const selected = providerNames.map((name) => providers[name]);
  const responses = await Promise.allSettled(
    selected.map((provider) =>
      provider.listRecent({
        scope,
        limit: input.limit ?? 10,
        timeBudgetMs: input.timeBudgetMs ?? 12_000,
      }),
    ),
  );

  const sessions: RecentSession[] = [];
  const summaries = responses.map((result, idx) => {
    if (result.status === "fulfilled") {
      sessions.push(...result.value.response.sessions);
      return result.value.summary;
    }
    return {
      provider: selected[idx].name,
      available: true,
      used: true,
      status: "error",
      latencyMs: 0,
      capabilityNotes: [],
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });

  const ranked = rankSessions(sessions, scope).slice(0, input.limit ?? 10);
  return RecentSessionsOutputSchema.parse({
    sessions: ranked,
    scopeDiagnostics: scope,
    providersUsed: summaries,
  });
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const mockMode = Boolean(args.mock);
  const input = parseInput(args);
  if (input.mode === "recent_sessions") {
    const output = await runRecentSessions(input, mockMode);
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    return;
  }
  const output = await runQueryPast(input, mockMode);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `${JSON.stringify(
      {
        error: "history_search_failed",
        message,
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
});
