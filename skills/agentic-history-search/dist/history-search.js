#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import node_path from "node:path";
import { z } from "zod";
import { performance } from "node:perf_hooks";
const slugify = (value)=>value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const detectGitRoot = (cwd)=>{
    try {
        const output = execFileSync("git", [
            "rev-parse",
            "--show-toplevel"
        ], {
            cwd,
            encoding: "utf8",
            stdio: [
                "ignore",
                "pipe",
                "pipe"
            ]
        }).trim();
        return output.length ? output : void 0;
    } catch  {
        return;
    }
};
const resolveScope = (scopePath)=>{
    const cwd = node_path.resolve(scopePath ?? process.cwd());
    const gitRoot = detectGitRoot(cwd);
    const resolvedScope = gitRoot ?? cwd;
    const projectName = node_path.basename(resolvedScope) || "workspace";
    const aliases = Array.from(new Set([
        projectName.toLowerCase(),
        slugify(projectName),
        slugify(resolvedScope),
        slugify(cwd)
    ])).sort();
    return {
        cwd,
        gitRoot,
        scopePath: resolvedScope,
        projectName,
        aliases,
        confidence: gitRoot ? 0.95 : 0.7
    };
};
const scopeRelevance = (text, scope)=>{
    const haystack = text.toLowerCase();
    if (!haystack) return 0;
    let score = 0;
    if (haystack.includes(scope.projectName.toLowerCase())) score += 0.35;
    if (haystack.includes(scope.scopePath.toLowerCase().replaceAll(node_path.sep, "/"))) score += 0.45;
    for (const alias of scope.aliases)if (alias.length > 2 && haystack.includes(alias)) score += 0.1;
    return Math.min(score, 1);
};
const providerReliability = {
    claude: 0.88,
    codex: 0.85,
    cursor: 0.82
};
const tokenize = (value)=>new Set(value.toLowerCase().match(/[a-z0-9_]+/g) ?? []);
const lexicalOverlap = (query, text)=>{
    const q = tokenize(query);
    const t = tokenize(text);
    if (!q.size || !t.size) return 0;
    const overlap = [
        ...q
    ].filter((token)=>t.has(token)).length;
    return overlap / q.size;
};
const recencyScore = (timestamp)=>{
    if (!timestamp) return 0.1;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 0.1;
    const ageHours = Math.max((Date.now() - date.getTime()) / 3600000, 0);
    return Math.exp(-ageHours / 240);
};
const rankEvidence = (query, evidence, scope)=>[
        ...evidence
    ].map((item)=>{
        const lexical = lexicalOverlap(query, item.snippet);
        const scoped = scopeRelevance(`${item.snippet} ${item.sourceId ?? ""}`, scope);
        const recency = recencyScore(item.timestamp);
        const reliability = providerReliability[item.provider] ?? 0.7;
        const relevanceScore = Math.max(0, Math.min(1, 0.4 * lexical + 0.25 * scoped + 0.2 * recency + 0.15 * reliability));
        return {
            ...item,
            relevanceScore
        };
    }).sort((a, b)=>b.relevanceScore - a.relevanceScore);
