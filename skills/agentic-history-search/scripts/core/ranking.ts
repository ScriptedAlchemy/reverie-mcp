import type { EvidenceItem, RecentSession, ScopeDiagnostics } from "./schemas.js";
import { scopeRelevance } from "./scope.js";

const providerReliability: Record<string, number> = {
  claude: 0.88,
  codex: 0.85,
  cursor: 0.82,
};

const tokenize = (value: string): Set<string> =>
  new Set(value.toLowerCase().match(/[a-z0-9_]+/g) ?? []);

const lexicalOverlap = (query: string, text: string): number => {
  const q = tokenize(query);
  const t = tokenize(text);
  if (!q.size || !t.size) return 0;
  const overlap = [...q].filter((token) => t.has(token)).length;
  return overlap / q.size;
};

const recencyScore = (timestamp?: string): number => {
  if (!timestamp) return 0.1;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 0.1;
  const ageHours = Math.max((Date.now() - date.getTime()) / (1000 * 60 * 60), 0);
  return Math.exp(-ageHours / 240);
};

export const rankEvidence = (
  query: string,
  evidence: EvidenceItem[],
  scope: ScopeDiagnostics,
): EvidenceItem[] =>
  [...evidence]
    .map((item) => {
      const lexical = lexicalOverlap(query, item.snippet);
      const scoped = scopeRelevance(`${item.snippet} ${item.sourceId ?? ""}`, scope);
      const recency = recencyScore(item.timestamp);
      const reliability = providerReliability[item.provider] ?? 0.7;
      const relevanceScore = Math.max(
        0,
        Math.min(1, 0.4 * lexical + 0.25 * scoped + 0.2 * recency + 0.15 * reliability),
      );
      return { ...item, relevanceScore };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

export const rankSessions = (
  sessions: RecentSession[],
  scope: ScopeDiagnostics,
): RecentSession[] => {
  const score = (session: RecentSession): number => {
    const scoped = scopeRelevance(
      `${session.title} ${session.summary ?? ""} ${session.projectHint ?? ""}`,
      scope,
    );
    const recency = recencyScore(session.timestamp);
    const reliability = providerReliability[session.provider] ?? 0.7;
    return 0.45 * recency + 0.35 * scoped + 0.2 * reliability;
  };
  return [...sessions].sort((a, b) => score(b) - score(a));
};
