import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      "history-search": "./skills/agentic-history-search/scripts/history-search.ts",
    },
  },
  lib: [
    {
      format: "esm",
      syntax: "es2022",
      dts: false,
    },
  ],
  output: {
    target: "node",
    distPath: {
      root: "skills/agentic-history-search/dist",
    },
    cleanDistPath: true,
  },
});
