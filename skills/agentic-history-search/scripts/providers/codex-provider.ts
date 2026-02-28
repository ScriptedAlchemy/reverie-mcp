import { performance } from "node:perf_hooks";

import { isCommandAvailable, runCommand } from "../core/process.js";
import type { HistoryProvider, ProviderExecutionResult, ProviderQueryContext, ProviderRecentContext } from "./base.js";
import { baseSummary, parseProviderOutput } from "./common.js";

type ProcessDeps = {
  runCommand: typeof runCommand;
  isCommandAvailable: typeof isCommandAvailable;
};

const buildQueryPrompt = (query: string, scopePath: string): string => `
Search only Codex conversation history for project scope "${scopePath}".
Answer this question using history evidence only: "${query}".

Return JSON:
{"results":[{"snippet":"...","sourceId":"...","timestamp":"...","title":"..."}]}
If none found: {"results":[]}
`;

const buildRecentPrompt = (scopePath: string, limit: number): string => `
List up to ${limit} most recent Codex sessions for project scope "${scopePath}".
Return JSON:
{"sessions":[{"sessionId":"...","timestamp":"...","title":"...","summary":"...","project":"..."}]}
`;

export class CodexProvider implements HistoryProvider {
  readonly name = "codex" as const;
  constructor(
    private readonly deps: ProcessDeps = {
      runCommand,
      isCommandAvailable,
    },
  ) {}

  async isAvailable(): Promise<{ available: boolean; notes: string[] }> {
    const available = await this.deps.isCommandAvailable("codex");
    return {
      available,
      notes: available ? ["codex CLI available"] : ["codex CLI not found in PATH"],
    };
  }

  async queryPast(ctx: ProviderQueryContext): Promise<ProviderExecutionResult> {
    const start = performance.now();
    const summary = baseSummary(this.name);
    const availability = await this.isAvailable();
    summary.available = availability.available;
    summary.capabilityNotes = availability.notes;
    if (!availability.available) return { summary, response: { evidence: [], sessions: [], notes: [] } };

    const prompt = buildQueryPrompt(ctx.query, ctx.scope.scopePath);
    const result = await this.deps.runCommand("codex", ["exec", "--json", prompt], {
      timeoutMs: ctx.timeBudgetMs,
    });
    summary.latencyMs = Math.round(performance.now() - start);
    summary.used = true;
    summary.status = result.timedOut
      ? "timeout"
      : result.code === 0
        ? "ok"
        : "error";
    if (result.code !== 0) summary.error = result.stderr.trim().slice(0, 400);
    const response = parseProviderOutput(this.name, result.stdout);
    return { summary, response };
  }

  async listRecent(ctx: ProviderRecentContext): Promise<ProviderExecutionResult> {
    const start = performance.now();
    const summary = baseSummary(this.name);
    const availability = await this.isAvailable();
    summary.available = availability.available;
    summary.capabilityNotes = availability.notes;
    if (!availability.available) return { summary, response: { evidence: [], sessions: [], notes: [] } };

    const prompt = buildRecentPrompt(ctx.scope.scopePath, ctx.limit);
    const result = await this.deps.runCommand("codex", ["exec", "--json", prompt], {
      timeoutMs: ctx.timeBudgetMs,
    });
    summary.latencyMs = Math.round(performance.now() - start);
    summary.used = true;
    summary.status = result.timedOut
      ? "timeout"
      : result.code === 0
        ? "ok"
        : "error";
    if (result.code !== 0) summary.error = result.stderr.trim().slice(0, 400);
    const response = parseProviderOutput(this.name, result.stdout);
    return { summary, response };
  }
}
