import { test, expect } from '@playwright/test';

test.describe('Edit Meta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', { timeout: 10000 });
    await page.fill('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', 'arda.avci@gmail.com');
    await page.fill('input[type="password"]', 'admin1234!!');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('should edit job title and save', async ({ page }) => {
    await page.click('button:has-text("Galeri"), button:has-text("Gallery")');
    await page.waitForTimeout(2000);
    const firstJob = page.locator('[data-testid="job-item"]').first();
    if (await firstJob.isVisible()) {
      await firstJob.click();
      await page.waitForTimeout(2000);
      const titleInput = page.locator('input[aria-label*="title"], input[placeholder*="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.clear();
        await titleInput.fill('Updated YouTube Title');
        await page.click('button:has-text("Kaydet"), button:has-text("Save")');
        await page.waitForTimeout(1000);
      }
    }
  });
});
