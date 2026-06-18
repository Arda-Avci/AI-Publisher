/// <reference types="vitest/globals" />
import 'dotenv/config';
import { defineConfig } from 'vitest/config';

process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
    },
    exclude: ['**/.claude/**', '**/node_modules/**', 'client/**'],
    execArgv: ['--max-old-space-size=4096'],
    fileParallelism: false,
    testTimeout: 300000,
    hookTimeout: 300000,
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
