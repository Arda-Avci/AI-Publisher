import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login and redirect to dashboard', async ({ page }) => {
    await page.goto('/');
    // Wait for React login form to render
    await page.waitForSelector('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', { timeout: 10000 });
    await page.fill('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', 'arda.avci@gmail.com');
    await page.fill('input[type="password"]', 'admin1234!!');
    await page.click('button[type="submit"]');
    // Wait for dashboard after login
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', { timeout: 10000 });
    await page.fill('input[placeholder*="e-posta"], input[placeholder*="you@example.com"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    const errorMsg = page.locator('text=/Geçersiz|Invalid|Hatalı/i');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });
});
