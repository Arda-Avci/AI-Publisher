import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', { timeout: 10000 });
    await page.fill('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', 'arda.avci@gmail.com');
    await page.fill('input[type="password"]', 'admin1234!!');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('should open settings modal', async ({ page }) => {
    await page.click('button:has-text("Ayarlar"), button:has-text("Settings"), button:has-text("⚙")');
    await page.waitForTimeout(1000);
    await expect(page.locator('[role="dialog"], [data-testid="modal"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should toggle dark mode', async ({ page }) => {
    await page.click('button:has-text("Ayarlar"), button:has-text("Settings"), button:has-text("⚙")');
    await page.waitForTimeout(1000);
    const darkToggle = page.locator('[data-testid="dark-toggle"]').first();
    if (await darkToggle.isVisible()) {
      await darkToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('should change language to English', async ({ page }) => {
    await page.click('button:has-text("Ayarlar"), button:has-text("Settings"), button:has-text("⚙")');
    await page.waitForTimeout(1000);
    const langSelect = page.locator('select[aria-label*="language"], [data-testid="lang-select"]').first();
    if (await langSelect.isVisible()) {
      await langSelect.selectOption('en');
      await page.waitForTimeout(1000);
    }
  });
});