const rankSessions = (sessions, scope)=>{
    const score = (session)=>{
        const scoped = scopeRelevance(`${session.title} ${session.summary ?? ""} ${session.projectHint ?? ""}`, scope);
        const recency = recencyScore(session.timestamp);
        const reliability = providerReliability[session.provider] ?? 0.7;
        return 0.45 * recency + 0.35 * scoped + 0.2 * reliability;
    };
    return [
        ...sessions
    ].sort((a, b)=>score(b) - score(a));
};
const ProviderNameSchema = z["enum"]([
    "claude",
    "codex",
    "cursor"
]);
const QueryPastInputSchema = z.object({
    mode: z.literal("query_past").default("query_past"),
    query: z.string().min(2),
    scopePath: z.string().optional(),
    providers: z.array(ProviderNameSchema).optional(),
    maxCitations: z.number().int().min(1).max(20).optional().default(5),
    timeBudgetMs: z.number().int().min(500).max(120000).optional().default(12000)
});
const RecentSessionsInputSchema = z.object({
    mode: z.literal("recent_sessions").default("recent_sessions"),
    scopePath: z.string().optional(),
    providers: z.array(ProviderNameSchema).optional(),
    limit: z.number().int().min(1).max(100).optional().default(10),
    timeBudgetMs: z.number().int().min(500).max(120000).optional().default(12000)
});
const CitationSchema = z.object({
    provider: ProviderNameSchema,
    sourceId: z.string().optional(),
    snippet: z.string(),
    timestamp: z.string().optional(),
    sessionTitle: z.string().optional()
});
const ScopeDiagnosticsSchema = z.object({
    cwd: z.string(),
    gitRoot: z.string().optional(),
    scopePath: z.string(),
    projectName: z.string(),
    aliases: z.array(z.string()),
    confidence: z.number().min(0).max(1)
});
const ProviderRunSummarySchema = z.object({
    provider: ProviderNameSchema,
    available: z.boolean(),
    used: z.boolean(),
    status: z.string(),
    latencyMs: z.number().int().nonnegative(),
    capabilityNotes: z.array(z.string()).default([]),
    error: z.string().optional()
});
const EvidenceItemSchema = z.object({
    provider: ProviderNameSchema,
    snippet: z.string().min(1),
    sourceId: z.string().optional(),
    timestamp: z.string().optional(),
    sessionTitle: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    relevanceScore: z.number().min(0).max(1).default(0)
});
const QueryPastOutputSchema = z.object({
    answer: z.string(),
    citations: z.array(CitationSchema),
    confidence: z.number().min(0).max(1),
    insufficientEvidence: z.boolean(),
    scopeDiagnostics: ScopeDiagnosticsSchema,
    providersUsed: z.array(ProviderRunSummarySchema)
});
const RecentSessionSchema = z.object({
    provider: ProviderNameSchema,
    sessionId: z.string().optional(),
    timestamp: z.string().optional(),
    title: z.string(),
    summary: z.string().optional(),
    projectHint: z.string().optional()
});
const RecentSessionsOutputSchema = z.object({
    sessions: z.array(RecentSessionSchema),
    scopeDiagnostics: ScopeDiagnosticsSchema,
    providersUsed: z.array(ProviderRunSummarySchema)
});
z.object({
    evidence: z.array(EvidenceItemSchema).default([]),
    sessions: z.array(RecentSessionSchema).default([]),
    notes: z.array(z.string()).default([])
});
const runCommand = (command, args, options = {})=>new Promise((resolve, reject)=>{
        const child = spawn(command, args, {
            cwd: options.cwd,
            env: options.env,
            stdio: [
                "ignore",
                "pipe",
                "pipe"
            ]
        });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timeoutMs = options.timeoutMs ?? 30000;
        const timeout = setTimeout(()=>{
            timedOut = true;
            child.kill("SIGTERM");
        }, timeoutMs);
        child.stdout.on("data", (data)=>{
            stdout += data.toString("utf8");
        });
        child.stderr.on("data", (data)=>{
            stderr += data.toString("utf8");
        });
        child.on("error", (error)=>{
            clearTimeout(timeout);
            reject(error);
        });
        child.on("close", (code)=>{
            clearTimeout(timeout);
            resolve({
                code,
                stdout,
                stderr,
                timedOut
            });
        });
    });
