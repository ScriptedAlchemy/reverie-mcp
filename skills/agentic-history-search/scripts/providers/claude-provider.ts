import { performance } from "node:perf_hooks";

import { runCommand, isCommandAvailable } from "../core/process.js";
import type { ProviderExecutionResult, ProviderQueryContext, ProviderRecentContext } from "./base.js";
import type { HistoryProvider } from "./base.js";
import { baseSummary, parseProviderOutput } from "./common.js";

type ProcessDeps = {
  runCommand: typeof runCommand;
  isCommandAvailable: typeof isCommandAvailable;
};

const buildQueryPrompt = (query: string, scopePath: string): string => `
You are a history retrieval assistant. Search ONLY conversation history relevant to project scope "${scopePath}".
Question: "${query}"

Return JSON with shape:
{
  "results": [
    {
      "snippet": "evidence snippet from history",
      "sourceId": "session/thread id if available",
      "timestamp": "ISO timestamp if available",
      "title": "session title if available"
    }
  ]
}

If no matching history is found, return {"results":[]}.
`;

const buildRecentPrompt = (scopePath: string, limit: number): string => `
List the most recent conversation sessions for project scope "${scopePath}".
Return JSON:
{
  "sessions": [
    {"sessionId":"...", "timestamp":"...", "title":"...", "summary":"...", "project":"..."}
  ]
}
Limit to ${limit} sessions.
`;

export class ClaudeProvider implements HistoryProvider {
  readonly name = "claude" as const;
  constructor(
    private readonly deps: ProcessDeps = {
      runCommand,
      isCommandAvailable,
    },
  ) {}

  async isAvailable(): Promise<{ available: boolean; notes: string[] }> {
    const available = await this.deps.isCommandAvailable("claude");
    return {
      available,
      notes: available ? ["claude CLI available"] : ["claude CLI not found in PATH"],
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
    const result = await this.deps.runCommand(
      "claude",
      ["-p", prompt, "--output-format", "json"],
      { timeoutMs: ctx.timeBudgetMs },
    );
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
    const result = await this.deps.runCommand(
      "claude",
      ["-p", prompt, "--output-format", "json"],
      { timeoutMs: ctx.timeBudgetMs },
    );
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
