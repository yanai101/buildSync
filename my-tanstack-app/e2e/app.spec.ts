import { test, expect } from '@playwright/test';
import { collectErrors, expectNoErrorScreen, expectNoErrors, waitForAppReady } from './helpers';

/** Every authenticated page in the app (see src/routes). */
const APP_PAGES = [
  '/dashboard',
  '/projects',
  '/setup',
  '/setup?step=rooms',
  '/team',
  '/stages',
  '/contractors',
  '/orders',
  '/boq',
  '/boqwizard',
  '/checklists',
  '/permits',
  '/daily-logs',
  '/photos',
  '/plans',
  '/notes',
  '/personal-files',
  '/personal-files?tab=rooms',
  '/budget',
  '/financing',
  '/analytics',
  '/quotes',
  '/timeline',
  '/announcements',
  '/guides',
  '/account',
];

test.describe('app pages load without errors', () => {
  for (const path of APP_PAGES) {
    test(`loads ${path}`, async ({ page }) => {
      const collector = collectErrors(page);
      const res = await page.goto(path);
      expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(400);
      await waitForAppReady(page);
      await expect(page, 'session expired — re-run the auth setup').not.toHaveURL(/\/login/);
      await expectNoErrorScreen(page);
      expectNoErrors(collector, path);
    });
  }

  test('unknown route shows the 404 page (not a crash)', async ({ page }) => {
    const collector = collectErrors(page);
    await page.goto('/this-page-does-not-exist-e2e');
    await expect(page.getByText('הדף שחיפשת לא נמצא')).toBeVisible();
    await expect(page.getByText('Component Crashed!')).toHaveCount(0);
    expectNoErrors({ errors: collector.errors.filter((e) => !/404|Not Found/i.test(e)) }, '404 page');
  });

  test('color scheme selector switches data-accent and updates live preview without errors', async ({ page }) => {
    const collector = collectErrors(page);
    await page.goto('/account');
    await waitForAppReady(page);
    await expectNoErrorScreen(page);

    const section = page.getByTestId('color-scheme-section');
    await expect(section).toBeVisible();
    await expect(page.getByTestId('scheme-preview-light')).toBeVisible();
    await expect(page.getByTestId('scheme-preview-dark')).toBeVisible();

    await page.getByTestId('scheme-btn-blue').click();
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'blue');

    await page.getByTestId('scheme-btn-teal').click();
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'teal');

    await page.getByTestId('scheme-btn-orange').click();
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'orange');

    expectNoErrors(collector, 'color scheme selector');
  });
});