const isCommandAvailable = async (command)=>{
    try {
        const result = await runCommand("bash", [
            "-lc",
            `command -v ${command}`
        ], {
            timeoutMs: 2000
        });
        return 0 === result.code && result.stdout.trim().length > 0;
    } catch  {
        return false;
    }
};
const extractJsonObjects = (raw)=>{
    const text = raw.trim();
    if (!text) return [];
    const parsed = [];
    try {
        parsed.push(JSON.parse(text));
        return parsed;
    } catch  {}
    const lines = text.split("\n").map((line)=>line.trim()).filter(Boolean);
    for (const line of lines)try {
        parsed.push(JSON.parse(line));
    } catch  {}
    return parsed;
};
const asString = (value)=>"string" == typeof value && value.trim().length > 0 ? value : void 0;
const parseEvidenceFromObject = (provider, obj)=>{
    if (!obj || "object" != typeof obj) return [];
    const data = obj;
    if (Array.isArray(data.results)) return data.results.map((result)=>{
        if (!result || "object" != typeof result) return;
        const record = result;
        const snippet = asString(record.snippet) ?? asString(record.content) ?? asString(record.answer) ?? asString(record.text);
        if (!snippet) return;
        return {
            provider,
            snippet,
            sourceId: asString(record.sourceId) ?? asString(record.id),
            timestamp: asString(record.timestamp) ?? asString(record.ts),
            sessionTitle: asString(record.title) ?? asString(record.sessionTitle),
            metadata: record,
            relevanceScore: 0
        };
    }).filter((value)=>Boolean(value));
    const maybeContent = asString(data.answer) ?? asString(data.content) ?? asString(data.text) ?? asString(data.message);
    if (!maybeContent) return [];
    return [
        {
            provider,
            snippet: maybeContent,
            sourceId: asString(data.id),
            timestamp: asString(data.timestamp) ?? asString(data.ts),
            sessionTitle: asString(data.title),
            metadata: data,
            relevanceScore: 0
        }
    ];
};
const parseSessionsFromObject = (provider, obj)=>{
    if (!obj || "object" != typeof obj) return [];
    const data = obj;
    if (!Array.isArray(data.sessions)) return [];
    return data.sessions.map((item)=>{
        if (!item || "object" != typeof item) return;
        const record = item;
        const title = asString(record.title) ?? asString(record.summary) ?? "Untitled session";
        return {
            provider,
            sessionId: asString(record.sessionId) ?? asString(record.id),
            timestamp: asString(record.timestamp) ?? asString(record.ts),
            title,
            summary: asString(record.summary) ?? asString(record.description),
            projectHint: asString(record.project) ?? asString(record.projectHint)
        };
    }).filter((value)=>Boolean(value));
};
const parseProviderOutput = (provider, rawOutput)=>{
    const parsed = extractJsonObjects(rawOutput);
    const evidence = [];
    const sessions = [];
    for (const obj of parsed){
        evidence.push(...parseEvidenceFromObject(provider, obj));
        sessions.push(...parseSessionsFromObject(provider, obj));
    }
    if (!parsed.length && rawOutput.trim().length > 0) evidence.push({
        provider,
        snippet: rawOutput.trim().slice(0, 3000),
        metadata: {},
        relevanceScore: 0
    });
    return {
        evidence,
        sessions,
        notes: []
    };
};
const baseSummary = (provider)=>({
        provider,
        available: false,
        used: false,
        status: "unavailable",
        latencyMs: 0,
        capabilityNotes: []
    });
