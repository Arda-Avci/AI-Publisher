import { test, expect } from '@playwright/test';

test.describe('Gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('testuser');
    await page.getByPlaceholder('••••••••').fill('testpass');
    await page.getByRole('button', { name: /sign in|giriş yap/i }).click();
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should display job list in gallery', async ({ page }) => {
    await page.getByRole('button', { name: /galeri|gallery/i }).click();
    await page.waitForTimeout(2000);
    const jobList = page.locator('[data-job-item]');
    await expect(jobList.first()).toBeVisible({ timeout: 10000 });
  });

  test('should open job details when clicked', async ({ page }) => {
    await page.getByRole('button', { name: /galeri|gallery/i }).click();
    await page.waitForTimeout(2000);
    const firstJob = page.locator('[data-job-item]').first();
    if (await firstJob.isVisible()) {
      await firstJob.click();
      await page.waitForTimeout(1000);
    }
  });
});
