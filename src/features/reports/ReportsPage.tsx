import { Check, ChevronLeft, ChevronRight, MessagesSquare, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/app/AppShell';
import { AREAS, MOVE_REASONS, TECHNIQUES } from '@/domain/catalog';
import {
  addDays,
  addMonths,
  formatDayMonth,
  formatDayMonthShort,
  formatDuration,
  formatMonthYear,
  startOfMonth,
  startOfWeek,
  WEEKDAY_LABELS,
} from '@/domain/dates';
import {
  activeDayMap,
  dailySeries,
  estimateAccuracy,
  focusByGoal,
  focusByTechnique,
  HEAT_BANDS,
  mostMoved,
  moveReasonCounts,
  periodStats,
  productivityHeatmap,
  weeklyAdherenceSeries,
} from '@/domain/stats';
import type { MoveReason } from '@/domain/types';
import { AdherenceLine, DayBars, Heatmap } from '@/design-system/charts';
import { Button, EmptyState, IconButton, Label, Segmented, Sheet, SimBadge } from '@/design-system/ui';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './reports.css';

type Period = 'hafta' | 'ay';

function Stat({ label, value, delta }: { label: string; value: string; delta?: { text: string; good: boolean } | null }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <strong className="stat__value num">{value}</strong>
      {delta && <span className={`stat__delta ${delta.good ? 'is-good' : 'is-bad'}`}>{delta.text}</span>}
    </div>
  );
}

const pct = (v: number) => `%${Math.round(v * 100)}`;

function deltaPoints(cur: number, prev: number, hasPrev: boolean) {
  if (!hasPrev) return null;
  const d = Math.round((cur - prev) * 100);
  if (d === 0) return { text: 'Önceki dönemle aynı', good: true };
  return { text: `Önceki döneme göre ${d > 0 ? '+' : '−'}${Math.abs(d)}`, good: d > 0 };
}