const buildQueryPrompt = (query, scopePath)=>`
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
const buildRecentPrompt = (scopePath, limit)=>`
List the most recent conversation sessions for project scope "${scopePath}".
Return JSON:
{
  "sessions": [
    {"sessionId":"...", "timestamp":"...", "title":"...", "summary":"...", "project":"..."}
  ]
}
Limit to ${limit} sessions.
`;
class ClaudeProvider {
    deps;
    name = "claude";
    constructor(deps = {
        runCommand: runCommand,
        isCommandAvailable: isCommandAvailable
    }){
        this.deps = deps;
    }
    async isAvailable() {
        const available = await this.deps.isCommandAvailable("claude");
        return {
            available,
            notes: available ? [
                "claude CLI available"
            ] : [
                "claude CLI not found in PATH"
            ]
        };
    }
    async queryPast(ctx) {
        const start = performance.now();
        const summary = baseSummary(this.name);
        const availability = await this.isAvailable();
        summary.available = availability.available;
        summary.capabilityNotes = availability.notes;
        if (!availability.available) return {
            summary,
            response: {
                evidence: [],
                sessions: [],
                notes: []
            }
        };
        const prompt = buildQueryPrompt(ctx.query, ctx.scope.scopePath);
        const result = await this.deps.runCommand("claude", [
            "-p",
            prompt,
            "--output-format",
            "json"
        ], {
            timeoutMs: ctx.timeBudgetMs
        });
        summary.latencyMs = Math.round(performance.now() - start);
        summary.used = true;
        summary.status = result.timedOut ? "timeout" : 0 === result.code ? "ok" : "error";
        if (0 !== result.code) summary.error = result.stderr.trim().slice(0, 400);
        const response = parseProviderOutput(this.name, result.stdout);
        return {
            summary,
            response
        };
    }
    async listRecent(ctx) {
        const start = performance.now();
        const summary = baseSummary(this.name);
        const availability = await this.isAvailable();
        summary.available = availability.available;
        summary.capabilityNotes = availability.notes;
        if (!availability.available) return {
            summary,
            response: {
                evidence: [],
                sessions: [],
                notes: []
            }
        };
        const prompt = buildRecentPrompt(ctx.scope.scopePath, ctx.limit);
        const result = await this.deps.runCommand("claude", [
            "-p",
            prompt,
            "--output-format",
            "json"
        ], {
            timeoutMs: ctx.timeBudgetMs
        });
        summary.latencyMs = Math.round(performance.now() - start);
        summary.used = true;
        summary.status = result.timedOut ? "timeout" : 0 === result.code ? "ok" : "error";
        if (0 !== result.code) summary.error = result.stderr.trim().slice(0, 400);
        const response = parseProviderOutput(this.name, result.stdout);
        return {
            summary,
            response
        };
    }
}
const codex_provider_buildQueryPrompt = (query, scopePath)=>`
Search only Codex conversation history for project scope "${scopePath}".
Answer this question using history evidence only: "${query}".

