import { test, expect } from '@playwright/test';

test.describe('Gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', { timeout: 10000 });
    await page.fill('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', 'arda.avci@gmail.com');
    await page.fill('input[type="password"]', 'admin1234!!');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('should display job list in gallery', async ({ page }) => {
    await page.click('button:has-text("Galeri"), button:has-text("Gallery")');
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="job-item"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should open job details when clicked', async ({ page }) => {
    await page.click('button:has-text("Galeri"), button:has-text("Gallery")');
    await page.waitForTimeout(2000);
    const firstJob = page.locator('[data-testid="job-item"]').first();
    if (await firstJob.isVisible()) {
      await firstJob.click();
      await page.waitForTimeout(1000);
    }
  });
});
