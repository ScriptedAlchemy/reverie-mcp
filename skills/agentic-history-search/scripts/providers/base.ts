import type { ScopeDiagnostics } from "../core/schemas.js";
import type {
  NormalizedProviderResponse,
  ProviderName,
  ProviderRunSummary,
  QueryPastInput,
  RecentSessionsInput,
} from "../core/schemas.js";

export type ProviderQueryContext = {
  query: string;
  scope: ScopeDiagnostics;
  timeBudgetMs: number;
};

export type ProviderRecentContext = {
  scope: ScopeDiagnostics;
  limit: number;
  timeBudgetMs: number;
};

export type ProviderExecutionResult = {
  summary: ProviderRunSummary;
  response: NormalizedProviderResponse;
};

export interface HistoryProvider {
  readonly name: ProviderName;
  isAvailable(): Promise<{ available: boolean; notes: string[] }>;
  queryPast(ctx: ProviderQueryContext): Promise<ProviderExecutionResult>;
  listRecent(ctx: ProviderRecentContext): Promise<ProviderExecutionResult>;
}

export type ToolInput = QueryPastInput | RecentSessionsInput;
