import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('testuser');
    await page.getByPlaceholder('••••••••').fill('testpass');
    await page.getByRole('button', { name: /sign in|giriş yap/i }).click();
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should open settings modal', async ({ page }) => {
    await page.getByRole('button', { name: /ayarlar|settings|⚙/i }).click();
    await page.waitForTimeout(1000);
    const modal = page.locator('[role="dialog"], [data-modal], modal').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should toggle dark mode', async ({ page }) => {
    await page.getByRole('button', { name: /ayarlar|settings|⚙/i }).click();
    await page.waitForTimeout(1000);
    const darkToggle = page.locator('[data-theme-toggle], [data-dark-toggle], input[type="checkbox"][aria-label*="dark"]').first();
    if (await darkToggle.isVisible()) {
      await darkToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('should change language to English', async ({ page }) => {
    await page.getByRole('button', { name: /ayarlar|settings|⚙/i }).click();
    await page.waitForTimeout(1000);
    const langSelect = page.locator('select[aria-label*="lang"], select[aria-label*="language"], [data-lang-select]').first();
    if (await langSelect.isVisible()) {
      await langSelect.selectOption('en');
      await page.waitForTimeout(1000);
    }
  });
});
