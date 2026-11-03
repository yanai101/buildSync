import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'e2e/.auth/user.json';

// Dev test account, loaded from `.env.e2e` by playwright.config.ts.
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

setup('log in with the dev test account', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Missing E2E_EMAIL / E2E_PASSWORD — copy .env.e2e.example to .env.e2e and fill them in.');
  }
  await page.goto('/login');
  const email = page.getByRole('textbox', { name: 'אימייל' });
  const password = page.getByRole('textbox', { name: 'סיסמה' });

  // The login form is server-rendered; React hydration can reset inputs that
  // were filled too early. Retry fill + submit until we leave /login.
  await expect(async () => {
    await email.fill(EMAIL);
    await password.fill(PASSWORD);
    await expect(email).toHaveValue(EMAIL);
    await expect(password).toHaveValue(PASSWORD);
    await page.getByRole('button', { name: 'כניסה למערכת' }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 });
  }).toPass({ timeout: 45_000, intervals: [1_000, 2_000, 3_000] });
  // Same device-level flags the app sets when the user dismisses the welcome
  // modal / onboarding tour / install prompt, so overlays don't block clicks.
  await page.evaluate(() => {
    localStorage.setItem('buildsync:welcome_onboarding_completed', 'true');
    localStorage.setItem('buildsync:tour_completed', 'true');
    localStorage.setItem('buildsync:install-prompt-dismissed', 'true');
  });
  // Convex Auth stores its tokens in localStorage, which storageState captures.
  await page.waitForTimeout(1_000);
  await page.context().storageState({ path: AUTH_FILE });
});
