// Tek ekran görüntüsü: node tests/e2e/shot-one.mjs <hash> <dosya> [mobil|masaustu] [koyu]
import { chromium } from 'playwright-core';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [hash, name, mode = 'masaustu', theme] = process.argv.slice(2);
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'ekranlar');
const opts = mode === 'mobil'
  ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
  : { viewport: { width: 1440, height: 900 } };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ locale: 'tr-TR', reducedMotion: 'reduce', ...opts });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:5173/');
await page.getByTestId('ob-demo').click();
await page.waitForTimeout(300);
if (theme === 'koyu') {
  await page.evaluate(() => { location.hash = '#/profil'; });
  await page.getByRole('button', { name: 'Koyu' }).click();
}
await page.evaluate((h) => { location.hash = h; }, hash);
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: process.env.FULL === '1' });
await browser.close();
