import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/.claude/**', '**/node_modules/**'],
    execArgv: ['--max-old-space-size=4096'],
  },
});
