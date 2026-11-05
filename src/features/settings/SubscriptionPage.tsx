import { ArrowLeft, Check, Minus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/app/AppShell';
import { diffDays, formatDayMonth } from '@/domain/dates';
import { Button, Sheet, SimBadge } from '@/design-system/ui';
import { billingService } from '@/services';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './settings.css';

const ROWS: { label: string; free: string | boolean; premium: string | boolean }[] = [
  { label: 'Hedef ve görev takibi', free: true, premium: true },
  { label: 'Pomodoro ve temel teknikler', free: true, premium: true },
  { label: 'Yoldaşını büyütme', free: true, premium: true },
  { label: 'Temel hatırlatıcılar', free: true, premium: true },
  { label: 'Koç mesajı', free: 'Ayda 15', premium: 'Adil kullanım' },
  { label: 'Koçla plan oluşturma', free: 'Ayda 1', premium: 'Sürekli güncelleme' },
  { label: 'Plana göre kişisel bildirimler', free: false, premium: true },
  { label: 'Haftalık rapor', free: 'Temel özet', premium: 'Koç yorumuyla' },
  { label: 'Aylık ayrıntılı rapor', free: false, premium: true },
  { label: 'Ek türler ve kozmetikler', free: false, premium: true },
];

const Cell = ({ v }: { v: string | boolean }) =>
  typeof v === 'string' ? <span>{v}</span> : v ? <Check size={17} className="plan-yes" aria-label="Var" /> : <Minus size={17} className="plan-no" aria-label="Yok" />;

export function SubscriptionPage() {
  const sub = useApp((s) => s.subscription);
  const setSubscription = useApp((s) => s.setSubscription);
  const pushToast = useUi((s) => s.pushToast);
  const today = useToday();
  const [plan, setPlan] = useState<'aylik' | 'yillik'>('yillik');
  const [confirm, setConfirm] = useState(false);
  const trialLeft = sub.trialEnds ? Math.max(0, diffDays(sub.trialEnds, today)) : 0;

  return (
    <div className="page page--narrow">
      <Link to="/profil" className="back-link"><ArrowLeft size={16} /> Profil</Link>
      <PageHeader
        eyebrow="Abonelik"
        title={sub.status === 'premium' ? <>Premium <em>aktif</em></> : sub.status === 'deneme' ? <>Denemende <em>{trialLeft} gün</em> kaldı</> : <>Ücretsiz <em>plandasın</em></>}
        sub={sub.status === 'deneme' && sub.trialEnds ? `${formatDayMonth(sub.trialEnds)} tarihine kadar tüm özellikler açık.` : undefined}
      />

      <div className="sim-strip">
        <SimBadge>Karar bekliyor</SimBadge>
        <span>Gelir modeli ve fiyatlar henüz kesin değildir. Ödeme alınmaz.</span>
      </div>

      <div className="plan-cards">
        {(['yillik', 'aylik'] as const).map((p) => {
          const info = billingService.plans[p];
          return (
            <button key={p} type="button" className="plan-card" aria-pressed={plan === p} onClick={() => setPlan(p)} data-testid={`plan-${p}`}>
              {p === 'yillik' && <span className="plan-card__tag">Önerilen</span>}
              <strong>{info.label}</strong>
              <span className="plan-card__price num">{info.price}<small>{info.period}</small></span>
              <small>{info.note}</small>
            </button>
          );
        })}
      </div>

      {sub.status === 'premium' ? (
        <Button variant="secondary" onClick={() => { setSubscription({ status: 'ucretsiz', plan: null }); pushToast({ text: 'Ücretsiz plana geçildi. Verilerin korunur.', tone: 'bilgi' }); }} data-testid="plan-cancel">
          Aboneliği iptal et
        </Button>
      ) : (
        <Button onClick={() => setConfirm(true)} data-testid="plan-buy">Premium'a geç</Button>
      )}

      <section className="card card--flush">
        <table className="plan-table">
          <thead>
            <tr><th>Özellik</th><th>Ücretsiz</th><th>Premium</th></tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td><Cell v={r.free} /></td>
                <td><Cell v={r.premium} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="settings-note">Abonelik bitse de hedeflerine, geçmişine ve verilerine erişimin sürer. Verilerini her zaman indirebilirsin.</p>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Ödeme simülasyonu"
        subtitle="Gerçek üründe burada App Store, Google Play veya web ödeme ekranı açılır."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Vazgeç</Button>
            <Button
              data-testid="plan-confirm"
              onClick={() => {
                setSubscription({ status: 'premium', plan });
                setConfirm(false);
                pushToast({ text: 'Premium etkin (simülasyon)', tone: 'basari' });
              }}
            >
              Simülasyonu tamamla
            </Button>
          </>
        }
      >
        <p>Seçilen plan: <strong>{billingService.plans[plan].label}, {billingService.plans[plan].price}</strong>. Herhangi bir ödeme alınmaz, kart bilgisi istenmez.</p>
      </Sheet>
    </div>
  );
}
