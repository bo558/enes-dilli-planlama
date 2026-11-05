import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessagesSquare, Play, RotateCcw, X } from 'lucide-react';
import { STAGES, stageFor, nextStage } from '@/domain/gamification';
import { ACTION_LABELS } from '@/domain/notifications';
import { formatClock, relativeDay } from '@/domain/dates';
import type { NotificationAction, NotificationCategory, Subscription } from '@/domain/types';
import { RibbonMark } from '@/design-system/Ribbon';
import { Button, EmptyState, IconButton, Segmented, Sheet } from '@/design-system/ui';
import { CoachPanel } from '@/features/coach/CoachPage';
import { PetArt } from '@/features/pet/PetArt';
import { FocusFullscreen } from '@/features/focus/FocusPage';
import { ClosingSheet, NewTaskSheet, RescheduleSheet, SplitSheet, TaskSheet } from '@/features/tasks/TaskSheets';
import { focusElapsedSec, useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';

const useNotificationAction = () => {
  const act = useApp((s) => s.actOnNotification);
  const navigate = useNavigate();
  const setOpen = useUi((s) => s.setNotifOpen);
  return (id: string, action: NotificationAction) => {
    act(id, action);
    if (action === 'ac-rapor') navigate('/raporlar');
    if (action === 'ac-koc') navigate('/koc');
    if (action === 'ac-hayvan') navigate('/hayvan');
    if (action.startsWith('ac-')) setOpen(false);
  };
};

function PushBanner() {
  const banner = useUi((s) => s.banner);
  const setBanner = useUi((s) => s.setBanner);
  const hideOnLock = useApp((s) => s.prefs.hideOnLock);
  const onAction = useNotificationAction();

  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 14000);
    return () => clearTimeout(id);
  }, [banner, setBanner]);

  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          className="push"
          role="status"
          data-testid="push-banner"
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.7, bottom: 0 }}
          onDragEnd={(_, i) => { if (i.offset.y < -40) setBanner(null); }}
        >
          <div className="push__head">
            <span className="push__icon"><RibbonMark size={15} color="#60a4f1" /></span>
            <span>Düzen · şimdi</span>
            <span className="sim-badge" style={{ marginLeft: 'auto' }}>Simülasyon</span>
            <IconButton label="Kapat" size="sm" onClick={() => setBanner(null)}><X size={15} /></IconButton>
          </div>
          <div className="push__title">{banner.title}</div>
          <div className="push__body">{hideOnLock && banner.taskId ? 'Bir görevin yeni tarih bekliyor.' : banner.body}</div>
          <div className="push__actions">
            {banner.actions.map((a, i) => (
              <Button key={a} size="sm" variant={i === 0 ? 'primary' : 'secondary'} onClick={() => onAction(banner.id, a)}>
                {ACTION_LABELS[a]}
              </Button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NotificationCenter() {
  const open = useUi((s) => s.notifOpen);
  const setOpen = useUi((s) => s.setNotifOpen);
  const notifications = useApp((s) => s.notifications);
  const markAllRead = useApp((s) => s.markAllRead);
  const today = useToday();
  const navigate = useNavigate();
  const onAction = useNotificationAction();

  return (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      title="Bildirim merkezi"
      subtitle="Uygulama içindeki tüm bildirimler burada kalır."
      footer={
        <>
          <Button variant="secondary" onClick={markAllRead}>Tümünü okundu say</Button>
          <Button variant="ghost" onClick={() => { setOpen(false); navigate('/hatirlaticilar'); }}>Tercihler</Button>
        </>
      }
    >
      {notifications.length === 0 && <EmptyState title="Henüz bildirim yok">Plana başladıkça burada görünecek.</EmptyState>}
      <div>
        {notifications.slice(0, 30).map((n) => (
          <div key={n.id} className={`notif ${n.read ? '' : 'is-unread'}`}>
            <span className="notif__dot" />
            <div style={{ flex: 1 }}>
              <div className="notif__title">{n.title}</div>
              <div className="notif__body">{n.body}</div>
              <div className="notif__meta">{relativeDay(n.date, today)}{n.outcome !== 'yanitsiz' ? ` · ${ACTION_LABELS[n.outcome]}` : ''}</div>
              {n.outcome === 'yanitsiz' && (
                <div className="notif__actions">
                  {n.actions.map((a) => (
                    <Button key={a} size="sm" variant="secondary" onClick={() => onAction(n.id, a)}>{ACTION_LABELS[a]}</Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function StageUp() {
  const stageId = useUi((s) => s.stageUp);
  const clear = useUi((s) => s.setStageUp);
  const pet = useApp((s) => s.pet);
  const stage = STAGES.find((s) => s.id === stageId);
  const prev = stage ? STAGES[STAGES.indexOf(stage) - 1] : null;
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!stageId) { setRevealed(false); return; }
    const id = setTimeout(() => setRevealed(true), 1100);
    return () => clearTimeout(id);
  }, [stageId]);

  const shards = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return { x: Math.cos(a) * (130 + (i % 3) * 50), y: Math.sin(a) * (130 + (i % 4) * 40), r: i * 47 };
  });

  return (
    <AnimatePresence>
      {stage && (
        <motion.div className="stage-up" role="dialog" aria-modal="true" data-testid="stage-up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {revealed && shards.map((s, i) => (
            <motion.svg
              key={i}
              className="stage-up__shard"
              width="14" height="13" viewBox="0 0 12 11"
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: s.x, y: s.y, opacity: 0, rotate: s.r }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              <path d="M6 .8 11.3 10.3H.7z" fill={i % 3 === 0 ? '#60a4f1' : '#f4b85e'} />
            </motion.svg>
          ))}
          <motion.div
            key={revealed ? 'yeni' : 'eski'}
            initial={revealed ? { scale: 0.4, opacity: 0 } : { scale: 1 }}
            animate={revealed ? { scale: 1, opacity: 1 } : { scale: [1, 1.04, 0.96, 1.08, 0.94], rotate: [0, -2, 2, -3, 3, 0] }}
            transition={revealed ? { type: 'spring', stiffness: 260, damping: 16 } : { duration: 1.1 }}
          >
            <PetArt
              species={pet.species}
              stage={revealed ? stage.id : (prev?.id ?? 'yumurta')}
              mood="neseli"
              equipped={revealed ? pet.equipped : []}
              size={210}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 12 }} style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
            <h2>{pet.name || 'Yoldaşın'} artık <em>{stage.name}</em></h2>
            <p>{stage.change}. Açılan ödül: {stage.reward}. Bunu günlük küçük adımlarınla kazandın.</p>
            <Button variant="warm" onClick={() => clear(null)} data-testid="stage-up-close">Devam et</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FocusTicker() {
  const focus = useApp((s) => s.focus);
  const complete = useApp((s) => s.completeFocusPhase);
  const location = useLocation();
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!focus?.startedAt) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      const f = useApp.getState().focus;
      if (f?.startedAt && f.plannedSec > 0 && focusElapsedSec(f) >= f.plannedSec) complete();
    }, 500);
    return () => clearInterval(id);
  }, [focus?.startedAt, complete]);

  if (!focus || location.pathname === '/odak') return null;
  const elapsed = focusElapsedSec(focus);
  const shown = focus.plannedSec ? focus.plannedSec - elapsed : elapsed;
  return (
    <button type="button" className="focus-pill" onClick={() => navigate('/odak')} data-testid="focus-pill">
      <span className="focus-pill__dot" />
      <span className="num">{formatClock(shown)}</span>
      <span style={{ fontWeight: 600, opacity: 0.75 }}>{focus.phase === 'mola' ? 'Mola' : focus.startedAt ? 'Odak' : 'Duraklatıldı'}</span>
    </button>
  );
}

function CoachLauncher() {
  const { pathname } = useLocation();
  const open = useUi((s) => s.coachDrawerOpen);
  const setOpen = useUi((s) => s.setCoachDrawerOpen);
  if (pathname === '/koc') return null;
  return (
    <>
      {!open && (
        <button type="button" className="coach-launcher" onClick={() => setOpen(true)} data-testid="coach-launcher">
          <MessagesSquare size={18} />
          Koça sor
        </button>
      )}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="coach-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
              <CoachPanel onClose={() => setOpen(false)} compact />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

const DEMO_NOTIFS: { label: string; hint: string; category: NotificationCategory }[] = [
  { label: 'Kaçan görev', hint: 'Durum kontrolüyle', category: 'kacan' },
  { label: 'Gün sonu', hint: 'Açık görev varsa', category: 'plan' },
  { label: 'Su ve hareket', hint: 'Yaşam hatırlatıcısı', category: 'yasam' },
  { label: 'Haftalık rapor', hint: 'Rapor hazır', category: 'rapor' },
];

function DemoPanel() {
  const open = useUi((s) => s.demoOpen);
  const setOpen = useUi((s) => s.setDemoOpen);
  const pushToast = useUi((s) => s.pushToast);
  const app = useApp();
  const navigate = useNavigate();
  const next = nextStage(app.pet.xp);

  const trigger = (c: NotificationCategory) => {
    const r = app.triggerNotification(c, { ignoreQuiet: true });
    setOpen(false);
    if (!r.passed) {
      const reason = r.gates.find((g) => !g.passed)?.detail ?? 'Koşul sağlanmadı.';
      pushToast({ text: `Gönderilmedi: ${reason}`, tone: 'uyari' });
    }
  };

  return (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      title="Sunum paneli"
      subtitle={`Prototipin ${app.isDemo ? 'örnek veri' : 'kendi verin'} modunda. Gün kaydırma: ${app.dayOffset > 0 ? `+${app.dayOffset}` : 'yok'}`}
    >
      <div className="demo-note">Bu panel yalnızca müşteri sunumu içindir, gerçek üründe bulunmaz.</div>
      <div>
        <span className="label label--muted" style={{ marginBottom: 8 }}>Zaman</span>
        <div className="demo-grid" style={{ marginTop: 8 }}>
          <button className="demo-btn" onClick={() => { app.demoAdvanceDay(); setOpen(false); }} data-testid="demo-next-day">
            Sonraki güne geç
            <small>Yapılmayan görevler kaçan görev olur</small>
          </button>
          <button
            className="demo-btn"
            disabled={!app.focus}
            style={{ opacity: app.focus ? 1 : 0.5 }}
            onClick={() => { app.fastForwardFocus(); setOpen(false); }}
            data-testid="demo-ff"
          >
            Odak süresini sona sar
            <small>{app.focus ? 'Son 3 saniyeye atlar' : 'Çalışan oturum yok'}</small>
          </button>
        </div>
      </div>
      <div>
        <span className="label label--muted">Bildirim dene</span>
        <div className="demo-grid" style={{ marginTop: 8 }}>
          {DEMO_NOTIFS.map((n) => (
            <button key={n.category} className="demo-btn" onClick={() => trigger(n.category)} data-testid={`demo-notif-${n.category}`}>
              {n.label}
              <small>{n.hint}</small>
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label label--muted">Yoldaş</span>
        <div className="demo-grid" style={{ marginTop: 8 }}>
          <button className="demo-btn" onClick={() => app.demoAddXp(100)}>+100 puan<small>Seviye göstermek için</small></button>
          <button
            className="demo-btn"
            disabled={!next}
            onClick={() => { if (next) app.demoAddXp(next.xp - app.pet.xp); setOpen(false); }}
            data-testid="demo-next-stage"
          >
            Sonraki aşama
            <small>{next ? `${next.name} anını göster` : `${stageFor(app.pet.xp).name}: son aşama`}</small>
          </button>
        </div>
      </div>
      <div>
        <span className="label label--muted">Abonelik durumu</span>
        <div style={{ marginTop: 8 }}>
          <Segmented<Subscription['status']>
            block
            value={app.subscription.status}
            onChange={(status) => app.setSubscription({ status, plan: status === 'premium' ? 'yillik' : null })}
            options={[
              { value: 'deneme', label: 'Deneme' },
              { value: 'ucretsiz', label: 'Ücretsiz' },
              { value: 'premium', label: 'Premium' },
            ]}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <Button variant="secondary" onClick={() => { setOpen(false); navigate('/tasarim'); }} data-testid="demo-design">
          Tasarım sistemini göster
        </Button>
        <Button variant="secondary" onClick={() => { app.loadDemo(); setOpen(false); navigate('/'); }} data-testid="demo-reload">
          <RotateCcw size={16} /> Örnek veriyi yeniden yükle
        </Button>
        <Button variant="ghost" onClick={() => { setOpen(false); app.resetAll(); navigate('/hosgeldin'); }} data-testid="demo-onboarding">
          <Play size={16} /> Karşılama akışını baştan başlat
        </Button>
      </div>
    </Sheet>
  );
}

export function GlobalLayer() {
  return (
    <>
      <PushBanner />
      <NotificationCenter />
      <StageUp />
      <FocusTicker />
      <CoachLauncher />
      <DemoPanel />
      <TaskSheet />
      <NewTaskSheet />
      <RescheduleSheet />
      <SplitSheet />
      <ClosingSheet />
      <FocusFullscreen />
    </>
  );
}
