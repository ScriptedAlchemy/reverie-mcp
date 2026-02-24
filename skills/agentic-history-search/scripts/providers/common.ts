import type {
  EvidenceItem,
  NormalizedProviderResponse,
  ProviderName,
  ProviderRunSummary,
  RecentSession,
} from "../core/schemas.js";

export const extractJsonObjects = (raw: string): unknown[] => {
  const text = raw.trim();
  if (!text) return [];

  const parsed: unknown[] = [];
  try {
    parsed.push(JSON.parse(text));
    return parsed;
  } catch {
    // continue to line-based parsing
  }

  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      // ignore non-json lines
    }
  }
  return parsed;
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const parseEvidenceFromObject = (provider: ProviderName, obj: unknown): EvidenceItem[] => {
  if (!obj || typeof obj !== "object") return [];
  const data = obj as Record<string, unknown>;

  if (Array.isArray(data.results)) {
    return data.results
      .map((result): EvidenceItem | undefined => {
        if (!result || typeof result !== "object") return undefined;
        const record = result as Record<string, unknown>;
        const snippet =
          asString(record.snippet) ??
          asString(record.content) ??
          asString(record.answer) ??
          asString(record.text);
        if (!snippet) return undefined;
        return {
          provider,
          snippet,
          sourceId: asString(record.sourceId) ?? asString(record.id),
          timestamp: asString(record.timestamp) ?? asString(record.ts),
          sessionTitle: asString(record.title) ?? asString(record.sessionTitle),
          metadata: record,
          relevanceScore: 0,
        };
      })
      .filter((value): value is EvidenceItem => Boolean(value));
  }

  const maybeContent =
    asString(data.answer) ?? asString(data.content) ?? asString(data.text) ?? asString(data.message);
  if (!maybeContent) return [];
  return [
    {
      provider,
      snippet: maybeContent,
      sourceId: asString(data.id),
      timestamp: asString(data.timestamp) ?? asString(data.ts),
      sessionTitle: asString(data.title),
      metadata: data,
      relevanceScore: 0,
    },
  ];
};

const parseSessionsFromObject = (provider: ProviderName, obj: unknown): RecentSession[] => {
  if (!obj || typeof obj !== "object") return [];
  const data = obj as Record<string, unknown>;
  if (!Array.isArray(data.sessions)) return [];

  return data.sessions
    .map((item): RecentSession | undefined => {
      if (!item || typeof item !== "object") return undefined;
      const record = item as Record<string, unknown>;
      const title = asString(record.title) ?? asString(record.summary) ?? "Untitled session";
      return {
        provider,
        sessionId: asString(record.sessionId) ?? asString(record.id),
        timestamp: asString(record.timestamp) ?? asString(record.ts),
        title,
        summary: asString(record.summary) ?? asString(record.description),
        projectHint: asString(record.project) ?? asString(record.projectHint),
      };
    })
    .filter((value): value is RecentSession => Boolean(value));
};

export const parseProviderOutput = (
  provider: ProviderName,
  rawOutput: string,
): NormalizedProviderResponse => {
  const parsed = extractJsonObjects(rawOutput);
  const evidence: EvidenceItem[] = [];
  const sessions: RecentSession[] = [];

  for (const obj of parsed) {
    evidence.push(...parseEvidenceFromObject(provider, obj));
    sessions.push(...parseSessionsFromObject(provider, obj));
  }

  if (!parsed.length && rawOutput.trim().length > 0) {
    evidence.push({
      provider,
      snippet: rawOutput.trim().slice(0, 3000),
      metadata: {},
      relevanceScore: 0,
    });
  }

  return { evidence, sessions, notes: [] };
};

export const baseSummary = (provider: ProviderName): ProviderRunSummary => ({
  provider,
  available: false,
  used: false,
  status: "unavailable",
  latencyMs: 0,
  capabilityNotes: [],
});
