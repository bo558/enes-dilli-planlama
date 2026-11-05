import { describe, expect, it } from 'vitest';
import { buildDemoData, emptyData } from '@/data/seed';
import { __respondSync } from '@/services/coach/simulatedCoach';
import { addDays, monthGrid, startOfWeek, weekdayIndex } from './dates';
import { allowedXp, focusXp, levelFor, moodFor, stageFor } from './gamification';
import { evaluateNotification, isQuietNow } from './notifications';
import { dayProgress, goalProgress, periodStats } from './stats';
import type { Task, XpEvent } from './types';

const TODAY = '2026-11-05'; // Perşembe
const xp = (type: XpEvent['type'], amount: number, date: string, refId: string | null = null): XpEvent => ({
  id: Math.random().toString(),
  type,
  amount,
  date,
  label: '',
  refId,
});

describe('tarihler', () => {
  it('haftayı pazartesiden başlatır', () => {
    expect(startOfWeek(TODAY)).toBe('2026-11-02');
    expect(weekdayIndex('2026-11-08')).toBe(6);
  });
  it('ay tablosu 42 gün ve pazartesiden başlar', () => {
    const grid = monthGrid(TODAY);
    expect(grid).toHaveLength(42);
    expect(weekdayIndex(grid[0])).toBe(0);
  });
});

describe('puan kuralları', () => {
  it('günlük görev puanı 50 ile sınırlıdır', () => {
    const events = Array.from({ length: 5 }, () => xp('gorev', 10, TODAY));
    expect(allowedXp(events, 'gorev', 10, TODAY, 't')).toBe(0);
    expect(allowedXp(events.slice(0, 4), 'gorev', 10, TODAY, 't')).toBe(10);
  });
  it('odak puanı 40 ile sınırlıdır ve kısa oturum puan vermez', () => {
    expect(allowedXp([xp('odak', 35, TODAY)], 'odak', 10, TODAY, null)).toBe(5);
    expect(focusXp(4)).toBe(0);
    expect(focusXp(25)).toBe(10);
  });
  it('yeniden planlama ve kilometre taşı bir kez kazanılır', () => {
    expect(allowedXp([xp('yeniden-plan', 3, TODAY, 't1')], 'yeniden-plan', 3, TODAY, 't1')).toBe(0);
    expect(allowedXp([xp('kilometre', 50, TODAY, 'm1')], 'kilometre', 50, TODAY, 'm2')).toBe(50);
  });
  it('haftalık değerlendirme haftada bir kez kazanılır', () => {
    expect(allowedXp([xp('haftalik', 20, '2026-11-02')], 'haftalik', 20, TODAY, null)).toBe(0);
    expect(allowedXp([xp('haftalik', 20, '2026-10-30')], 'haftalik', 20, TODAY, null)).toBe(20);
  });
  it('aşama ve seviye eşikleri plana uyar', () => {
    expect(stageFor(0).id).toBe('yumurta');
    expect(stageFor(10).id).toBe('yavru');
    expect(stageFor(250).id).toBe('genc');
    expect(stageFor(1000).id).toBe('yetiskin');
    expect(levelFor(817)).toBe(9);
  });
  it('kaçırma yoldaşı cezalandırmaz, yalnız uykulu yapar', () => {
    expect(moodFor(0, 5)).toBe('uykulu');
    expect(moodFor(0.6, 0)).toBe('neseli');
  });
});

const makeTask = (over: Partial<Task>): Task => ({
  id: 't',
  title: 'T',
  goalId: null,
  milestoneId: null,
  date: TODAY,
  time: null,
  estimateMin: 25,
  isMit: false,
  doneOn: null,
  doneHour: null,
  actualMin: 0,
  moves: [],
  notes: '',
  createdOn: TODAY,
  ...over,
});

describe('istatistikler', () => {
  it('günlük ilerlemeyi hesaplar', () => {
    const tasks = [makeTask({ id: 'a', doneOn: TODAY }), makeTask({ id: 'b' })];
    expect(dayProgress(tasks, TODAY).pct).toBe(0.5);
  });
  it('plana uyum gelecek günleri saymaz, geç biten görevi saymaz', () => {
    const data = {
      ...emptyData(TODAY),
      tasks: [
        makeTask({ id: 'a', date: TODAY, doneOn: TODAY }),
        makeTask({ id: 'b', date: addDays(TODAY, -1), doneOn: TODAY }),
        makeTask({ id: 'c', date: addDays(TODAY, 2) }),
      ],
    };
    const s = periodStats(data, startOfWeek(TODAY), addDays(startOfWeek(TODAY), 6), TODAY);
    expect(s.planned).toBe(2);
    expect(s.done).toBe(1);
    expect(s.adherence).toBe(0.5);
  });
  it('hedef ilerlemesi görev ve kilometre taşlarını içerir', () => {
    const data = buildDemoData(TODAY);
    const pct = goalProgress(data.goals[0], data.tasks);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(1);
  });
});

