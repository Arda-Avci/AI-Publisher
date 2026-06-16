import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('testuser');
    await page.getByPlaceholder('••••••••').fill('testpass');
    await page.getByRole('button', { name: /sign in|giriş yap/i }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('wrong');
    await page.getByPlaceholder('••••••••').fill('wrongpass');
    await page.getByRole('button', { name: /sign in|giriş yap/i }).click();
    const errorMsg = page.getByText(/invalid|错误|hatalı|geçersiz/i);
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });
});
