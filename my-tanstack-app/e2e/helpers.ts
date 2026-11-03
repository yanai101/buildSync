import { expect, type Page } from '@playwright/test';

/** Console/page errors that are environmental noise, not app bugs. */
const IGNORED_ERRORS: RegExp[] = [
  /favicon\.ico/i,
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  // Browser push / notification permission noise in headless runs.
  /Notification permission/i,
  /service worker/i,
];

export type ErrorCollector = { errors: string[] };

/**
 * Collects uncaught page errors, console.error output and same-origin 5xx
 * responses for the lifetime of the page.
 */
export function collectErrors(page: Page): ErrorCollector {
  const collector: ErrorCollector = { errors: [] };
  const push = (msg: string) => {
    if (!IGNORED_ERRORS.some((re) => re.test(msg))) collector.errors.push(msg);
  };

  page.on('pageerror', (err) => push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') push(`console.error: ${msg.text()}`);
  });
  page.on('response', (res) => {
    const url = new URL(res.url());
    const sameOrigin = url.origin === new URL(page.url() || 'http://localhost').origin;
    if (sameOrigin && res.status() >= 500) push(`HTTP ${res.status()}: ${url.pathname}`);
  });
  // Some screens register beforeunload guards; never let them block navigation.
  page.on('dialog', (dialog) => void dialog.accept().catch(() => {}));
  return collector;
}

/** Text shown by the app's error screens. */
const ERROR_SCREEN_TEXT = [
  'Component Crashed!', // ErrorBoundary
  'אופס, משהו השתבש', // ErrorState / ScreenBoundary
  'הדף שחיפשת לא נמצא', // NotFound
];

/** Waits until the app shell has rendered and the loading screens are gone. */
export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).toBeVisible();
  // Convex keeps a websocket open, so "networkidle" never fires — instead wait
  // for the main content area and give live queries a moment to settle.
  await page.locator('main, .page-content').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1_500);
}

export async function expectNoErrorScreen(page: Page) {
  for (const text of ERROR_SCREEN_TEXT) {
    await expect(page.getByText(text, { exact: false }), `error screen "${text}" is shown`).toHaveCount(0);
  }
}

export function expectNoErrors(collector: ErrorCollector, context: string) {
  expect(collector.errors, `errors while loading ${context}:\n${collector.errors.join('\n')}`).toEqual([]);
}