Return JSON:
{"results":[{"snippet":"...","sourceId":"...","timestamp":"...","title":"..."}]}
If none found: {"results":[]}
`;
const codex_provider_buildRecentPrompt = (scopePath, limit)=>`
List up to ${limit} most recent Codex sessions for project scope "${scopePath}".
Return JSON:
{"sessions":[{"sessionId":"...","timestamp":"...","title":"...","summary":"...","project":"..."}]}
`;
class CodexProvider {
    deps;
    name = "codex";
    constructor(deps = {
        runCommand: runCommand,
        isCommandAvailable: isCommandAvailable
    }){
        this.deps = deps;
    }
    async isAvailable() {
        const available = await this.deps.isCommandAvailable("codex");
        return {
            available,
            notes: available ? [
                "codex CLI available"
            ] : [
                "codex CLI not found in PATH"
            ]
        };
    }
    async queryPast(ctx) {
        const start = performance.now();
        const summary = baseSummary(this.name);
        const availability = await this.isAvailable();
        summary.available = availability.available;
        summary.capabilityNotes = availability.notes;
        if (!availability.available) return {
            summary,
            response: {
                evidence: [],
                sessions: [],
                notes: []
            }
        };
        const prompt = codex_provider_buildQueryPrompt(ctx.query, ctx.scope.scopePath);
        const result = await this.deps.runCommand("codex", [
            "exec",
            "--json",
            prompt
        ], {
            timeoutMs: ctx.timeBudgetMs
        });
        summary.latencyMs = Math.round(performance.now() - start);
        summary.used = true;
        summary.status = result.timedOut ? "timeout" : 0 === result.code ? "ok" : "error";
        if (0 !== result.code) summary.error = result.stderr.trim().slice(0, 400);
        const response = parseProviderOutput(this.name, result.stdout);
        return {
            summary,
            response
        };
    }
    async listRecent(ctx) {
        const start = performance.now();
        const summary = baseSummary(this.name);
        const availability = await this.isAvailable();
        summary.available = availability.available;
        summary.capabilityNotes = availability.notes;
        if (!availability.available) return {
            summary,
            response: {
                evidence: [],
                sessions: [],
                notes: []
            }
        };
        const prompt = codex_provider_buildRecentPrompt(ctx.scope.scopePath, ctx.limit);
        const result = await this.deps.runCommand("codex", [
            "exec",
            "--json",
            prompt
        ], {
            timeoutMs: ctx.timeBudgetMs
        });
        summary.latencyMs = Math.round(performance.now() - start);
        summary.used = true;
        summary.status = result.timedOut ? "timeout" : 0 === result.code ? "ok" : "error";
        if (0 !== result.code) summary.error = result.stderr.trim().slice(0, 400);
        const response = parseProviderOutput(this.name, result.stdout);
        return {
            summary,
            response
        };
    }
}
const defaultCommandCandidates = [
    "agent"
];
const cursor_provider_buildQueryPrompt = (query, scopePath)=>`
Search Cursor chat history only for project scope "${scopePath}".
Question: "${query}".
Return JSON:
{"results":[{"snippet":"...","sourceId":"...","timestamp":"...","title":"..."}]}
If none found: {"results":[]}
`;
const cursor_provider_buildRecentPrompt = (scopePath, limit)=>`
List up to ${limit} recent Cursor sessions for project scope "${scopePath}".
Return JSON:
{"sessions":[{"sessionId":"...","timestamp":"...","title":"...","summary":"...","project":"..."}]}
`;
class CursorProvider {
    deps;
    name = "cursor";
    constructor(deps = {
        runCommand: runCommand,
        isCommandAvailable: isCommandAvailable
    }){
        this.deps = deps;
    }
    getCommandCandidates() {
        const single = process.env.CURSOR_CLI_COMMAND?.trim();
        const multi = process.env.CURSOR_CLI_COMMANDS?.split(",").map((entry)=>entry.trim()).filter(Boolean);
        const merged = [
            ...single ? [
                single
            ] : [],
            ...multi ?? [],
            ...defaultCommandCandidates
        ];
        return Array.from(new Set(merged));
    }
    async resolveCommand() {
        for (const candidate of this.getCommandCandidates())if (await this.deps.isCommandAvailable(candidate)) return candidate;
    }
    async isAvailable() {
        const command = await this.resolveCommand();
        return {
            available: Boolean(command),
            notes: command ? [
                `Cursor CLI command detected: ${command}`
            ] : [
                `No Cursor CLI command found (tried: ${this.getCommandCandidates().join(", ")})`
            ]
        };
    }
    async queryPast(ctx) {
        const start = performance.now();
        const summary = baseSummary(this.name);
        const command = await this.resolveCommand();
        summary.available = Boolean(command);
        summary.capabilityNotes = command ? [
            `using command: ${command}`
        ] : [
            "cursor CLI unavailable"
        ];
        if (!command) return {
            summary,
            response: {
                evidence: [],
                sessions: [],
                notes: []
            }
        };
        const prompt = cursor_provider_buildQueryPrompt(ctx.query, ctx.scope.scopePath);
        const result = await this.deps.runCommand(command, [
            "-p",
            prompt,
            "--output-format",
            "json"
        ], {
            timeoutMs: ctx.timeBudgetMs
        });
        summary.latencyMs = Math.round(performance.now() - start);
        summary.used = true;
        summary.status = result.timedOut ? "timeout" : 0 === result.code ? "ok" : "error";
        if (0 !== result.code) summary.error = result.stderr.trim().slice(0, 400);
        const response = parseProviderOutput(this.name, result.stdout);
        return {
            summary,
            response
        };
    }
    async listRecent(ctx) {
        const start = performance.now();
        const summary = baseSummary(this.name);
        const command = await this.resolveCommand();
        summary.available = Boolean(command);
        summary.capabilityNotes = command ? [
            `using command: ${command}`
        ] : [
            "cursor CLI unavailable"
        ];
        if (!command) return {
            summary,
            response: {
                evidence: [],
                sessions: [],
                notes: []
            }
        };
        const prompt = cursor_provider_buildRecentPrompt(ctx.scope.scopePath, ctx.limit);
        const result = await this.deps.runCommand(command, [
            "-p",
            prompt,
            "--output-format",
            "json"
        ], {
            timeoutMs: ctx.timeBudgetMs
        });
        summary.latencyMs = Math.round(performance.now() - start);
        summary.used = true;
        summary.status = result.timedOut ? "timeout" : 0 === result.code ? "ok" : "error";
        if (0 !== result.code) summary.error = result.stderr.trim().slice(0, 400);
        const response = parseProviderOutput(this.name, result.stdout);
        return {
            summary,
            response
        };
    }
}
const providers = {
    claude: new ClaudeProvider(),
    codex: new CodexProvider(),
    cursor: new CursorProvider()
};
const parseArgs = (argv)=>{
    const parsed = {};
    for(let i = 0; i < argv.length; i += 1){
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
const parseProviderList = (raw)=>{
    if (!raw) return;
    return raw.split(",").map((value)=>value.trim().toLowerCase()).filter(Boolean).map((value)=>ProviderNameSchema.parse(value));
};
const inferMode = (args)=>"recent_sessions" === args.mode ? "recent_sessions" : "query_past";
const parseInput = (args)=>{
    const mode = inferMode(args);
    if ("recent_sessions" === mode) return RecentSessionsInputSchema.parse({
        mode,
        scopePath: "string" == typeof args["scope-path"] ? args["scope-path"] : void 0,
        providers: "string" == typeof args.providers ? parseProviderList(args.providers) : void 0,
        limit: "string" == typeof args.limit ? Number(args.limit) : void 0,
        timeBudgetMs: "string" == typeof args["time-budget-ms"] ? Number(args["time-budget-ms"]) : void 0
    });
    return QueryPastInputSchema.parse({
        mode,
        query: "string" == typeof args.query ? args.query : "",
        scopePath: "string" == typeof args["scope-path"] ? args["scope-path"] : void 0,
        providers: "string" == typeof args.providers ? parseProviderList(args.providers) : void 0,
        maxCitations: "string" == typeof args["max-citations"] ? Number(args["max-citations"]) : void 0,
        timeBudgetMs: "string" == typeof args["time-budget-ms"] ? Number(args["time-budget-ms"]) : void 0
    });
};
const synthesizeAnswer = (query, rankedEvidence)=>{
    if (!rankedEvidence.length) return `I could not find sufficient history evidence to answer: "${query}".`;
    const top = rankedEvidence.slice(0, 3);
    const bullets = top.map((item, index)=>`${index + 1}. [${item.provider}] ${item.snippet.replace(/\s+/g, " ").slice(0, 280)}`).join("\n");
    return `Based only on matching conversation history, here are the strongest findings:\n${bullets}`;
};
const toCitations = (rankedEvidence, maxCitations)=>rankedEvidence.slice(0, maxCitations).map((item)=>({
            provider: item.provider,
            sourceId: item.sourceId,
            snippet: item.snippet.slice(0, 500),
            timestamp: item.timestamp,
            sessionTitle: item.sessionTitle
        }));
const mockQueryResult = (input)=>{
    const scope = resolveScope(input.scopePath);
    const selectedProviders = input.providers ?? Object.keys(providers);
    const noEvidence = input.query.toLowerCase().includes("no evidence");
    const syntheticEvidence = noEvidence ? [] : selectedProviders.map((provider, index)=>({
            provider,
            snippet: `Mock history [${provider}] says query "${input.query}" was solved using npm test and targeted rstest commands.`,
            sourceId: `mock-session-${index + 1}`,
            timestamp: new Date(Date.now() - 1000 * index * 60).toISOString(),
            sessionTitle: `Mock ${provider} session`,
            metadata: {},
            relevanceScore: 0
        }));
    const ranked = rankEvidence(input.query, syntheticEvidence, scope);
    return QueryPastOutputSchema.parse({
        answer: synthesizeAnswer(input.query, ranked),
        citations: toCitations(ranked, input.maxCitations ?? 5),
        confidence: ranked.length ? Math.min(0.95, ranked[0].relevanceScore + 0.2) : 0.15,
        insufficientEvidence: 0 === ranked.length,
        scopeDiagnostics: scope,
        providersUsed: selectedProviders.map((provider)=>({
                provider,
                available: true,
                used: true,
                status: "ok",
                latencyMs: 1,
                capabilityNotes: [
                    "mock mode"
                ]
            }))
    });
};
const mockRecentSessionsResult = (input)=>{
    const scope = resolveScope(input.scopePath);
    const selectedProviders = input.providers ?? Object.keys(providers);
    const sessions = selectedProviders.map((provider, index)=>({
            provider,
            sessionId: `mock-session-recent-${index + 1}`,
            timestamp: new Date(Date.now() - 1000 * index * 60).toISOString(),
            title: `Mock recent ${provider} session`,
            summary: "Mocked recent session summary.",
            projectHint: scope.projectName
        }));
    return RecentSessionsOutputSchema.parse({
        sessions: rankSessions(sessions, scope).slice(0, input.limit ?? 10),
        scopeDiagnostics: scope,
        providersUsed: selectedProviders.map((provider)=>({
                provider,
                available: true,
                used: true,
                status: "ok",
                latencyMs: 1,
                capabilityNotes: [
                    "mock mode"
                ]
            }))
    });
};
const runQueryPast = async (input, mockMode)=>{
    if (mockMode) return mockQueryResult(input);
    const scope = resolveScope(input.scopePath);
    const providerNames = input.providers ?? Object.keys(providers);
    const selected = providerNames.map((name)=>providers[name]);
    const responses = await Promise.allSettled(selected.map((provider)=>provider.queryPast({
            query: input.query,
            scope,
            timeBudgetMs: input.timeBudgetMs ?? 12000
        })));
    const evidence = [];
    const summaries = responses.map((result, idx)=>{
        if ("fulfilled" === result.status) {
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
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        };
    });
    const ranked = rankEvidence(input.query, evidence, scope);
    const output = {
        answer: synthesizeAnswer(input.query, ranked),
        citations: toCitations(ranked, input.maxCitations ?? 5),
        confidence: ranked.length ? Math.min(0.98, ranked[0].relevanceScore + 0.12) : 0.12,
        insufficientEvidence: ranked.length < 1,
        scopeDiagnostics: scope,
        providersUsed: summaries
    };
    return QueryPastOutputSchema.parse(output);
};
const runRecentSessions = async (input, mockMode)=>{
    const scope = resolveScope(input.scopePath);
    if (mockMode) return mockRecentSessionsResult(input);
    const providerNames = input.providers ?? Object.keys(providers);
    const selected = providerNames.map((name)=>providers[name]);
    const responses = await Promise.allSettled(selected.map((provider)=>provider.listRecent({
            scope,
            limit: input.limit ?? 10,
            timeBudgetMs: input.timeBudgetMs ?? 12000
        })));
    const sessions = [];
    const summaries = responses.map((result, idx)=>{
        if ("fulfilled" === result.status) {
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
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        };
    });
    const ranked = rankSessions(sessions, scope).slice(0, input.limit ?? 10);
    return RecentSessionsOutputSchema.parse({
        sessions: ranked,
        scopeDiagnostics: scope,
        providersUsed: summaries
    });
};
const main = async ()=>{
    const args = parseArgs(process.argv.slice(2));
    const mockMode = Boolean(args.mock);
    const input = parseInput(args);
    if ("recent_sessions" === input.mode) {
        const output = await runRecentSessions(input, mockMode);
        process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
        return;
    }
    const output = await runQueryPast(input, mockMode);
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
};
main().catch((error)=>{
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${JSON.stringify({
        error: "history_search_failed",
        message
    }, null, 2)}\n`);
    process.exitCode = 1;
});
