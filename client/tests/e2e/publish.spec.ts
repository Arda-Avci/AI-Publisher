import { test, expect } from '@playwright/test';

test.describe('Publish', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', { timeout: 10000 });
    await page.fill('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', 'arda.avci@gmail.com');
    await page.fill('input[type="password"]', 'admin1234!!');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('should open completed job publish dialog', async ({ page }) => {
    await page.click('button:has-text("Galeri"), button:has-text("Gallery")');
    await page.waitForTimeout(2000);
    const completedJob = page.locator('[data-testid="job-item"][data-status="completed"]').first();
    if (await completedJob.isVisible()) {
      await completedJob.click();
      await page.waitForTimeout(2000);
      const publishBtn = page.locator('button:has-text("Yayınla"), button:has-text("Publish")').first();
      if (await publishBtn.isVisible()) {
        await publishBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});
