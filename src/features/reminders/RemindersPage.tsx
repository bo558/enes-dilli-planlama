import { BellRing, Check, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/app/AppShell';
import { WEEKDAY_LABELS } from '@/domain/dates';
import { CATEGORY_LABELS, type Evaluation } from '@/domain/notifications';
import type { NotificationCategory, Reminder } from '@/domain/types';
import { Button, Field, Segmented, Sheet, SimBadge, Switch } from '@/design-system/ui';
import { useApp } from '@/store/app';
import { useUi } from '@/store/ui';
import './reminders.css';

const daysLabel = (days: number[]) => {
  if (days.length === 7) return 'Her gün';
  if (days.length === 5 && days.every((d) => d < 5)) return 'Hafta içi';
  if (days.length === 2 && days.every((d) => d >= 5)) return 'Hafta sonu';
  return days.map((d) => WEEKDAY_LABELS[d]).join(', ');
};

const EMPTY: Omit<Reminder, 'id'> = { title: '', body: '', category: 'ozel', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: true };

const TEST_OPTIONS: { value: NotificationCategory; label: string }[] = [
  { value: 'kacan', label: 'Kaçan görev' },
  { value: 'plan', label: 'Gün sonu' },
  { value: 'yasam', label: 'Yaşam' },
  { value: 'rapor', label: 'Rapor' },
];

export function RemindersPage() {
  const { reminders, prefs, addReminder, updateReminder, deleteReminder, setPrefs, setCategory, triggerNotification } = useApp();
  const pushToast = useUi((s) => s.pushToast);
  const [form, setForm] = useState<(Omit<Reminder, 'id'> & { id?: string }) | null>(null);
  const [testCat, setTestCat] = useState<NotificationCategory>('kacan');
  const [result, setResult] = useState<Evaluation | null>(null);
  const [ignoreQuiet, setIgnoreQuiet] = useState(true);

  const save = () => {
    if (!form?.title.trim()) return;
    const body = form.body.trim() || form.title.trim();
    if (form.id) updateReminder(form.id, { ...form, body });
    else addReminder({ ...form, title: form.title.trim(), body });
    pushToast({ text: 'Hatırlatıcı kaydedildi', tone: 'basari' });
    setForm(null);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Hatırlatıcılar"
        title={<>Ne zaman, ne kadar: <em>sen karar ver</em></>}
        sub="Prototipte telefon bildirimi gönderilmez; bildirimler uygulama içinde canlandırılır."
        actions={<Button onClick={() => setForm({ ...EMPTY })} data-testid="reminder-new"><Plus size={17} /> Hatırlatıcı ekle</Button>}
      />

      <div className="rem-grid">
        <div className="rem-col">
          <section className="card card--flush">
            <ul className="rem-list" data-testid="reminder-list">
              {reminders.map((r) => (
                <li key={r.id} className={`rem ${r.enabled ? '' : 'is-off'}`} data-testid="reminder-item">
                  <button type="button" className="rem__main" onClick={() => setForm({ ...r })}>
                    <span className="rem__time num">{r.time}</span>
                    <span className="rem__text">
                      <strong>{r.title}</strong>
                      <small>{r.body} · {daysLabel(r.days)}</small>
                    </span>
                  </button>
                  <Switch checked={r.enabled} onChange={(v) => updateReminder(r.id, { enabled: v })} label={`${r.title} hatırlatıcısı`} />
                </li>
              ))}
              {reminders.length === 0 && <li className="rem__empty">Henüz hatırlatıcı yok.</li>}
            </ul>
          </section>

          <section className="card test-card" data-testid="notif-test">
            <div className="card__head">
              <div>
                <span className="card__title">Bildirim kuralını dene</span>
                <div className="chart-note">Gönderimden önce üç kapıdan geçer.</div>
              </div>
              <SimBadge />
            </div>
            <Segmented<NotificationCategory> block value={testCat} onChange={(v) => { setTestCat(v); setResult(null); }} options={TEST_OPTIONS} ariaLabel="Bildirim türü" />
            <label className="test-opt">
              <input type="checkbox" checked={ignoreQuiet} onChange={(e) => setIgnoreQuiet(e.target.checked)} />
              Sunum için sessiz saatleri yok say
            </label>
            <Button
              variant="dark"
              onClick={() => setResult(triggerNotification(testCat, { ignoreQuiet }))}
              data-testid="notif-test-run"
            >
              <BellRing size={16} /> Bildirimi dene
            </Button>
            {result && (
              <ol className="gates" data-testid="notif-gates">
                {result.gates.map((g) => (
                  <li key={g.name} className={g.passed ? 'is-pass' : 'is-fail'}>
                    <span className="gates__icon">{g.passed ? <Check size={14} /> : <X size={14} />}</span>
                    <div>
                      <strong>{g.name}</strong>
                      <small>{g.detail}</small>
                    </div>
                  </li>
                ))}
                <li className={`gates__result ${result.passed ? 'is-pass' : 'is-fail'}`}>
                  {result.passed ? 'Gönderildi. Yukarıdaki bildirimi yanıtlayabilirsin.' : 'Gönderilmedi.'}
                </li>
              </ol>
            )}
          </section>
        </div>

        <div className="rem-col">
          <section className="card">
            <div className="card__title" style={{ marginBottom: 12 }}>Bildirim türleri</div>
            {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((c) => (
              <div key={c} className="setting-row">
                <div>
                  <div className="setting-row__title">{CATEGORY_LABELS[c].name}</div>
                  <div className="setting-row__desc">{CATEGORY_LABELS[c].desc}</div>
                </div>
                <Switch checked={prefs.categories[c]} onChange={(v) => setCategory(c, v)} label={CATEGORY_LABELS[c].name} />
              </div>
            ))}
          </section>

          <section className="card">
            <div className="card__title" style={{ marginBottom: 12 }}>Sınırlar</div>
            <div className="field-row">
              <Field label="Sessiz saat başlangıcı">
                <input className="input" type="time" value={prefs.quietStart} onChange={(e) => setPrefs({ quietStart: e.target.value })} />
              </Field>
              <Field label="Sessiz saat bitişi">
                <input className="input" type="time" value={prefs.quietEnd} onChange={(e) => setPrefs({ quietEnd: e.target.value })} />
              </Field>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <span className="field__label">Günlük üst sınır: {prefs.dailyLimit} bildirim</span>
              <input
                type="range"
                className="range"
                min={1}
                max={5}
                value={prefs.dailyLimit}
                onChange={(e) => setPrefs({ dailyLimit: Number(e.target.value) })}
                aria-label="Günlük bildirim sınırı"
                data-testid="daily-limit"
              />
              <span className="field__hint">Kendi kurduğun özel hatırlatıcılar bu sınıra dahil değildir.</span>
            </div>
            <div className="setting-row" style={{ marginTop: 10 }}>
              <div>
                <div className="setting-row__title">Kilit ekranında görev adını gizle</div>
                <div className="setting-row__desc">Görev yerine genel bir mesaj görünür.</div>
              </div>
              <Switch checked={prefs.hideOnLock} onChange={(v) => setPrefs({ hideOnLock: v })} label="Kilit ekranı gizliliği" />
            </div>
            <div className="setting-row">
              <div>
                <div className="setting-row__title">Tatil modu</div>
                <div className="setting-row__desc">Tüm bildirimler durur, ilerlemen korunur.</div>
              </div>
              <Switch checked={prefs.vacation} onChange={(v) => setPrefs({ vacation: v })} label="Tatil modu" />
            </div>
            <div className="setting-row">
              <div>
                <div className="setting-row__title">Bildirim izni (telefon)</div>
                <div className="setting-row__desc">Prototipte temsilîdir. Uygulama izinsiz de çalışır.</div>
              </div>
              <Switch
                checked={prefs.permission === 'verildi'}
                onChange={(v) => setPrefs({ permission: v ? 'verildi' : 'reddedildi' })}
                label="Bildirim izni"
              />
            </div>
          </section>
        </div>
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Hatırlatıcıyı düzenle' : 'Yeni hatırlatıcı'}
        footer={
          <>
            {form?.id && (
              <Button variant="danger" onClick={() => { deleteReminder(form.id!); setForm(null); }}>
                <Trash2 size={15} /> Sil
              </Button>
            )}
            <Button onClick={save} disabled={!form?.title.trim()} data-testid="reminder-save">Kaydet</Button>
          </>
        }
      >
        {form && (
          <>
            <Field label="Başlık">
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Örneğin: Vitamin" data-testid="reminder-title" />
            </Field>
            <Field label="Mesaj">
              <input className="input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Bildirimde ne yazsın?" />
            </Field>
            <Field label="Saat">
              <input className="input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </Field>
            <div className="field">
              <span className="field__label">Günler</span>
              <div className="day-picker">
                {WEEKDAY_LABELS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={form.days.includes(i)}
                    onClick={() =>
                      setForm({
                        ...form,
                        days: form.days.includes(i) ? form.days.filter((x) => x !== i) : [...form.days, i].sort(),
                      })
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="push-preview">
              <span className="push-preview__label">Önizleme</span>
              <div className="push-preview__card">
                <strong>{form.title || 'Başlık'}</strong>
                <span>{form.body || form.title || 'Mesajın burada görünür.'}</span>
              </div>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
