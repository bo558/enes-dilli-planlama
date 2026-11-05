// Tüm ekranların masaüstü ve mobil görüntüsünü alır, konsol hatalarını raporlar.
// Kullanım: node tests/e2e/shots.mjs [filtre]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'ekranlar');
mkdirSync(OUT, { recursive: true });
const filter = process.argv[2];

const ROUTES = [
  ['bugun', '#/'],
  ['takvim-hafta', '#/planla'],
  ['gorevler', '#/gorevler'],
  ['hedefler', '#/hedefler'],
  ['hedef-detay', '#/hedefler/g-yan-proje'],
  ['hedef-yeni', '#/hedefler/yeni'],
  ['koc', '#/koc'],
  ['odak', '#/odak'],
  ['yoldas', '#/hayvan'],
  ['raporlar', '#/raporlar'],
  ['hatirlaticilar', '#/hatirlaticilar'],
  ['ben', '#/ben'],
  ['profil', '#/profil'],
  ['abonelik', '#/abonelik'],
];

const VIEWPORTS = [
  { name: 'masaustu', viewport: { width: 1440, height: 900 } },
  { name: 'mobil', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const problems = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ locale: 'tr-TR', timezoneId: 'Europe/Istanbul', reducedMotion: 'reduce', ...vp });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${vp.name}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${vp.name}] pageerror: ${e.message}`));

  await page.goto(BASE);
  await page.waitForTimeout(500);
  if (!filter || 'karsilama'.includes(filter)) await page.screenshot({ path: join(OUT, `${vp.name}-karsilama.png`) });
  await page.getByTestId('ob-demo').click();
  await page.waitForTimeout(400);

  for (const [name, hash] of ROUTES) {
    if (filter && !name.includes(filter)) continue;
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.waitForTimeout(450);
    await page.screenshot({ path: join(OUT, `${vp.name}-${name}.png`), fullPage: vp.name === 'mobil' ? false : false });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) problems.push(`[${vp.name}] ${name}: yatay taşma ${overflow}px`);
  }
  await ctx.close();
}

await browser.close();
console.log(problems.length ? `SORUNLAR:\n${problems.join('\n')}` : 'Konsol hatası veya yatay taşma yok.');
