// Etkileşimli durumların görüntüsünü alır ve farklı genişliklerde taşma kontrolü yapar.
import { chromium } from 'playwright-core';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'http://127.0.0.1:5173/';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'ekranlar');
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const go = (page, hash) => page.evaluate((h) => { location.hash = h; }, hash);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const problems = [];

const fresh = async (opts) => {
  const ctx = await browser.newContext({ locale: 'tr-TR', timezoneId: 'Europe/Istanbul', ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`konsol: ${m.text()}`); });
  await page.goto(BASE);
  return { ctx, page };
};
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESK = { viewport: { width: 1440, height: 900 } };

// Masaüstü
{
  const { ctx, page } = await fresh(DESK);
  await page.waitForTimeout(600);
  await shot(page, 't-m-karsilama');
  await page.getByTestId('ob-demo').click();
  await page.waitForTimeout(600);
  await go(page, '#/tasarim');
  await page.waitForTimeout(600);
  await page.locator('.ds-pets__row').nth(2).scrollIntoViewIfNeeded();
  await shot(page, 't-m-yoldaslar');
  await go(page, '#/raporlar');
  await page.getByRole('button', { name: 'Aylık' }).click();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(200);
  await shot(page, 't-m-rapor-ay');
  await go(page, '#/planla');
  await page.getByRole('button', { name: 'Ay', exact: true }).click();
  await page.waitForTimeout(500);
  await shot(page, 't-m-takvim-ay');
  await go(page, '#/odak');
  await page.getByTestId('focus-start').click();
  await page.waitForTimeout(1500);
  await shot(page, 't-m-odak');
  await page.getByTestId('focus-finish').click();
  await page.waitForTimeout(300);
  await page.getByTestId('coach-launcher').click();
  await page.waitForTimeout(500);
  await page.locator('[data-testid="quick-reply"]', { hasText: 'Sürekli erteliyorum' }).click();
  await page.waitForTimeout(1800);
  await shot(page, 't-m-koc-cekmece');
  await ctx.close();
}

// Mobil
{
  const { ctx, page } = await fresh(MOBILE);
  await page.getByTestId('ob-demo').click();
  await page.waitForTimeout(600);
  await shot(page, 't-k-bugun');
  await go(page, '#/planla');
  await page.waitForTimeout(500);
  await shot(page, 't-k-takvim');
  await go(page, '#/gorevler?f=kacan');
  await page.waitForTimeout(400);
  await page.locator('[data-testid="task-row"]:visible').first().click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Ertele', exact: true }).click();
  await page.waitForTimeout(600);
  await shot(page, 't-k-ertele');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await go(page, '#/koc');
  await page.waitForTimeout(400);
  await page.locator('[data-testid="quick-reply"]', { hasText: 'Bu hafta çok yüklüyüm' }).click();
  await page.waitForTimeout(1800);
  await shot(page, 't-k-koc');
  await go(page, '#/odak');
  await page.getByTestId('focus-start').click();
  await page.waitForTimeout(1200);
  await page.getByTestId('focus-expand').click();
  await page.waitForTimeout(600);
  await shot(page, 't-k-odak-tam');
  await page.getByRole('button', { name: 'Tam ekrandan çık' }).click();
  await page.waitForTimeout(600);
  await page.getByTestId('focus-finish').click();
  await page.waitForTimeout(400);
  await go(page, '#/hatirlaticilar');
  await page.waitForTimeout(400);
  await page.getByTestId('notif-test-run').click();
  await page.waitForTimeout(700);
  await shot(page, 't-k-bildirim');
  await page.locator('.push button[aria-label="Kapat"]').click().catch(() => {});
  await go(page, '#/');
  await page.waitForTimeout(300);
  await page.getByTestId('demo-open-mobile').click();
  await page.waitForTimeout(500);
  await shot(page, 't-k-sunum');
  await page.getByTestId('demo-next-stage').click();
  await page.waitForTimeout(2300);
  await shot(page, 't-k-evrim');
  await page.getByTestId('stage-up-close').click();
  await page.waitForTimeout(300);
  await go(page, '#/profil');
  await page.getByRole('button', { name: 'Koyu', exact: true }).click();
  await go(page, '#/');
  await page.waitForTimeout(500);
  await shot(page, 't-k-koyu');
  await ctx.close();
}

// Mobil karşılama adımları
{
  const { ctx, page } = await fresh(MOBILE);
  await page.getByTestId('ob-start').click();
  await page.getByTestId('ob-name').fill('Ece');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-age').check();
  await page.getByTestId('ob-privacy').check();
  await page.waitForTimeout(250);
  await shot(page, 't-o-onay');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-area-planlama').click();
  await page.waitForTimeout(300);
  await shot(page, 't-o-alan');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-struggle-zaman').click();
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-goal').fill('Yan projemi ilk müşteriye ulaştırmak');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-next').click();
  await page.waitForTimeout(350);
  await shot(page, 't-o-plan');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-pet-turna').click();
  await page.getByTestId('ob-petname').fill('Sabır');
  await page.waitForTimeout(350);
  await shot(page, 't-o-yoldas');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-first-task').click();
  await page.waitForTimeout(900);
  await shot(page, 't-o-ilk');
  await ctx.close();
}

// Taşma kontrolü: küçük telefon, tablet, küçük dizüstü
const ROUTES = ['#/', '#/planla', '#/gorevler', '#/hedefler', '#/hedefler/g-yan-proje', '#/hedefler/yeni', '#/koc', '#/odak', '#/hayvan', '#/raporlar', '#/hatirlaticilar', '#/ben', '#/profil', '#/abonelik', '#/tasarim'];
for (const [name, w, h] of [['320', 320, 640], ['360', 360, 720], ['768', 768, 1024], ['1024', 1024, 768], ['1280', 1280, 720]]) {
  const { ctx, page } = await fresh({ viewport: { width: w, height: h } });
  await page.getByTestId('ob-demo').click();
  await page.waitForTimeout(250);
  for (const r of ROUTES) {
    await go(page, r);
    await page.waitForTimeout(180);
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (o > 1) {
      const who = await page.evaluate(() => {
        const W = document.documentElement.clientWidth;
        const el = [...document.querySelectorAll('body *')].find((e) => e.getBoundingClientRect().right > W + 1 && getComputedStyle(e).position !== 'fixed');
        return el ? `${el.tagName}.${el.className?.toString().slice(0, 40)}` : '?';
      });
      problems.push(`taşma ${name}px ${r}: ${o}px (${who})`);
    }
  }
  if (name === '768') { await go(page, '#/'); await page.waitForTimeout(300); await shot(page, 't-tablet'); }
  await ctx.close();
}

await browser.close();
console.log(problems.length ? `SORUNLAR:\n${problems.join('\n')}` : 'Sorun yok.');
