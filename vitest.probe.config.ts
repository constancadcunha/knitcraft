import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Config for live network probes against OpenRouter. Kept separate from
 * vitest.config.ts so `npm test` never makes network calls.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["scripts/**/*.probe.ts"],
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
