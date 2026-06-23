import { test, expect } from '@playwright/test';

test.describe('Progress Bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', { timeout: 10000 });
    await page.fill('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', 'arda.avci@gmail.com');
    await page.fill('input[type="password"]', 'admin1234!!');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show progress bar for active job', async ({ page }) => {
    await page.click('button:has-text("Galeri"), button:has-text("Gallery")');
    await page.waitForTimeout(2000);
    const processingJob = page.locator('[data-testid="job-item"][data-status="processing"]').first();
    if (await processingJob.isVisible()) {
      await processingJob.click();
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="progress-bar"], progress, [role="progressbar"]').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display stage messages during production', async ({ page }) => {
    await page.click('button:has-text("Galeri"), button:has-text("Gallery")');
    await page.waitForTimeout(2000);
    const processingJob = page.locator('[data-testid="job-item"][data-status="processing"]').first();
    if (await processingJob.isVisible()) {
      await processingJob.click();
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="stage-message"]').first()).toBeVisible({ timeout: 5000 });
    }
  });
});
