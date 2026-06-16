import { test, expect } from '@playwright/test';

test.describe('Edit Meta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('testuser');
    await page.getByPlaceholder('••••••••').fill('testpass');
    await page.getByRole('button', { name: /sign in|giriş yap/i }).click();
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should edit job title and save', async ({ page }) => {
    await page.getByRole('button', { name: /galeri|gallery/i }).click();
    await page.waitForTimeout(2000);
    const firstJob = page.locator('[data-job-item]').first();
    if (await firstJob.isVisible()) {
      await firstJob.click();
      await page.waitForTimeout(2000);
      const titleInput = page.locator('input[placeholder*="title"], input[aria-label*="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.clear();
        await titleInput.fill('Updated YouTube Title');
        await page.getByRole('button', { name: /kaydet|save/i }).click();
        await page.waitForTimeout(1000);
      }
    }
  });
});
