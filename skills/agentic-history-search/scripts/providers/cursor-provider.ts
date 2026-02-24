import { performance } from "node:perf_hooks";

import { isCommandAvailable, runCommand } from "../core/process.js";
import type { HistoryProvider, ProviderExecutionResult, ProviderQueryContext, ProviderRecentContext } from "./base.js";
import { baseSummary, parseProviderOutput } from "./common.js";

const CURSOR_COMMAND_CANDIDATES = ["agent", "cursor-agent", "cursor"];

const buildQueryPrompt = (query: string, scopePath: string): string => `
Search Cursor chat history only for project scope "${scopePath}".
Question: "${query}".
Return JSON:
{"results":[{"snippet":"...","sourceId":"...","timestamp":"...","title":"..."}]}
If none found: {"results":[]}
`;

const buildRecentPrompt = (scopePath: string, limit: number): string => `
List up to ${limit} recent Cursor sessions for project scope "${scopePath}".
Return JSON:
{"sessions":[{"sessionId":"...","timestamp":"...","title":"...","summary":"...","project":"..."}]}
`;

export class CursorProvider implements HistoryProvider {
  readonly name = "cursor" as const;

  private async resolveCommand(): Promise<string | undefined> {
    for (const candidate of CURSOR_COMMAND_CANDIDATES) {
      if (await isCommandAvailable(candidate)) return candidate;
    }
    return undefined;
  }

  async isAvailable(): Promise<{ available: boolean; notes: string[] }> {
    const command = await this.resolveCommand();
    return {
      available: Boolean(command),
      notes: command
        ? [`Cursor CLI command detected: ${command}`]
        : ["No Cursor CLI command found (tried: agent, cursor-agent, cursor)"],
    };
  }

  async queryPast(ctx: ProviderQueryContext): Promise<ProviderExecutionResult> {
    const start = performance.now();
    const summary = baseSummary(this.name);
    const command = await this.resolveCommand();
    summary.available = Boolean(command);
    summary.capabilityNotes = command
      ? [`using command: ${command}`]
      : ["cursor CLI unavailable"];
    if (!command) return { summary, response: { evidence: [], sessions: [], notes: [] } };

    const prompt = buildQueryPrompt(ctx.query, ctx.scope.scopePath);
    const result = await runCommand(
      command,
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
    const command = await this.resolveCommand();
    summary.available = Boolean(command);
    summary.capabilityNotes = command
      ? [`using command: ${command}`]
      : ["cursor CLI unavailable"];
    if (!command) return { summary, response: { evidence: [], sessions: [], notes: [] } };

    const prompt = buildRecentPrompt(ctx.scope.scopePath, ctx.limit);
    const result = await runCommand(
      command,
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
