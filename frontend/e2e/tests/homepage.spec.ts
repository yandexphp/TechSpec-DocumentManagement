import { expect, test } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'en');
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/TechSpec Storage/i);
});
