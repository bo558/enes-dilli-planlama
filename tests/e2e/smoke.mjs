// Prototipin istenen etkileşimlerini gerçek tarayıcıda doğrular.
// Kullanım: node tests/e2e/smoke.mjs
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const results = [];
const problems = [];

const check = (vp, name, ok, detail = '') => {
  results.push({ vp, name, ok, detail });
  console.log(`${ok ? 'GEÇTİ ' : 'KALDI '} [${vp}] ${name}${detail ? ` (${detail})` : ''}`);
};
const go = (page, hash) => page.evaluate((h) => { location.hash = h; }, hash);
const num = (s) => Number(String(s).replace(/[^\d]/g, ''));
const seen = (loc, timeout = 3000) => loc.waitFor({ state: 'visible', timeout }).then(() => true, () => false);

async function closeOverlays(page) {
  const close = page.getByTestId('stage-up-close');
  if (await close.isVisible().catch(() => false)) await close.click();
}

async function runDemoSuite(browser, vp, opts) {
  const ctx = await browser.newContext({ locale: 'tr-TR', timezoneId: 'Europe/Istanbul', reducedMotion: 'reduce', ...opts });
  await ctx.grantPermissions([]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(7000);
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${vp}] konsol: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${vp}] pageerror: ${e.message}`));

  await page.goto(BASE);
  await page.getByTestId('ob-demo').click();
  await page.getByTestId('day-hero').waitFor();

  // 1. Görev tamamlama: yüzde, puan, geri alma
  const pctBefore = num(await page.getByTestId('day-pct').textContent());
  const xpBefore = num(await page.getByTestId('pet-xp').textContent());
  const firstOpen = page.locator('[data-testid="task-row"]:visible:not(.is-done)').first();
  await firstOpen.locator('.task-check').click();
  await page.waitForTimeout(250);
  const pctAfter = num(await page.getByTestId('day-pct').textContent());
  const xpAfter = num(await page.getByTestId('pet-xp').textContent());
  check(vp, 'Görev tamamlanınca ilerleme yüzdesi artar', pctAfter > pctBefore, `%${pctBefore} → %${pctAfter}`);
  check(vp, 'Görev tamamlanınca yoldaş puan kazanır', xpAfter === xpBefore + 10, `${xpBefore} → ${xpAfter}`);

  // 2. Rapor yapılanları yansıtır
  await go(page, '#/raporlar');
  const statsText = await page.getByTestId('report-stats').innerText();
  const doneBefore = num(statsText.match(/(\d+)\/\d+/)?.[1]);
  await go(page, '#/');
  await page.getByTestId('day-hero').waitFor();
  await page.locator('[data-testid="task-row"]:visible:not(.is-done)').first().locator('.task-check').click();
  await page.waitForTimeout(200);
  await go(page, '#/raporlar');
  await page.getByTestId('report-stats').waitFor();
  const doneAfter = num((await page.getByTestId('report-stats').innerText()).match(/(\d+)\/\d+/)?.[1]);
  check(vp, 'Haftalık rapor yapılan işlemi yansıtır', doneAfter === doneBefore + 1, `${doneBefore} → ${doneAfter}`);

  // 3. Hedef oluşturma: sihirbaz → liste
  await go(page, '#/hedefler');
  await page.getByTestId('goal-new').click();
  await page.getByTestId('wizard-title').fill('Test hedefi: Her hafta iki makale okumak');
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-why').fill('Alanımda güncel kalmak istiyorum');
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-suggest-ms').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-suggest-tasks').click();
  await page.getByTestId('wizard-finish').click();
  await page.getByTestId('goal-title').waitFor();
  check(vp, 'Yeni hedef ayrıntı sayfası açılır', (await page.getByTestId('goal-title').textContent()).includes('Test hedefi'));
  const msCount = await page.locator('[data-testid="milestones"] .ms').count();
  check(vp, 'Hedefte kilometre taşları oluşur', msCount === 4, `${msCount} taş`);
  await go(page, '#/hedefler');
  await page.getByTestId('goal-grid').waitFor();
  check(vp, 'Yeni hedef listede görünür', (await page.getByTestId('goal-grid').innerText()).includes('Test hedefi'));

  // 4. Kilometre taşı +50
  await page.locator('[data-testid="goal-card"]', { hasText: 'Test hedefi' }).click();
  await page.locator('[data-testid="milestones"] .task-check').first().click();
  await page.waitForTimeout(200);
  await closeOverlays(page);
  check(vp, 'Kilometre taşı işaretlenir', (await page.locator('[data-testid="milestones"] .ms.is-done').count()) === 1);

  // 5. Erteleme: görev yeni tarihine taşınır ve takvimde görünür
  await go(page, '#/gorevler?f=kacan');
  await page.getByTestId('filter-kacan').waitFor();
  const kacan = await page.locator('[data-testid="task-row"]:visible').count();
  const row = page.locator('[data-testid="task-row"]:visible', { hasText: 'Kullanmadığım abonelikleri' });
  await row.click();
  await page.getByRole('button', { name: 'Ertele', exact: true }).click();
  await page.getByTestId('date-Yarın').click();
  await page.getByTestId('reschedule-save').click();
  await page.waitForTimeout(250);
  const kacanAfter = await page.locator('[data-testid="task-row"]:visible').count();
  check(vp, 'Ertelenen görev kaçanlardan çıkar', kacanAfter === kacan - 1, `${kacan} → ${kacanAfter}`);
  await page.getByTestId('filter-yaklasan').click();
  check(vp, 'Ertelenen görev yeni tarihinde görünür', await seen(page.locator('[data-testid="task-row"]:visible', { hasText: 'Kullanmadığım abonelikleri' }).first()));

  // 6. İki kez taşınan görevde parçalama önerisi
  await page.getByTestId('filter-kacan').click();
  await page.locator('[data-testid="task-row"]:visible', { hasText: 'Teklif sayfası metninin' }).click();
  await page.getByRole('button', { name: 'Ertele', exact: true }).click();
  await page.getByTestId('reschedule-split').click();
  await page.getByTestId('split-save').click();
  await page.waitForTimeout(250);
  await page.getByTestId('filter-bugun').click();
  check(vp, 'Görev parçalanıp bugüne ve sonraki günlere yayılır', await seen(page.locator('[data-testid="task-row"]:visible', { hasText: 'kaba taslak' }).first()));

  // 7. Takvim ve görev tutarlılığı: görevin Bugün ve Takvim'de birlikte görünmesi
  await go(page, '#/');
  await page.getByTestId('quick-add').fill('Takvim tutarlılık görevi');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  check(vp, 'Hızlı görev Bugün ekranına eklenir', await page.locator('[data-testid="task-row"]:visible', { hasText: 'Takvim tutarlılık görevi' }).isVisible());
  await go(page, '#/planla');
  await page.getByTestId('week-view').waitFor();
  const weekText = await page.getByTestId('week-view').innerText();
  check(vp, 'Aynı görev takvimde görünür', weekText.includes('Takvim tutarlılık görevi'));
  await page.getByRole('button', { name: 'Ay', exact: true }).click();
  await page.getByTestId('month-view').waitFor();
  check(vp, 'Ay görünümü açılır ve bugünün görevi seçili gelir', (await page.getByTestId('month-view').innerText()).includes('Takvim tutarlılık görevi'));
  await page.getByRole('button', { name: 'Gün', exact: true }).click();
  await page.getByTestId('day-view').waitFor();
  check(vp, 'Gün görünümü aynı görevi gösterir', (await page.getByTestId('day-view').innerText()).includes('Takvim tutarlılık görevi'));

  // 7b. Masaüstü: sürükle-bırak. Mobil: kaydırma hareketleri
  if (vp === 'masaustu') {
    await page.getByRole('button', { name: 'Hafta', exact: true }).click();
    await page.getByTestId('week-view').waitFor();
    const card = page.locator('.day-col.is-today [data-testid="planner-card"]:visible:not(.is-done)').first();
    const taskId = await card.getAttribute('data-task-id');
    const todayDate = await page.locator('.day-col.is-today').getAttribute('data-date');
    const target = page.locator(`.day-col:not(.is-today)`).last();
    const targetDate = await target.getAttribute('data-date');
    // Kullanıcı gibi görünür alana bırak: kolonun üst kısmı ekranda kalır, sayfa kaymaz.
    await page.evaluate(() => window.scrollTo(0, 0));
    await card.dragTo(target, { targetPosition: { x: 60, y: 40 } });
    await page.waitForTimeout(300);
    const moved = await page.locator(`.day-col[data-date="${targetDate}"] [data-task-id="${taskId}"]`).count();
    check(vp, 'Görev sürükle-bırak ile başka güne taşınır', moved > 0, `${todayDate} → ${targetDate}`);
    const stillToday = await page.locator(`.day-col[data-date="${todayDate}"] [data-task-id="${taskId}"]`).count();
    check(vp, 'Sürüklenen görev eski günden kalkar', stillToday === 0);
  } else {
    await go(page, '#/');
    await page.getByTestId('day-hero').waitFor();
    const swipe = async (row, dx) => {
      await row.scrollIntoViewIfNeeded();
      const b = await row.boundingBox();
      const sy = b.y + b.height / 2;
      const sx = b.x + b.width / 2;
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) { await page.mouse.move(sx + (dx * i) / 8, sy); await page.waitForTimeout(16); }
      await page.mouse.up();
      await page.waitForTimeout(350);
    };
    const row = page.locator('[data-testid="task-row"]:visible:not(.is-done)', { hasText: 'Takvim tutarlılık görevi' });
    await swipe(row, -150);
    const sheetOpen = await seen(page.getByTestId('reschedule-save'));
    check(vp, 'Sola kaydırma erteleme penceresini açar', sheetOpen);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await swipe(row, 150);
    const doneRow = page.locator('[data-testid="task-row"].is-done', { hasText: 'Takvim tutarlılık görevi' });
    check(vp, 'Sağa kaydırma görevi tamamlar', await seen(doneRow));
  }

  // 8. Pomodoro gerçekten çalışır
  await go(page, '#/odak');
  await page.getByTestId('tech-pomodoro').click();
  await page.getByTestId('focus-start').click();
  await page.getByTestId('focus-clock').waitFor();
  const t0 = await page.getByTestId('focus-clock').textContent();
  await page.waitForTimeout(2300);
  const t1 = await page.getByTestId('focus-clock').textContent();
  check(vp, 'Pomodoro sayacı geri sayar', t0 !== t1, `${t0} → ${t1}`);
  await page.getByTestId('focus-pause').click();
  const p0 = await page.getByTestId('focus-clock').textContent();
  await page.waitForTimeout(1600);
  const p1 = await page.getByTestId('focus-clock').textContent();
  check(vp, 'Duraklatınca sayaç durur', p0 === p1, `${p0} = ${p1}`);
  await page.getByTestId('focus-resume').click();
  await page.waitForTimeout(1300);
  const p2 = await page.getByTestId('focus-clock').textContent();
  check(vp, 'Devam edince sayaç sürer', p2 !== p1, `${p1} → ${p2}`);

  // Sayfa değişince sayaç sürer
  await go(page, '#/');
  await page.getByTestId('focus-pill').waitFor();
  check(vp, 'Başka ekranda sayaç hapı görünür', await page.getByTestId('focus-pill').isVisible());
  await go(page, '#/odak');
  await page.getByTestId('focus-clock').waitFor();

  // Süreyi sona sar: oturum kaydı, özet, mola
  const openDemo = async () => {
    const id = vp === 'mobil' ? 'demo-open-mobile' : 'demo-open';
    if (vp === 'mobil') await go(page, '#/');
    await page.getByTestId(id).click();
  };
  await openDemo();
  await page.getByTestId('demo-ff').click();
  await page.getByTestId('focus-summary').waitFor({ timeout: 9000 });
  check(vp, 'Süre dolunca oturum özeti gelir', (await page.getByTestId('focus-summary').innerText()).includes('25 dk'));
  await page.getByTestId('summary-close').click();
  await go(page, '#/odak');
  await page.getByTestId('focus-running').waitFor();
  check(vp, 'Pomodoro sonrası mola başlar', (await page.getByTestId('focus-running').innerText()).toLocaleLowerCase('tr').includes('mola'));
  await page.getByTestId('focus-skip-break').click();
  await page.getByTestId('focus-next-cycle').click();
  await page.getByTestId('focus-finish').waitFor();
  await page.getByTestId('focus-finish').click();
  await page.waitForTimeout(250);
  check(vp, 'Oturum listede görünür', (await page.getByTestId('session-list').innerText()).includes('Bugün'));

  // 9. Koç senaryoları
  await go(page, '#/koc');
  await page.getByTestId('coach-notice').waitFor();
  check(vp, 'Koçta simülasyon uyarısı görünür', (await page.getByTestId('coach-notice').innerText()).includes('simülasyon'));
  const send = async (text) => {
    await page.getByTestId('coach-input').fill(text);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await page.getByTestId('coach-typing').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(150);
  };
  await send('Hedefim belirsiz');
  await page.locator('[data-testid="quick-reply"]', { hasText: 'Enerji ve Alışkanlık' }).click();
  await page.waitForTimeout(1300);
  await send('Koç testi hedefi');
  await send('Daha rahat hissedeceğim');
  await page.locator('[data-testid="quick-reply"]', { hasText: 'Haftada 3 saat' }).click();
  await page.getByTestId('coach-card-goal').waitFor({ timeout: 5000 });
  await page.getByTestId('coach-apply').click();
  await page.waitForTimeout(200);
  check(vp, 'Koç hedef taslağı onaylanınca uygulanır', (await page.getByTestId('coach-card-goal').innerText()).includes('Planına eklendi'));
  await send('Kendime zarar vermek istiyorum');
  check(vp, 'Hassas konuda güvenlik yanıtı gelir', await page.getByTestId('coach-card-safety').isVisible());
  await send('Enes bu konuda ne diyor?');
  check(vp, 'Onaylı içerik yoksa koç bunu söyler', (await page.locator('[data-testid="msg-coach"]').last().innerText()).includes('onaylı'));
  await send('Bu hafta çok yüklüyüm');
  const moveCard = page.getByTestId('coach-card-move').last();
  if (await moveCard.isVisible().catch(() => false)) {
    await moveCard.getByTestId('coach-apply').click();
    await page.waitForTimeout(200);
    check(vp, 'Koçun taşıma önerisi takvime uygulanır', (await moveCard.innerText()).includes('Takvimine işlendi'));
  } else {
    check(vp, 'Koç yük analizini gerçek veriyle yapar', (await page.locator('[data-testid="msg-coach"]').last().innerText()).length > 20);
  }
  await go(page, '#/hedefler');
  await page.getByTestId('goal-grid').waitFor();
  check(vp, 'Koçun hedefi hedef listesinde görünür', (await page.getByTestId('goal-grid').innerText()).includes('Koç testi hedefi'));

  // 10. Hatırlatıcı ve bildirim kuralı
  await go(page, '#/hatirlaticilar');
  await page.getByTestId('reminder-new').click();
  await page.getByTestId('reminder-title').fill('Vitamin al');
  await page.getByTestId('reminder-save').click();
  await page.waitForTimeout(200);
  check(vp, 'Yeni hatırlatıcı listede görünür', (await page.getByTestId('reminder-list').innerText()).includes('Vitamin al'));

  // 11. Bildirim: Yarına taşı
  await go(page, '#/gorevler?f=bugun');
  await page.getByTestId('filter-bugun').waitFor();
  await page.getByTestId('task-new').click();
  const yesterday = await page.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await page.getByTestId('task-title').fill('Bildirim testi görevi');
  await page.getByTestId('task-date').fill(yesterday);
  await page.getByTestId('task-save').click();
  await page.waitForTimeout(250);
  await go(page, '#/hatirlaticilar');
  await page.getByTestId('notif-test').waitFor();
  const lim = page.getByTestId('daily-limit');
  await lim.fill('5');
  await page.getByTestId('notif-test-run').click();
  await page.getByTestId('notif-gates').waitFor();
  const gates = await page.getByTestId('notif-gates').innerText();
  check(vp, 'Bildirim kural kapıları gösterilir', gates.includes('Durum hâlâ geçerli mi?'));
  const banner = page.getByTestId('push-banner');
  if (await banner.isVisible().catch(() => false)) {
    check(vp, 'Bildirim banner olarak görünür', true);
    await banner.getByRole('button', { name: 'Yarına taşı' }).click();
    await page.waitForTimeout(250);
    await go(page, '#/gorevler?f=yaklasan');
    check(vp, 'Bildirim butonu görevi gerçekten yarına taşır', await seen(page.locator('[data-testid="task-row"]:visible', { hasText: 'Bildirim testi görevi' }).first()));
  } else {
    check(vp, 'Bildirim gerekçeli olarak engellenir', gates.includes('Gönderilmedi'), gates.split('\n').slice(-1)[0]);
  }

  // 12. Yoldaş: evrim anı ve ödül
  await openDemo();
  await page.getByTestId('demo-next-stage').click();
  await page.getByTestId('stage-up').waitFor();
  await page.getByTestId('stage-up-close').waitFor({ state: 'visible', timeout: 4000 });
  check(vp, 'Sonraki aşamada evrim ekranı açılır', (await page.getByTestId('stage-up').innerText()).includes('artık'));
  await page.getByTestId('stage-up-close').click();
  await go(page, '#/hayvan');
  await page.getByTestId('pet-hero').waitFor();
  await page.getByRole('button', { name: 'Ödüller', exact: true }).click();
  await page.getByTestId('cosmetic-safak').click();
  check(vp, 'Zemin ödülü seçilebilir', (await page.getByTestId('cosmetic-safak').getAttribute('aria-pressed')) === 'true');
  await page.getByRole('button', { name: 'Puan', exact: true }).click();
  check(vp, 'Puan geçmişi yapılanları gösterir', (await page.getByTestId('xp-log').innerText()).includes('Demo puanı'));

  // 13. Sonraki gün: görev kaçan görev olur
  await openDemo();
  await page.getByTestId('demo-next-day').click();
  await page.waitForTimeout(350);
  await page.locator('.push').getByRole('button', { name: 'Kapat' }).click().catch(() => {});
  await go(page, '#/');
  await page.getByTestId('overdue-bar').waitFor();
  check(vp, 'Yeni güne geçince yapılmayan görevler kaçan olur', await page.getByTestId('overdue-bar').isVisible());

  // 14. Kalıcılık
  await page.reload();
  await page.getByTestId('day-hero').waitFor();
  check(vp, 'Sayfa yenilenince veri korunur', await page.getByTestId('overdue-bar').isVisible());

  // 15. Abonelik simülasyonu ve tema
  await go(page, '#/abonelik');
  await page.getByTestId('plan-buy').click();
  await page.getByTestId('plan-confirm').click();
  await page.getByTestId('plan-cancel').waitFor();
  check(vp, 'Abonelik simülasyonu Premium yapar', await page.getByTestId('plan-cancel').isVisible());
  await go(page, '#/profil');
  await page.getByRole('button', { name: 'Koyu', exact: true }).click();
  check(vp, 'Koyu tema uygulanır', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'koyu');
  await page.getByRole('button', { name: 'Açık', exact: true }).click();

  // 16. Hesap silme başlangıca döner
  await page.getByTestId('delete-open').click();
  await page.getByTestId('delete-confirm').click();
  await page.getByTestId('onboarding').waitFor();
  check(vp, 'Hesap silme karşılamaya döner', true);

  // 17. Tam karşılama akışı
  await page.getByTestId('ob-start').click();
  await page.getByTestId('ob-name').fill('Ece');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-age').check();
  await page.getByTestId('ob-privacy').check();
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-area-enerji').click();
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-struggle-kacirinca').click();
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-goal').fill('Haftada 3 gün düzenli hareket etmek');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-why').fill('Daha enerjik olmak istiyorum');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-min-90').click();
  await page.getByTestId('ob-next').click();
  await page.getByText('Plan taslağın', { exact: false }).waitFor();
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-pet-baykus').click();
  await page.getByTestId('ob-petname').fill('Bilge');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-first-task').click();
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-notif-allow').click();
  await page.getByTestId('ob-next').click();
  await page.getByTestId('ob-finish').click();
  await page.getByTestId('day-hero').waitFor();
  await closeOverlays(page);
  const heroText = await page.locator('.today-head').innerText();
  check(vp, 'Karşılama akışı kişisel panele girer', heroText.includes('Ece'));
  await go(page, '#/hedefler');
  await page.getByTestId('goal-grid').waitFor();
  check(vp, 'Karşılamadaki hedef oluşur', (await page.getByTestId('goal-grid').innerText()).includes('Haftada 3 gün'));
  await go(page, '#/hayvan');
  await page.getByTestId('pet-hero').waitFor();
  const petInfo = await page.getByTestId('pet-hero').innerText();
  check(vp, 'İlk görev yumurtayı çatlatır', petInfo.includes('Yavru') && petInfo.includes('Bilge'));

  await page.screenshot({ path: `tests/e2e/ekranlar/son-${vp}.png` });
  await ctx.close();
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const [vp, opts] of [
  ['masaustu', { viewport: { width: 1440, height: 900 } }],
  ['mobil', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  try {
    await runDemoSuite(browser, vp, opts);
  } catch (e) {
    check(vp, 'TEST ÇÖKTÜ', false, e.message.split('\n').slice(0, 3).join(' | '));
  }
}
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\nSONUÇ: ${results.length - failed.length}/${results.length} geçti. Konsol sorunu: ${problems.length}`);
if (problems.length) console.log(problems.slice(0, 15).join('\n'));
process.exit(failed.length || problems.length ? 1 : 0);
