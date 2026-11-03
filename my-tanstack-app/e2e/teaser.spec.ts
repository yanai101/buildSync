import { test, expect } from '@playwright/test';
import { collectErrors, expectNoErrorScreen, expectNoErrors, waitForAppReady } from './helpers';

// Visual + functional check of the FeatureTeaser previews via the dev-only
// gallery route, in light and dark mode.
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`feature teasers (${colorScheme})`, () => {
    test.use({ colorScheme });

    test('render without errors, sample photos load, popup opens only from the button', async ({ page }, testInfo) => {
      const collector = collectErrors(page);
      await page.addInitScript(() => localStorage.setItem('buildsync:theme', 'auto'));
      await page.goto('/dev/teasers');
      await waitForAppReady(page);
      await expectNoErrorScreen(page);

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

      // The rooms demo is interactive: switch room, view and category; open the gallery.
      await rooms.getByRole('button', { name: 'פתח את סלון' }).click();
      await expect(rooms.getByText('חלל הסלון בשלב השלד').first()).toBeVisible();
      await rooms.getByRole('tab', { name: 'לפי שלבים' }).click();
      await expect(rooms.getByRole('tab', { name: 'לפי שלבים' })).toHaveAttribute('aria-selected', 'true');
      await rooms.getByRole('button', { name: /^חשמל/ }).click();
      await expect(rooms.getByText('חלל הסלון בשלב השלד')).toHaveCount(0);
      await rooms.getByRole('tab', { name: 'כל התמונות' }).click();
      await rooms.getByRole('button', { name: 'הצג תמונה בגודל מלא' }).first().click();
      await expect(page.getByText('נתוני דוגמה', { exact: false }).last()).toBeVisible();
      await page.keyboard.press('Escape');

      // No popup until the user clicks the upgrade button.
      await expect(page.getByRole('button', { name: /שדרג למנוי שנתי/ })).toHaveCount(0);

      // Team member variant: no buy button, explanatory message instead.
      const member = page.getByTestId('teaser-docs-member');
      await expect(member.getByRole('button', { name: /שדרג ל-/ })).toHaveCount(0);
      await expect(member.getByText('כאשר בעל הפרויקט ישדרג')).toBeVisible();

      // Owner variant: the button opens the Pro popup.
      await cta.click();
      await expect(page.getByRole('button', { name: /שדרג למנוי שנתי/ })).toBeVisible();
      await expect(page.getByText('תיעוד תמונות לכל חדר לפי שלבי הבנייה', { exact: false })).toBeVisible();

      expectNoErrors(collector, `teaser gallery (${colorScheme})`);
    });
  });
}
