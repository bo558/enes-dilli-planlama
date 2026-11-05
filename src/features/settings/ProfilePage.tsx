import { ChevronRight, Download, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/app/AppShell';
import { AREAS } from '@/domain/catalog';
import { diffDays, formatDayMonth, formatDayMonthShort } from '@/domain/dates';
import type { GoalArea, Profile, WorkWindow } from '@/domain/types';
import { Button, Field, IconButton, Segmented, Sheet, SimBadge, Switch } from '@/design-system/ui';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './settings.css';

export function ProfilePage() {
  const data = useApp();
  const { profile, consents, theme, subscription, coachMemory, updateProfile, setConsents, setTheme, removeMemory, resetAll, clearChat } = data;
  const today = useToday();
  const pushToast = useUi((s) => s.pushToast);
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({ profile, goals: data.goals, tasks: data.tasks, sessions: data.sessions, reminders: data.reminders, coachMemory }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'duzen-verilerim.json';
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ text: 'Verilerin indirildi', tone: 'basari' });
  };

  const trialLeft = subscription.trialEnds ? diffDays(subscription.trialEnds, today) : 0;
  const planLabel =
    subscription.status === 'premium'
      ? `Premium · ${subscription.plan === 'aylik' ? 'Aylık' : 'Yıllık'}`
      : subscription.status === 'deneme'
        ? `Deneme · ${Math.max(0, trialLeft)} gün kaldı`
        : 'Ücretsiz';

  return (
    <div className="page page--narrow">
      <PageHeader eyebrow="Profil ve ayarlar" title={<>Hesabın ve <em>tercihlerin</em></>} />

      <section className="card settings-card">
        <div className="profile-id">
          <span className="profile-id__avatar">{(profile.name || '?').slice(0, 1).toLocaleUpperCase('tr')}</span>
          <div>
            <strong>{profile.name || 'Adsız'}</strong>
            <small>{formatDayMonth(profile.joinedOn)} tarihinden beri</small>
          </div>
        </div>
        <div className="field-row">
          <Field label="Adın">
            <input className="input" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} data-testid="profile-name" />
          </Field>
          <Field label="E-posta" hint="Prototipte giriş altyapısı yoktur.">
            <input className="input" type="email" value={profile.email} onChange={(e) => updateProfile({ email: e.target.value })} placeholder="ornek@adres.test" />
          </Field>
        </div>
      </section>

      <section className="card settings-card">
        <div className="card__title">Plan tercihleri</div>
        <div className="field">
          <span className="field__label">Odaklandığın alanlar</span>
          <div className="option-row">
            {(Object.keys(AREAS) as GoalArea[]).map((a) => (
              <button
                key={a}
                type="button"
                className="option-chip"
                aria-pressed={profile.areas.includes(a)}
                onClick={() =>
                  updateProfile({ areas: profile.areas.includes(a) ? profile.areas.filter((x) => x !== a) : [...profile.areas, a] })
                }
              >
                <span className="dot" style={{ background: AREAS[a].color }} />
                {AREAS[a].short}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field__label">En verimli zamanın</span>
          <Segmented<WorkWindow>
            block
            value={profile.workWindow}
            onChange={(workWindow) => updateProfile({ workWindow })}
            options={[{ value: 'sabah', label: 'Sabah' }, { value: 'oglen', label: 'Öğleden sonra' }, { value: 'aksam', label: 'Akşam' }]}
          />
        </div>
        <div className="field">
          <span className="field__label">Günlük plan kapasiten: {profile.dailyMinutes} dakika</span>
          <input
            type="range"
            className="range"
            min={30}
            max={240}
            step={15}
            value={profile.dailyMinutes}
            onChange={(e) => updateProfile({ dailyMinutes: Number(e.target.value) })}
            aria-label="Günlük plan kapasitesi"
            data-testid="capacity"
          />
          <span className="field__hint">Takvimdeki yük çizgisi ve koçun önerileri buna göre çalışır.</span>
        </div>
        <div className="field">
          <span className="field__label">Koçun tonu</span>
          <Segmented<Profile['tone']>
            block
            value={profile.tone}
            onChange={(tone) => updateProfile({ tone })}
            options={[{ value: 'sakin', label: 'Sakin' }, { value: 'motive', label: 'Motive edici' }, { value: 'sade', label: 'Kısa ve sade' }]}
          />
          <span className="field__hint">Simülasyonda metinleri değiştirmez, gerçek üründe kullanılacak.</span>
        </div>
      </section>

      <section className="card settings-card">
        <div className="card__title">Görünüm</div>
        <Segmented
          block
          value={theme}
          onChange={setTheme}
          ariaLabel="Tema"
          options={[{ value: 'acik', label: 'Açık' }, { value: 'koyu', label: 'Koyu' }]}
        />
      </section>

      <Link to="/abonelik" className="card settings-link" data-testid="subscription-link">
        <div>
          <div className="card__title">Abonelik</div>
          <small>{planLabel}</small>
        </div>
        <span className="settings-link__right"><SimBadge /><ChevronRight size={18} /></span>
      </Link>

      <section className="card settings-card">
        <div className="card__title">Koç hafızası</div>
        <p className="settings-note">Koç yalnızca burada gördüğün notları hatırlar. Dilediğin notu silebilirsin.</p>
        <ul className="mem-list">
          {coachMemory.map((m) => (
            <li key={m.id}>
              <span>{m.text}<small>{formatDayMonthShort(m.addedOn)}</small></span>
              <IconButton size="sm" label="Notu sil" onClick={() => removeMemory(m.id)}><X size={14} /></IconButton>
            </li>
          ))}
          {coachMemory.length === 0 && <li style={{ color: 'var(--muted)' }}>Henüz not yok.</li>}
        </ul>
        <Button variant="secondary" size="sm" style={{ alignSelf: 'flex-start' }} onClick={() => { clearChat(); pushToast({ text: 'Sohbet geçmişi silindi', tone: 'basari' }); }}>
          Sohbet geçmişini sil
        </Button>
      </section>

      <section className="card settings-card">
        <div className="card__title">Gizlilik ve izinler</div>
        <div className="consent-note">Metinler yer tutucudur. Gerçek metinleri hukukçu hazırlayacak.</div>
        <div>
          <div className="setting-row">
            <div>
              <div className="setting-row__title">Üçüncü taraf yapay zekâ izni</div>
              <div className="setting-row__desc">Kapatırsan koç çalışmaz; plan, odak ve raporlar çalışır.</div>
            </div>
            <Switch checked={consents.thirdPartyAi} onChange={(v) => setConsents({ thirdPartyAi: v })} label="Üçüncü taraf yapay zekâ izni" />
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row__title">Kampanya ve duyurular</div>
              <div className="setting-row__desc">İsteğe bağlı ticari ileti izni. Varsayılan olarak kapalıdır.</div>
            </div>
            <Switch checked={consents.marketing} onChange={(v) => setConsents({ marketing: v })} label="Ticari ileti izni" />
          </div>
        </div>
        <div className="settings-actions">
          <Button variant="secondary" onClick={exportData} data-testid="export-data"><Download size={16} /> Verilerimi indir</Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)} data-testid="delete-open"><Trash2 size={16} /> Hesabımı sil</Button>
        </div>
      </section>

      <section className="card settings-card">
        <div className="card__title">Prototip hakkında</div>
        <p className="settings-note">Veriler yalnızca bu tarayıcıda saklanır. Sunucu, gerçek yapay zekâ, ödeme ve telefon bildirimi yoktur. "Düzen" çalışma adıdır; kesin ürün adı değildir.</p>
      </section>

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Hesabını silmek istiyor musun?"
        subtitle="Prototipte bu işlem tarayıcıdaki tüm verileri siler ve karşılama ekranına döner."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Vazgeç</Button>
            <Button variant="danger" onClick={() => { setDeleteOpen(false); resetAll(); navigate('/hosgeldin'); }} data-testid="delete-confirm">Evet, sil</Button>
          </>
        }
      >
        <p>Hedeflerin, görevlerin, raporların ve yoldaşın silinir. Silmeden önce verilerini indirebilirsin.</p>
      </Sheet>
    </div>
  );
}
