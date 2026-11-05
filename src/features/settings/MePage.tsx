import { AlarmClock, ChartNoAxesColumn, ChevronRight, CreditCard, FlaskConical, Origami, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { levelFor, levelProgress, stageFor } from '@/domain/gamification';
import { Label, Progress } from '@/design-system/ui';
import { PetStage } from '@/features/pet/PetStage';
import { useApp } from '@/store/app';
import { useUi } from '@/store/ui';
import './settings.css';

const LINKS = [
  { to: '/hayvan', icon: Origami, title: 'Yoldaşım', sub: 'Gelişim, ödüller, başarılar' },
  { to: '/raporlar', icon: ChartNoAxesColumn, title: 'Raporlar', sub: 'Haftalık ve aylık gelişim' },
  { to: '/hatirlaticilar', icon: AlarmClock, title: 'Hatırlatıcılar', sub: 'Bildirim tercihleri' },
  { to: '/abonelik', icon: CreditCard, title: 'Abonelik', sub: 'Plan ve deneme durumu' },
  { to: '/profil', icon: UserRound, title: 'Profil ve ayarlar', sub: 'Hesap, gizlilik, görünüm' },
];

export function MePage() {
  const profile = useApp((s) => s.profile);
  const pet = useApp((s) => s.pet);
  const setDemoOpen = useUi((s) => s.setDemoOpen);
  return (
    <div className="page page--narrow">
      <header>
        <Label>Sen</Label>
        <h1 className="page-title" style={{ marginTop: 6 }}>{profile.name || 'Merhaba'}</h1>
      </header>

      <Link to="/hayvan" className="card card--flush me-pet">
        <PetStage size={120} height={150} />
        <div className="me-pet__body">
          <strong>{pet.name || 'Yoldaşın'}</strong>
          <small>{levelFor(pet.xp)}. seviye · {stageFor(pet.xp).name}</small>
          <Progress value={levelProgress(pet.xp)} tone="warm" label="Seviye" />
        </div>
      </Link>

      <nav className="card card--flush me-links" aria-label="Hesap bölümleri">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="me-link" data-testid={`me-${l.to.slice(1)}`}>
            <span className="me-link__icon"><l.icon size={19} /></span>
            <span className="me-link__text">
              <strong>{l.title}</strong>
              <small>{l.sub}</small>
            </span>
            <ChevronRight size={18} />
          </Link>
        ))}
      </nav>

      <button type="button" className="me-demo" onClick={() => setDemoOpen(true)}>
        <FlaskConical size={16} /> Prototip · Sunum panelini aç
      </button>
    </div>
  );
}
