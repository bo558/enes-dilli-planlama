// Tek dosyalık derlemenin sunucusuz (file://) açıldığını doğrular.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const url = pathToFileURL(resolve('dist/index.html')).href;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ locale: 'tr-TR', viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const external = [];
page.on('request', (r) => { if (/^https?:/.test(r.url())) external.push(r.url()); });

await page.goto(url);
await page.getByTestId('ob-demo').click();
await page.getByTestId('day-hero').waitFor();
await page.locator('[data-testid="task-row"]:visible:not(.is-done)').first().locator('.task-check').click();
await page.waitForTimeout(300);
const pct = await page.getByTestId('day-pct').textContent();
await page.reload();
await page.getByTestId('day-hero').waitFor();
const after = await page.getByTestId('day-pct').textContent();
const font = await page.evaluate(async () => {
  await document.fonts.ready;
  return document.fonts.check('600 16px "Manrope Variable"');
});
console.log({ yuzde: pct, yenilemeSonrasi: after, font, disIstek: external.length, hata: errors });
await browser.close();
process.exit(pct === after && font && external.length === 0 && errors.length === 0 ? 0 : 1);
