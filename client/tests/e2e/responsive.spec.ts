import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('should render mobile layout at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page.locator('form, [role="form"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should render tablet layout at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page.locator('form, [role="form"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should render desktop layout at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page.locator('form, [role="form"]').first()).toBeVisible({ timeout: 5000 });
  });
});