describe('bildirim kuralları', () => {
  it('gece yarısını aşan sessiz saatleri doğru hesaplar', () => {
    expect(isQuietNow('23:00', '07:30', 23 * 60 + 30)).toBe(true);
    expect(isQuietNow('23:00', '07:30', 6 * 60)).toBe(true);
    expect(isQuietNow('23:00', '07:30', 12 * 60)).toBe(false);
  });
  it('kapalı kategoriye bildirim göndermez', () => {
    const data = buildDemoData(TODAY);
    data.prefs.categories.kacan = false;
    expect(evaluateNotification(data, 'kacan', TODAY, 720).passed).toBe(false);
  });
  it('tamamlanmış görev için kaçan görev mesajı göndermez', () => {
    const data = buildDemoData(TODAY);
    data.prefs.dailyLimit = 5;
    data.tasks = data.tasks.map((t) => (t.id === 't-teklif' ? { ...t, doneOn: TODAY } : t));
    const r = evaluateNotification(data, 'kacan', TODAY, 720, { taskId: 't-teklif' });
    expect(r.passed).toBe(false);
    expect(r.gates[1].detail).toContain('tamamlandı');
  });
  it('günlük sınırı uygular', () => {
    const data = buildDemoData(TODAY);
    data.prefs.dailyLimit = 1;
    expect(evaluateNotification(data, 'rapor', TODAY, 720).passed).toBe(false);
  });
  it('üst üste yanıtsız üç bildirimden sonra geri çekilir', () => {
    const data = buildDemoData(TODAY);
    data.prefs.dailyLimit = 5;
    const n = data.notifications[1];
    data.notifications = [{ ...n, date: '2026-11-01' }, { ...n, date: '2026-11-01' }, { ...n, date: '2026-11-01' }];
    const r = evaluateNotification(data, 'kacan', TODAY, 720);
    expect(r.passed).toBe(false);
    expect(r.gates[2].detail).toContain('yanıtsız');
  });
});

describe('simüle koç', () => {
  const ctx = { data: buildDemoData(TODAY), today: TODAY };
  it('hassas konuda her akışın önüne geçer', () => {
    const r = __respondSync('Kendime zarar vermek istiyorum', {
      ...ctx,
      data: { ...ctx.data, coachFlow: { id: 'hedef', step: 1, data: {} } },
    });
    expect(r.replies[0].source).toBe('guvenlik');
    expect(r.flow).toBeNull();
  });
  it('onaylı içerik yokken Enes Dilli adına cevap vermez', () => {
    expect(__respondSync('Enes bu konuda ne diyor?', ctx).replies[0].source).toBe('icerik-yok');
  });
  it('tıbbi ve yatırım sorularında sınır çizer', () => {
    expect(__respondSync('Hangi hisse alayım?', ctx).replies[0].text).toContain('tavsiye veremem');
  });
  it('erteleme yanıtı gerçek görev verisini kullanır', () => {
    const r = __respondSync('Sürekli erteliyorum', ctx);
    expect(r.replies[0].text).toContain('Teklif sayfası');
    expect(r.replies[0].card?.kind).toBe('bolme-onerisi');
  });
  it('hedef akışı adım adım taslak üretir', () => {
    let flow = __respondSync('Hedefim belirsiz', ctx).flow;
    expect(flow?.step).toBe(0);
    for (const answer of ['Enerji ve Alışkanlık', 'Haftada 3 gün hareket', 'Daha enerjik olmak', 'Haftada 3 saat']) {
      const res = __respondSync(answer, { ...ctx, data: { ...ctx.data, coachFlow: flow } });
      flow = res.flow;
      if (!flow) {
        expect(res.replies[0].card?.kind).toBe('hedef-onerisi');
      }
    }
    expect(flow).toBeNull();
  });
});
