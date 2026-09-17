import { test, expect } from '@playwright/test';

test.describe('Sunotal Full-Stack E2E Flow', () => {
  const ADMIN_URL = process.env.ADMIN_APP_URL || 'https://admin-sunotal.automateuniverse.space';
  const PUBLIC_URL = process.env.PUBLIC_APP_URL || 'https://sunotal.automateuniverse.space';
  const MONITORING_URL = process.env.MONITORING_APP_URL || 'https://monitoring-sunotal.automateuniverse.space';

  test('1. Admin Login Flow', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await page.fill('input[type="email"]', 'admin@sunotal.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard upon successful login
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('2. Public Storefront Navigation & Guest State', async ({ page }) => {
    await page.goto(PUBLIC_URL);
    // Unauthenticated user should see Login button in header
    const loginButton = page.locator('text=Login');
    await expect(loginButton).toBeVisible();
  });

  test('3. Live Monitoring Telemetry Probe', async ({ page }) => {
    await page.goto(MONITORING_URL);
    // Should render Live Telemetry Probe dashboard
    await expect(page.locator('text=Telemetry')).toBeVisible();
  });
});
