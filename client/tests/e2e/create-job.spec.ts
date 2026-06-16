import { test, expect } from '@playwright/test';

test.describe('Create Job', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('testuser');
    await page.getByPlaceholder('••••••••').fill('testpass');
    await page.getByRole('button', { name: /sign in|giriş yap/i }).click();
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should create a new job with master prompt', async ({ page }) => {
    await page.getByPlaceholder(/prompt|master prompt/i).first().fill('Test video about AI');
    await page.getByRole('button', { name: /oluştur|create|gönder/i }).click();
    const jobItem = page.locator('[data-job-item]').first();
    await expect(jobItem).toBeVisible({ timeout: 15000 });
  });

  test('should show validation error when prompt is empty', async ({ page }) => {
    await page.getByRole('button', { name: /oluştur|create|gönder/i }).click();
    const validation = page.getByText(/required|doldu gerekli|zorunlu/i);
    await expect(validation).toBeVisible({ timeout: 3000 });
  });
});
