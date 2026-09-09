# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> has title or brand logo
- Location: e2e/app.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  1 | import { test, expect } from '@playwright/test';
  2 | 
  3 | test('has title or brand logo', async ({ page }) => {
> 4 |   await page.goto('/');
    |              ^ Error: page.goto: Test timeout of 30000ms exceeded.
  5 |   // Basic sanity check to verify page loads
  6 |   const body = page.locator('body');
  7 |   await expect(body).toBeVisible();
  8 | });
  9 | 
```