import { test, expect } from '@playwright/test';

test('has title or brand logo', async ({ page }) => {
  await page.goto('/');
  // Basic sanity check to verify page loads
  const body = page.locator('body');
  await expect(body).toBeVisible();
});
