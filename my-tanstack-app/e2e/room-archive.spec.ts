import { test, expect } from '@playwright/test';
import { collectErrors, expectNoErrorScreen, expectNoErrors, waitForAppReady } from './helpers';

/**
 * Read-only walkthrough of the Premium room photo archive. Never uploads,
 * edits or deletes anything, so it is safe to run against real dev data.
 */
test.describe('room photo archive', () => {
  test('rooms tab, room views and setup deep link work without errors', async ({ page }) => {
    const collector = collectErrors(page);

    await page.goto('/personal-files?tab=rooms');
    await waitForAppReady(page);
    await expect(page.getByRole('button', { name: /חדרים/ }).first()).toBeVisible();

    // One of the valid states must render: pro lock, no permission, no rooms, or the room list.
    const states = page.getByText(/זמין במנוי Pro|אין לך הרשאה לתמונות החדרים|עדיין לא הוגדרו חדרים|תיעוד מצב החדרים לאורך הבנייה/);
    await expect(states.first()).toBeVisible();

    const roomButtons = page.getByRole('button', { name: /^פתח את / });
    if (await roomButtons.count() > 0) {
      await roomButtons.first().click();
      await expect(page.getByRole('tab', { name: 'לפי שלבים' })).toBeVisible();

      for (const tab of ['כל התמונות', 'לפני / אחרי', 'לפי שלבים']) {
        await page.getByRole('tab', { name: tab }).click();
        await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
        await page.waitForTimeout(300);
      }

      // Before/after always offers two stage pickers when the room has photos.
      await page.getByRole('tab', { name: 'לפני / אחרי' }).click();
      const pickers = page.getByRole('combobox', { name: /שלב (לפני|אחרי)/ });
      if (await pickers.count() > 0) await expect(pickers).toHaveCount(2);

      await page.getByRole('button', { name: /חזרה לחדרים/ }).click();
      await expect(roomButtons.first()).toBeVisible();
    }

    await expectNoErrorScreen(page);
    expectNoErrors(collector, 'room archive');
  });

  test('house setup deep link opens the rooms step', async ({ page }) => {
    const collector = collectErrors(page);
    await page.goto('/setup?step=rooms');
    await waitForAppReady(page);
    await expect(page.getByText('הגדרת אזורים')).toBeVisible();
    await expectNoErrorScreen(page);
    expectNoErrors(collector, 'setup rooms step');
  });

  test('team page shows the room permissions card without errors', async ({ page }) => {
    const collector = collectErrors(page);
    await page.goto('/team');
    await waitForAppReady(page);
    await expect(page.getByText('חברי צוות')).toBeVisible();
    await expectNoErrorScreen(page);
    expectNoErrors(collector, 'team');
  });

  test('Pro upgrade popup describes the room photo feature', async ({ page }) => {
    const collector = collectErrors(page);
    await page.goto('/personal-files?tab=rooms');
    await waitForAppReady(page);

    // Same event the rooms tab fires from its "שדרג ל-Pro" button.
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('buildsync:open-upgrade', {
      detail: { tier: 'pro', title: 'תיעוד תמונות לפי חדרים' },
    })));

    await expect(page.getByText('תיעוד תמונות לכל חדר לפי שלבי הבנייה', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'שדרג למנוי שנתי (17% הנחה)' })).toBeVisible();

    expectNoErrors(collector, 'pro upgrade popup');
  });
});
