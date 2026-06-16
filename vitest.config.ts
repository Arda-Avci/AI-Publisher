/// <reference types="vitest/globals" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/.claude/**', '**/node_modules/**', 'client/**'],
    execArgv: ['--max-old-space-size=4096'],
    fileParallelism: false,
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
} as Parameters<typeof defineConfig>[0]);
