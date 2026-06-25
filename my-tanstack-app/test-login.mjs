import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'doraa@mail.com');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000); // wait for network and react
  const cookies = await context.cookies();
  console.log("Cookies:", cookies);
  console.log("Current URL:", page.url());
  await browser.close();
})();
