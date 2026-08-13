import { test, expect } from '@playwright/test';

test('admin can log in, create a banner, and view it', async ({ page }) => {
  // 1. Visit Admin Login page
  await page.goto('/admin/login');

  // 2. Fill login credentials
  await page.fill('input[type="email"]', 'admin@sunotal.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // 3. Verify redirection to Dashboard
  await expect(page).toHaveURL(/\/admin\/dashboard/);

  // 4. Navigate to Banners management
  await page.goto('/admin/banners');

  // 5. Check if banners page loads
  await expect(page.getByRole('heading', { name: 'Hero Banners' })).toBeVisible();

  // 6. Click on Add Banner
  await page.click('button:has-text("Add Banner")');

  // 7. Fill out the banner form
  await page.fill('input[placeholder="Festive discounts 2026..."]', 'Special Summer Promotion');
  
  // 8. Mock/Trigger file upload (since S3 upload fails or falls back locally, we can upload a small buffer)
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click('text=Click to upload banner image');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'summer-banner.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('fake-image-data')
  });

  // 9. Click on Create Banner
  await page.click('button:has-text("Create Banner")');

  // 10. Verify success toast or new banner in grid
  await expect(page.locator('text=Special Summer Promotion')).toBeVisible();

  // 11. Delete the banner to clean up
  await page.click('button:has-text("Delete")');
  await page.click('button:has-text("Delete Banner")');

  // 12. Verify deleted banner is gone
  await expect(page.locator('text=Special Summer Promotion')).not.toBeVisible();
});
