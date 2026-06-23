import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:3016',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx tsx src/server.ts',
    url: 'http://localhost:3016',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    cwd: '..',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
