import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Live API probes live in scripts/, not here — `npm test` stays offline.
    include: ["src/**/*.test.ts"],
  },
});
