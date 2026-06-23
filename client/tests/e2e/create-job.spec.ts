import { test, expect } from '@playwright/test';

test.describe('Create Job', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', { timeout: 10000 });
    await page.fill('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', 'arda.avci@gmail.com');
    await page.fill('input[type="password"]', 'admin1234!!');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('should create a new job with master prompt', async ({ page }) => {
    await page.fill('textarea[placeholder*="prompt"], input[placeholder*="prompt"]', 'Test video about AI technology');
    await page.click('button:has-text("Oluştur"), button:has-text("Create")');
    await expect(page.locator('[data-testid="job-item"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('should show validation error when prompt is empty', async ({ page }) => {
    await page.click('button:has-text("Oluştur"), button:has-text("Create")');
    await expect(page.locator('text=/gerekli|required|zorunlu/i')).toBeVisible({ timeout: 3000 });
  });
});
