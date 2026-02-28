import { copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const distDir = path.resolve("skills/agentic-history-search/dist");
const esmJsPath = path.join(distDir, "history-search.js");
const esmMjsPath = path.join(distDir, "history-search.mjs");

try {
  await access(esmJsPath, constants.F_OK);
  await copyFile(esmJsPath, esmMjsPath);
  process.stdout.write(`Created ESM alias: ${path.relative(process.cwd(), esmMjsPath)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`postbuild warning: unable to create .mjs alias (${message})\n`);
  process.exitCode = 1;
}
