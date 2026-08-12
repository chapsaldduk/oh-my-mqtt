import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["e2e/**/*.e2e.ts"],
    testTimeout: 120_000,
    hookTimeout: 60_000,
    // Electron instances fight over the display and over ports; keep them serial.
    fileParallelism: false,
    maxWorkers: 1,
  },
});
