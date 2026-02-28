import { execFileSync } from "node:child_process";
import path from "node:path";

import type { ScopeDiagnostics } from "./schemas.js";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const detectGitRoot = (cwd: string): string | undefined => {
  try {
    const output = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return output.length ? output : undefined;
  } catch {
    return undefined;
  }
};

export const resolveScope = (scopePath?: string): ScopeDiagnostics => {
  const cwd = path.resolve(scopePath ?? process.cwd());
  const gitRoot = detectGitRoot(cwd);
  const resolvedScope = gitRoot ?? cwd;
  const projectName = path.basename(resolvedScope) || "workspace";
  const aliases = Array.from(
    new Set([projectName.toLowerCase(), slugify(projectName), slugify(resolvedScope), slugify(cwd)]),
  ).sort();

  return {
    cwd,
    gitRoot,
    scopePath: resolvedScope,
    projectName,
    aliases,
    confidence: gitRoot ? 0.95 : 0.7,
  };
};

export const scopeRelevance = (text: string, scope: ScopeDiagnostics): number => {
  const haystack = text.toLowerCase();
  if (!haystack) return 0;

  let score = 0;
  if (haystack.includes(scope.projectName.toLowerCase())) score += 0.35;
  if (haystack.includes(scope.scopePath.toLowerCase().replaceAll(path.sep, "/"))) score += 0.45;
  for (const alias of scope.aliases) {
    if (alias.length > 2 && haystack.includes(alias)) score += 0.1;
  }
  return Math.min(score, 1);
};
