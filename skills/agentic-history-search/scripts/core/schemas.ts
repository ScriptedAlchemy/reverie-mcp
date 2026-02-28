import { z } from "zod";

export const ProviderNameSchema = z.enum(["claude", "codex", "cursor"]);
export type ProviderName = z.infer<typeof ProviderNameSchema>;

export const QueryPastInputSchema = z.object({
  mode: z.literal("query_past").default("query_past"),
  query: z.string().min(2),
  scopePath: z.string().optional(),
  providers: z.array(ProviderNameSchema).optional(),
  maxCitations: z.number().int().min(1).max(20).optional().default(5),
  timeBudgetMs: z.number().int().min(500).max(120000).optional().default(12000),
});
export type QueryPastInput = z.infer<typeof QueryPastInputSchema>;

export const RecentSessionsInputSchema = z.object({
  mode: z.literal("recent_sessions").default("recent_sessions"),
  scopePath: z.string().optional(),
  providers: z.array(ProviderNameSchema).optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
  timeBudgetMs: z.number().int().min(500).max(120000).optional().default(12000),
});
export type RecentSessionsInput = z.infer<typeof RecentSessionsInputSchema>;

export const CitationSchema = z.object({
  provider: ProviderNameSchema,
  sourceId: z.string().optional(),
  snippet: z.string(),
  timestamp: z.string().optional(),
  sessionTitle: z.string().optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const ScopeDiagnosticsSchema = z.object({
  cwd: z.string(),
  gitRoot: z.string().optional(),
  scopePath: z.string(),
  projectName: z.string(),
  aliases: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});
export type ScopeDiagnostics = z.infer<typeof ScopeDiagnosticsSchema>;

export const ProviderRunSummarySchema = z.object({
  provider: ProviderNameSchema,
  available: z.boolean(),
  used: z.boolean(),
  status: z.string(),
  latencyMs: z.number().int().nonnegative(),
  capabilityNotes: z.array(z.string()).default([]),
  error: z.string().optional(),
});
export type ProviderRunSummary = z.infer<typeof ProviderRunSummarySchema>;

export const EvidenceItemSchema = z.object({
  provider: ProviderNameSchema,
  snippet: z.string().min(1),
  sourceId: z.string().optional(),
  timestamp: z.string().optional(),
  sessionTitle: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  relevanceScore: z.number().min(0).max(1).default(0),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const QueryPastOutputSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
  confidence: z.number().min(0).max(1),
  insufficientEvidence: z.boolean(),
  scopeDiagnostics: ScopeDiagnosticsSchema,
  providersUsed: z.array(ProviderRunSummarySchema),
});
export type QueryPastOutput = z.infer<typeof QueryPastOutputSchema>;

export const RecentSessionSchema = z.object({
  provider: ProviderNameSchema,
  sessionId: z.string().optional(),
  timestamp: z.string().optional(),
  title: z.string(),
  summary: z.string().optional(),
  projectHint: z.string().optional(),
});
export type RecentSession = z.infer<typeof RecentSessionSchema>;

export const RecentSessionsOutputSchema = z.object({
  sessions: z.array(RecentSessionSchema),
  scopeDiagnostics: ScopeDiagnosticsSchema,
  providersUsed: z.array(ProviderRunSummarySchema),
});
export type RecentSessionsOutput = z.infer<typeof RecentSessionsOutputSchema>;

export type AnyToolInput = QueryPastInput | RecentSessionsInput;

export const NormalizedProviderResponseSchema = z.object({
  evidence: z.array(EvidenceItemSchema).default([]),
  sessions: z.array(RecentSessionSchema).default([]),
  notes: z.array(z.string()).default([]),
});
export type NormalizedProviderResponse = z.infer<typeof NormalizedProviderResponseSchema>;
