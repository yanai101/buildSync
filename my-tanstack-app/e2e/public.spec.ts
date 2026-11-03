import { test, expect } from '@playwright/test';
import { collectErrors, expectNoErrorScreen, expectNoErrors, waitForAppReady } from './helpers';

/** Pages that are reachable without logging in. */
const PUBLIC_PAGES = ['/', '/login', '/register', '/terms', '/privacy'];

test.describe('public pages load without errors', () => {
  for (const path of PUBLIC_PAGES) {
    test(`loads ${path}`, async ({ page }) => {
      const collector = collectErrors(page);
      const res = await page.goto(path);
      expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(400);
      await waitForAppReady(page);
      await expectNoErrorScreen(page);
      expectNoErrors(collector, path);
    });
  }

  test('unknown route while logged out redirects to login (not a crash)', async ({ page }) => {
    const collector = collectErrors(page);
    await page.goto('/this-page-does-not-exist-e2e');
    await waitForAppReady(page);
    await expect(page.getByText('Component Crashed!')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'כניסה למערכת' }).or(page.getByText('הדף שחיפשת לא נמצא'))).toBeVisible();
    // A 404 for the missing route itself is expected; anything else is not.
    expectNoErrors({ errors: collector.errors.filter((e) => !/404|Not Found/i.test(e)) }, 'unknown route');
  });
});
