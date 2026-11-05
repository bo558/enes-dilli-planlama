import {
  AlarmClock,
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  FlaskConical,
  ListChecks,
  Origami,
  Sunrise,
  Target,
  Timer,
  UserRound,
  MessagesSquare,
} from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logoBeyaz from '@/assets/logo-beyaz.png';
import { levelFor, levelProgress, stageFor } from '@/domain/gamification';
import { Progress, Segmented } from '@/design-system/ui';
import { RibbonMark } from '@/design-system/Ribbon';
import { PetArt } from '@/features/pet/PetArt';
import { useApp } from '@/store/app';
import { useUi } from '@/store/ui';
import { useNavigate } from 'react-router-dom';

const MAIN_NAV = [
  { to: '/', label: 'Bugün', icon: Sunrise, end: true },
  { to: '/planla', label: 'Takvim', icon: CalendarDays },
  { to: '/gorevler', label: 'Görevler', icon: ListChecks },
  { to: '/hedefler', label: 'Hedefler', icon: Target },
  { to: '/odak', label: 'Odak', icon: Timer },
];
const GROW_NAV = [
  { to: '/hayvan', label: 'Yoldaşım', icon: Origami },
  { to: '/raporlar', label: 'Raporlar', icon: ChartNoAxesColumn },
];
const SYS_NAV = [
  { to: '/hatirlaticilar', label: 'Hatırlatıcılar', icon: AlarmClock },
  { to: '/profil', label: 'Profil ve ayarlar', icon: UserRound },
];

function Rail() {
  const pet = useApp((s) => s.pet);
  const unread = useApp((s) => s.notifications.filter((n) => !n.read).length);
  const setDemoOpen = useUi((s) => s.setDemoOpen);
  const setNotifOpen = useUi((s) => s.setNotifOpen);
  const stage = stageFor(pet.xp);

  const item = (n: (typeof MAIN_NAV)[number]) => (
    <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `rail__link ${isActive ? 'is-active' : ''}`}>
      <n.icon size={19} strokeWidth={1.9} />
      <span className="rail__text">{n.label}</span>
    </NavLink>
  );

  return (
    <aside className="rail">
      <div className="rail__brand">
        <img src={logoBeyaz} alt="Enes Dilli Akademi" className="rail__logo" />
        <span className="rail__mark"><RibbonMark size={34} color="#60a4f1" /></span>
      </div>

      <NavLink to="/koc" className={({ isActive }) => `rail__coach ${isActive ? 'is-active' : ''}`}>
        <MessagesSquare size={19} strokeWidth={1.9} />
        <span className="rail__text">
          <strong>Koçun</strong>
          <small>Birlikte planlayalım</small>
        </span>
      </NavLink>

      <nav className="rail__nav" aria-label="Ana gezinti">
        {MAIN_NAV.map(item)}
        <div className="rail__sep" />
        {GROW_NAV.map(item)}
        <div className="rail__sep" />
        {SYS_NAV.map(item)}
        <button type="button" className="rail__link" onClick={() => setNotifOpen(true)}>
          <span className="rail__bell">
            <Bell size={19} strokeWidth={1.9} />
            {unread > 0 && <i>{unread}</i>}
          </span>
          <span className="rail__text">Bildirim merkezi</span>
        </button>
      </nav>

      <div className="rail__foot">
        <NavLink to="/hayvan" className="rail__pet">
          <span className="rail__pet-art">
            <PetArt species={pet.species} stage={stage.id} equipped={pet.equipped} size={40} mood="neseli" />
          </span>
          <span className="rail__text rail__pet-info">
            <strong>{pet.name || 'Yoldaşın'}</strong>
            <small>{levelFor(pet.xp)}. seviye · {stage.name}</small>
            <Progress value={levelProgress(pet.xp)} tone="warm" thin label="Seviye ilerlemesi" />
          </span>
        </NavLink>
        <button type="button" className="rail__demo" onClick={() => setDemoOpen(true)} data-testid="demo-open">
          <FlaskConical size={15} />
          <span className="rail__text">Prototip · Sunum paneli</span>
        </button>
      </div>
    </aside>
  );
}

function TabBar() {
  const { pathname } = useLocation();
  const inPlan = ['/planla', '/gorevler', '/hedefler'].some((p) => pathname.startsWith(p));
  const inMe = ['/ben', '/hayvan', '/raporlar', '/hatirlaticilar', '/profil', '/abonelik'].some((p) => pathname.startsWith(p));
  const tab = (to: string, label: string, Icon: typeof Sunrise, active: boolean) => (
    <NavLink to={to} className={`tab ${active ? 'is-active' : ''}`}>
      <span className="tab__mark" aria-hidden="true" />
      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
      <span>{label}</span>
    </NavLink>
  );
  return (
    <nav className="tabbar" aria-label="Alt gezinti">
      {tab('/', 'Bugün', Sunrise, pathname === '/')}
      {tab('/planla', 'Planla', CalendarDays, inPlan)}
      <NavLink to="/koc" className={`tab tab--coach ${pathname === '/koc' ? 'is-active' : ''}`}>
        <span className="tab__coach-btn"><RibbonMark size={30} color="#fff" /></span>
        <span>Koç</span>
      </NavLink>
      {tab('/odak', 'Odak', Timer, pathname.startsWith('/odak'))}
      {tab('/ben', 'Ben', UserRound, inMe)}
    </nav>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.scrollTo(0, 0);
    // Sayfa değişince açık pencereler arkada kalıp ekranı kilitlemesin.
    useUi.setState({
      taskSheetId: null,
      rescheduleId: null,
      splitId: null,
      newTaskFor: null,
      notifOpen: false,
      closingOpen: false,
      demoOpen: false,
      coachDrawerOpen: false,
    });
  }, [pathname]);

  return (
    <div className="shell">
      <Rail />
      <main className="shell__main" ref={mainRef}>
        <div className="page-wrap" key={pathname}>
          <Outlet />
        </div>
      </main>
      <TabBar />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        {eyebrow && <span className="label">{eyebrow}</span>}
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  );
}

/** Mobilde Planla sekmesinin içindeki üç görünüm */
export function PlanTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const value = pathname.startsWith('/gorevler') ? '/gorevler' : pathname.startsWith('/hedefler') ? '/hedefler' : '/planla';
  return (
    <div className="plan-tabs">
      <Segmented
        block
        ariaLabel="Planlama görünümü"
        value={value}
        onChange={(v) => navigate(v, { replace: true })}
        options={[
          { value: '/planla', label: 'Takvim' },
          { value: '/gorevler', label: 'Görevler' },
          { value: '/hedefler', label: 'Hedefler' },
        ]}
      />
    </div>
  );
}
