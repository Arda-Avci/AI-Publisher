import { test, expect } from '@playwright/test';

test.describe('Progress Bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('testuser');
    await page.getByPlaceholder('••••••••').fill('testpass');
    await page.getByRole('button', { name: /sign in|giriş yap/i }).click();
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should show progress bar for active job', async ({ page }) => {
    await page.getByRole('button', { name: /galeri|gallery/i }).click();
    await page.waitForTimeout(2000);
    const processingJob = page.locator('[data-job-item][data-status="processing"]').first();
    if (await processingJob.isVisible()) {
      await processingJob.click();
      await page.waitForTimeout(2000);
      const progressBar = page.locator('[data-progress-bar], progress, [role="progressbar"]').first();
      await expect(progressBar).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display stage messages during production', async ({ page }) => {
    await page.getByRole('button', { name: /galeri|gallery/i }).click();
    await page.waitForTimeout(2000);
    const processingJob = page.locator('[data-job-item][data-status="processing"]').first();
    if (await processingJob.isVisible()) {
      await processingJob.click();
      await page.waitForTimeout(2000);
      const stageMsg = page.locator('[data-stage-message], [data-status-msg]').first();
      await expect(stageMsg).toBeVisible({ timeout: 5000 });
    }
  });
});
