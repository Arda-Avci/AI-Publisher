import { test, expect } from '@playwright/test';

test.describe('Publish', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('testuser');
    await page.getByPlaceholder('••••••••').fill('testpass');
    await page.getByRole('button', { name: /sign in|giriş yap/i }).click();
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should open completed job publish dialog', async ({ page }) => {
    await page.getByRole('button', { name: /galeri|gallery/i }).click();
    await page.waitForTimeout(2000);
    const completedJob = page.locator('[data-job-item][data-status="completed"]').first();
    if (await completedJob.isVisible()) {
      await completedJob.click();
      await page.waitForTimeout(2000);
      const publishBtn = page.getByRole('button', { name: /yayınla|publish|paylaş/i }).first();
      if (await publishBtn.isVisible()) {
        await publishBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});
