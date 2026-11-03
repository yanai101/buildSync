import { test, expect } from '@playwright/test';
import { collectErrors, expectNoErrorScreen, expectNoErrors, waitForAppReady } from './helpers';

// Visual + functional check of all FeatureTeaser previews via the dev-only
// gallery route, in light and dark mode (desktop + mobile projects).
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`feature teasers (${colorScheme})`, () => {
    test.use({ colorScheme });

    test('all teasers render with unified demoProject data, interactive controls, keyboard nav, and manual-only upgrade popup', async ({ page }, testInfo) => {
      const collector = collectErrors(page);
      await page.addInitScript(() => localStorage.setItem('buildsync:theme', 'auto'));
      await page.goto('/dev/teasers');
      await waitForAppReady(page);
      await expectNoErrorScreen(page);

      // 1. Rooms archive teaser
      const rooms = page.getByTestId('teaser-rooms-owner');
      await expect(rooms.getByRole('heading', { name: 'תיעוד תמונות לפי חדרים' })).toBeVisible();

      // Every sample photo actually loaded (no broken images).
      await rooms.scrollIntoViewIfNeeded();
      const broken = await page.evaluate(async () => {
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img[src^="/teaser/"]'));
        imgs.forEach((img) => { img.loading = 'eager'; });
        await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
        return imgs.filter((img) => img.naturalWidth === 0).map((img) => img.src);
      });
      expect(broken, 'broken sample images').toEqual([]);

      // Clearly marked as a demo with sample data.
      await expect(rooms.getByText('מצב הדגמה').first()).toBeVisible();

      // The upgrade card is visible without scrolling (desktop: beside the demo; mobile: above it).
      const cta = rooms.getByRole('button', { name: 'שדרג ל-Pro' }).first();
      await rooms.scrollIntoViewIfNeeded();
      await expect(cta).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath(`teasers-${colorScheme}.png`), fullPage: false });

      // Rooms demo interactivity
      await rooms.getByRole('button', { name: 'פתח את סלון' }).click();
      await expect(rooms.getByText('חלל הסלון בשלב השלד').first()).toBeVisible();
      await rooms.getByRole('tab', { name: 'לפי שלבים' }).click();
      await expect(rooms.getByRole('tab', { name: 'לפי שלבים' })).toHaveAttribute('aria-selected', 'true');

      // 2. Analytics teaser (unified demoProject budget ₪2,450,000 + expand modal)
      const analytics = page.getByTestId('teaser-analytics-owner');
      await analytics.scrollIntoViewIfNeeded();
      await expect(analytics.getByText('₪2,450,000')).toBeVisible();
      await analytics.getByRole('button', { name: 'הגדל התפלגות הוצאות לפי קטגוריה' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');

      // 3. BOQ teaser (switch rooms + toggle paid status locally)
      const boq = page.getByTestId('teaser-boq-owner');
      await boq.scrollIntoViewIfNeeded();
      await boq.getByLabel('בחירת חדר').selectOption('r_master_bath');
      await expect(boq.getByText('אסלה תלויה + מיכל הדחה סמוי')).toBeVisible();

      // 4. BOQ Wizard teaser (+/- stepper + summary view)
      const wizard = page.getByTestId('teaser-boqwizard-owner');
      await wizard.scrollIntoViewIfNeeded();
      await wizard.getByRole('button', { name: 'הוסף שקע כוח מוגן מים' }).click();
      await expect(wizard.getByText("9 יח'").first()).toBeVisible();
      await wizard.getByRole('button', { name: 'צפה ברשימת יבוא מרוכזת' }).click();
      await expect(wizard.getByText('רשימת יבוא מרוכזת')).toBeVisible();

      // 5. Daily Logs teaser (switch between daily log and history tab)
      const logs = page.getByTestId('teaser-dailylogs-owner');
      await logs.scrollIntoViewIfNeeded();
      await logs.getByRole('tab', { name: /היסטוריית יומנים/ }).click();
      await expect(logs.getByText('דוחות נעולים').first()).toBeVisible();

      // 6. Orders teaser (filter by pending/partial)
      const orders = page.getByTestId('teaser-orders-owner');
      await orders.scrollIntoViewIfNeeded();
      await orders.getByRole('button', { name: /בהמתנה לאספקה/ }).first().click();
      await expect(orders.getByText('חזי בנק')).toBeVisible();

      // 7. Permits teaser (open permit document preview modal)
      const permits = page.getByTestId('teaser-permits-owner');
      await permits.scrollIntoViewIfNeeded();
      await permits.getByRole('button', { name: 'צפה במסמך' }).first().click();
      await expect(page.getByText('היתר_בנייה_חתום_2026.pdf')).toBeVisible();
      await page.keyboard.press('Escape');

      // 8. Financing teaser (expand equity source)
      const financing = page.getByTestId('teaser-financing-owner');
      await financing.scrollIntoViewIfNeeded();
      await expect(financing.getByText('משכנתא לבנייה עצמית — בנק לאומי')).toBeVisible();
      await financing.getByRole('button', { name: /הון עצמי/ }).click();
      await expect(financing.getByText('שימש לתשלומי אגרות, תכנון, ביסוס ומקדמות שלד')).toBeVisible();

      // No upgrade popup has opened automatically during any of this interaction!
      await expect(page.getByRole('button', { name: /שדרג למנוי שנתי/ })).toHaveCount(0);

      // Team member variant: no buy button, explanatory message instead.
      const member = page.getByTestId('teaser-docs-member');
      await expect(member.getByRole('button', { name: /שדרג ל-/ })).toHaveCount(0);
      await expect(member.getByText('כאשר בעל הפרויקט ישדרג')).toBeVisible();

      // Keyboard navigation check: focus CTA and activate via Enter
      await rooms.scrollIntoViewIfNeeded();
      await cta.focus();
      await expect(cta).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: /שדרג למנוי שנתי/ })).toBeVisible();
      await expect(page.getByText('תיעוד תמונות לכל חדר לפי שלבי הבנייה', { exact: false })).toBeVisible();

      expectNoErrors(collector, `teaser gallery (${colorScheme})`);
    });
  });
}