export function ReportsPage() {
  const today = useToday();
  const data = useApp();
  const { addTask, weeklyReviews, completeWeeklyReview } = data;
  const pushToast = useUi((s) => s.pushToast);
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('hafta');
  const [offset, setOffset] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [note, setNote] = useState('');
  const [addedSuggestion, setAddedSuggestion] = useState(false);

  const range = useMemo(() => {
    if (period === 'hafta') {
      const from = addDays(startOfWeek(today), offset * 7);
      return { from, to: addDays(from, 6), prevFrom: addDays(from, -7), prevTo: addDays(from, -1), label: `${formatDayMonth(from)} – ${formatDayMonth(addDays(from, 6))}` };
    }
    const from = addMonths(startOfMonth(today), offset);
    const next = addMonths(from, 1);
    const prev = addMonths(from, -1);
    return { from, to: addDays(next, -1), prevFrom: prev, prevTo: addDays(from, -1), label: formatMonthYear(from) };
  }, [period, offset, today]);

  const stats = periodStats(data, range.from, range.to, today);
  const prev = periodStats(data, range.prevFrom, range.prevTo, today);
  const byGoal = focusByGoal(data, range.from, range.to);
  const byTech = focusByTechnique(data, range.from, range.to);
  const heat = productivityHeatmap(data, range.from, range.to);
  const moved = mostMoved(data);
  const reasons = moveReasonCounts(data, range.from, range.to);
  const accuracy = estimateAccuracy(data, range.from, range.to);
  const maxGoal = Math.max(1, ...byGoal.map((g) => g.minutes));
  const week = period === 'hafta' ? dailySeries(data, range.from, 7) : [];
  const trend = weeklyAdherenceSeries(data, today, 8);
  const activeDays = activeDayMap(data);
  const empty = stats.planned === 0 && stats.focusMin === 0;
  const reviewed = !!weeklyReviews[startOfWeek(today)];
  const topReason = (Object.entries(reasons) as [MoveReason, number][]).sort((a, b) => b[1] - a[1])[0];
  const bestBand = heat.best.value > 0 ? `${WEEKDAY_LABELS[heat.best.day]} ${HEAT_BANDS[heat.best.band].label}` : null;

  const suggestion = (() => {
    if (stats.moved >= 3 && topReason?.[0] === 'zaman') {
      return { strong: `${stats.done} görevi planladığın günde bitirdin.`, issue: `En sık taşıma nedenin "${MOVE_REASONS.zaman}".`, change: 'Gelecek hafta günde en fazla bir büyük işe yer aç.', task: 'Gelecek hafta için günde bir büyük iş seç' };
    }
    if (accuracy.count >= 3 && accuracy.actual > accuracy.estimate * 1.15) {
      return { strong: `${formatDuration(stats.focusMin)} odaklandın.`, issue: 'İşler tahmininden uzun sürüyor.', change: 'Yeni görevlerin süresini yüzde 20 fazla tahmin et.', task: 'Bu haftanın görev sürelerini gözden geçir' };
    }
    if (bestBand) {
      return { strong: `En verimli zaman dilimin ${bestBand}.`, issue: stats.adherence < 0.7 ? 'Plana uyumun hedefin altında.' : 'Plana uyumun iyi gidiyor.', change: `En önemli işini ${HEAT_BANDS[heat.best.band].label} aralığına yerleştir.`, task: `En önemli işi ${HEAT_BANDS[heat.best.band].label} aralığına yerleştir` };
    }
    return { strong: 'Başlangıç için yeterli veri birikiyor.', issue: 'Henüz belirgin bir kalıp yok.', change: 'Bu hafta üç gün en az bir görevi tamamla.', task: 'Bu hafta üç gün en az bir görev tamamla' };
  })();

  const gridDays = Array.from({ length: 35 }, (_, i) => addDays(startOfWeek(today), i - 28));

  return (
    <div className="page reports">
      <PageHeader
        eyebrow="Gelişim"
        title={period === 'hafta' ? <>Bu haftaya <em>birlikte bakalım</em></> : <>Ayın <em>büyük resmi</em></>}
        actions={
          <Segmented<Period>
            ariaLabel="Rapor dönemi"
            value={period}
            onChange={(p) => { setPeriod(p); setOffset(0); }}
            options={[{ value: 'hafta', label: 'Haftalık' }, { value: 'ay', label: 'Aylık' }]}
          />
        }
      />

      <div className="report-nav">
        <IconButton label="Önceki dönem" onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={20} /></IconButton>
        <strong data-testid="report-range">{range.label}</strong>
        <IconButton label="Sonraki dönem" disabled={offset >= 0} style={{ opacity: offset >= 0 ? 0.3 : 1 }} onClick={() => setOffset((o) => Math.min(0, o + 1))}><ChevronRight size={20} /></IconButton>
      </div>

      {empty ? (
        <section className="card">
          <EmptyState
            title="Bu dönem için henüz veri yok"
            action={<Button variant="secondary" onClick={() => navigate('/')}>Bugüne dön</Button>}
          >
            Görev tamamladıkça ve odak oturumu yaptıkça raporun burada oluşur.
          </EmptyState>
        </section>
      ) : (
        <>
          <section className="stats" data-testid="report-stats">
            <Stat label="Plana uyum" value={pct(stats.adherence)} delta={deltaPoints(stats.adherence, prev.adherence, prev.planned > 0)} />
            <Stat label="Tamamlanan görev" value={`${stats.done}/${stats.planned}`} />
            <Stat label="Odak süresi" value={formatDuration(stats.focusMin)} />
            <Stat label="Aktif gün" value={String(stats.activeDays)} />
            <Stat label="Taşınan görev" value={String(stats.moved)} />
          </section>

          <section className="coach-report" data-testid="coach-report">
            <div className="coach-report__head">
              <span className="coach-nudge__icon"><MessagesSquare size={17} /></span>
              <div>
                <strong>Koçun yorumu</strong>
                <div><SimBadge>Simülasyon · Kurala dayalı örnek</SimBadge></div>
              </div>
            </div>
            <ol className="coach-report__list">
              <li><span className="num">01</span><div><small>Güçlü yön</small>{suggestion.strong}</div></li>
              <li><span className="num">02</span><div><small>Tekrar eden konu</small>{suggestion.issue}</div></li>
              <li><span className="num">03</span><div><small>Tek değişiklik</small>{suggestion.change}</div></li>
            </ol>
            <div className="coach-report__actions">
              <Button
                variant="warm"
                disabled={addedSuggestion}
                onClick={() => {
                  addTask({ title: suggestion.task, date: addDays(today, 1), estimateMin: 15 });
                  setAddedSuggestion(true);
                  pushToast({ text: 'Öneri yarınki planına eklendi', tone: 'basari' });
                }}
                data-testid="report-add"
              >
                {addedSuggestion ? <><Check size={16} /> Plana eklendi</> : <><Plus size={16} /> Plana ekle</>}
              </Button>
              {period === 'hafta' && offset === 0 && (
                <Button className="report-review" variant="ghost" disabled={reviewed} onClick={() => setReviewOpen(true)} data-testid="review-open">
                  {reviewed ? <><Check size={16} /> Hafta değerlendirildi</> : 'Haftayı değerlendir (+20 puan)'}
                </Button>
              )}
            </div>
          </section>

          <div className="report-grid">
            {period === 'hafta' ? (
              <section className="card">
                <div className="card__head">
                  <div>
                    <span className="card__title">Planladığın ve yaptığın</span>
                    <div className="chart-note">Gün gün tamamlanan görevler</div>
                  </div>
                </div>
                <DayBars days={week.map((d, i) => ({ label: WEEKDAY_LABELS[i], planned: d.planned, done: d.done, isToday: d.date === today }))} />
              </section>
            ) : (
              <section className="card">
                <div className="card__head">
                  <div>
                    <span className="card__title">Plana uyum eğilimi</span>
                    <div className="chart-note">Son 8 hafta · Hedef çizgisi örnektir</div>
                  </div>
                </div>
                <AdherenceLine points={trend.filter((w) => w.planned > 0).map((w) => ({ label: formatDayMonthShort(w.from), value: w.adherence, sub: `${w.done}/${w.planned}` }))} />
              </section>
            )}

            <section className="card">
              <div className="card__head">
                <div>
                  <span className="card__title">Zamanın nereye gitti?</span>
                  <div className="chart-note">Hedefe göre odak süresi</div>
                </div>
              </div>
              <div className="hbars" data-testid="focus-by-goal">
                {byGoal.slice(0, 5).map((g) => (
                  <div key={g.goalId} className="hbar">
                    <div className="hbar__top">
                      <span>{g.title}</span>
                      <b className="num">{formatDuration(g.minutes)}</b>
                    </div>
                    <div className="hbar__track">
                      <div className="hbar__fill" style={{ width: `${(g.minutes / maxGoal) * 100}%`, background: g.area ? AREAS[g.area].color : 'var(--faint)' }} />
                    </div>
                  </div>
                ))}
                {byGoal.length === 0 && <p className="chart-note">Bu dönem odak oturumu yok.</p>}
              </div>
            </section>

            <section className="card">
              <div className="card__head">
                <div>
                  <span className="card__title">Ne zaman daha iyi çalışıyorsun?</span>
                  <div className="chart-note">{bestBand ? `En yoğun dilim: ${bestBand}` : 'Veri biriktikçe netleşir'}</div>
                </div>
              </div>
              <Heatmap grid={heat.grid} max={heat.max} rowLabels={HEAT_BANDS.map((b) => b.label)} colLabels={WEEKDAY_LABELS} />
            </section>

            <section className="card">
              <div className="card__head">
                <div>
                  <span className="card__title">Neyi erteliyorsun?</span>
                  <div className="chart-note">{topReason ? `En sık neden: ${MOVE_REASONS[topReason[0]]}` : 'Bu dönem taşıma yok'}</div>
                </div>
              </div>
              <ul className="moved">
                {moved.map((t) => (
                  <li key={t.id}>
                    <span>{t.title}</span>
                    <b className="chip chip--warm num">{t.moves.length} kez</b>
                  </li>
                ))}
                {moved.length === 0 && <li className="chart-note">Açık görevlerin arasında taşınan yok.</li>}
              </ul>
            </section>

            <section className="card">
              <div className="card__head">
                <div>
                  <span className="card__title">Hangi teknik işe yarıyor?</span>
                  <div className="chart-note">Tamamlanan oturum oranı</div>
                </div>
              </div>
              <ul className="tech-rate">
                {byTech.map((t) => {
                  const info = TECHNIQUES.find((x) => x.id === t.technique);
                  return (
                    <li key={t.technique}>
                      <div>
                        <strong>{info?.name}</strong>
                        <small className="num">{t.count} oturum · {formatDuration(t.minutes)}</small>
                      </div>
                      <b className="num">%{Math.round((t.completed / t.count) * 100)}</b>
                    </li>
                  );
                })}
                {byTech.length === 0 && <li className="chart-note">Bu dönem odak oturumu yok.</li>}
              </ul>
            </section>

            {period === 'ay' ? (
              <>
                <section className="card">
                  <div className="card__head">
                    <div>
                      <span className="card__title">Planın gerçekçi mi?</span>
                      <div className="chart-note">{accuracy.count} tamamlanan görevde tahmini ve gerçek süre</div>
                    </div>
                  </div>
                  <div className="accuracy">
                    {[{ l: 'Tahmin', v: accuracy.estimate, c: 'var(--surface-3)' }, { l: 'Gerçek', v: accuracy.actual, c: 'var(--blue)' }].map((r) => (
                      <div key={r.l} className="accuracy__row">
                        <span>{r.l}</span>
                        <div className="hbar__track"><div className="hbar__fill" style={{ width: `${(r.v / Math.max(1, accuracy.estimate, accuracy.actual)) * 100}%`, background: r.c }} /></div>
                        <b className="num">{formatDuration(r.v)}</b>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="card">
                  <div className="card__head">
                    <div>
                      <span className="card__title">Düzenli miyim?</span>
                      <div className="chart-note">Son 5 haftanın aktif günleri</div>
                    </div>
                  </div>
                  <div className="cal-heat">
                    {WEEKDAY_LABELS.map((w) => <span key={w} className="cal-heat__wd">{w}</span>)}
                    {gridDays.map((d) => (
                      <span
                        key={d}
                        title={formatDayMonth(d)}
                        className={`cal-heat__cell ${activeDays.has(d) ? 'is-active' : ''} ${d === today ? 'is-today' : ''} ${d > today ? 'is-future' : ''}`}
                      />
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </>
      )}

      <Sheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Haftalık değerlendirme"
        subtitle="İki dakikanı alır."
        footer={
          <Button
            data-testid="review-save"
            onClick={() => {
              completeWeeklyReview(note);
              setReviewOpen(false);
              pushToast({ text: 'Hafta değerlendirildi', tone: 'basari' });
            }}
          >
            Tamamla
          </Button>
        }
      >
        <div>
          <Label>Bu hafta</Label>
          <p style={{ marginTop: 6 }}>Plana uyumun {pct(stats.adherence)}. {stats.moved} görev taşıdın ve {formatDuration(stats.focusMin)} odaklandın.</p>
        </div>
        <label className="field">
          <span className="field__label">Gelecek hafta tek odağın ne olsun?</span>
          <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örneğin: Sabahları ilk iş en önemli görev" />
        </label>
      </Sheet>
    </div>
  );
}
