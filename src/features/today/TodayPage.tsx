import { ArrowRight, Bell, CalendarClock, ChevronRight, FlaskConical, MessagesSquare, Moon, Plus, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AREAS } from '@/domain/catalog';
import { formatDuration, formatFull, greetingFor, startOfWeek, weekDays, WEEKDAY_LABELS } from '@/domain/dates';
import { levelFor, levelProgress, MOOD_LINE, nextStage, stageFor } from '@/domain/gamification';
import {
  activeDaysInWeek,
  dayLoad,
  dayProgress,
  goalProgress,
  isOverdue,
  nextMilestone,
  sortTasks,
  tasksOn,
} from '@/domain/stats';
import { Ribbon } from '@/design-system/Ribbon';
import { Button, EmptyState, IconButton, Label, Progress, Triangle } from '@/design-system/ui';
import { PetStage, usePetMood } from '@/features/pet/PetStage';
import { TaskCheck, TaskRow } from '@/features/tasks/TaskRow';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './today.css';

const NUM_WORDS = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on'];
const word = (n: number) => NUM_WORDS[n] ?? String(n);

function DayHero() {
  const today = useToday();
  const data = useApp();
  const { tasks, sessions, xpEvents } = data;
  const progress = dayProgress(tasks, today);
  const remaining = progress.total - progress.done;
  const focusMin = sessions.filter((s) => s.date === today).reduce((s, x) => s + x.actualMin, 0);
  const xpToday = xpEvents.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);
  const week = weekDays(today);
  const active = new Set(activeDaysInWeek(data, startOfWeek(today)));
  const setClosingOpen = useUi((s) => s.setClosingOpen);
  const closed = !!data.closings[today];
  const pct = Math.round(progress.pct * 100);

  return (
    <section className="hero" data-testid="day-hero">
      <div className="hero__top">
        <div className="hero__ribbon">
          <Ribbon
            value={progress.pct}
            size={170}
            track="rgb(255 255 255 / 0.1)"
            fill="#60a4f1"
            label={`Bugünkü plan yüzde ${pct}`}
          />
        </div>
        <div className="hero__copy">
          <span className="hero__pct num" data-testid="day-pct">%{pct}</span>
          <h2 className="hero__title">
            {progress.total === 0 ? (
              <>Bugün için <em>henüz plan yok</em></>
            ) : remaining === 0 ? (
              <>Bugünkü plan <em>tamam</em></>
            ) : (
              <>Bugün <em>{word(remaining)} adım</em> kaldı</>
            )}
          </h2>
        </div>
      </div>

      <div className="hero__stats">
        <div><strong className="num">{progress.done}/{progress.total}</strong><span>görev</span></div>
        <div><strong className="num">{formatDuration(focusMin)}</strong><span>odak</span></div>
        <div><strong className="num">+{xpToday}</strong><span>puan</span></div>
      </div>

      <div className="hero__foot">
        <div className="rhythm" aria-label={`Bu hafta ${active.size} gün aktif`}>
          {week.map((d, i) => (
            <div key={d} className={`rhythm__day ${d === today ? 'is-today' : ''}`}>
              <Triangle size={13} color={active.has(d) ? 'var(--amber)' : 'rgb(255 255 255 / 0.22)'} filled={active.has(d)} />
              <span>{WEEKDAY_LABELS[i]}</span>
            </div>
          ))}
        </div>
        <Button
          variant={closed ? 'ghost' : 'warm'}
          size="sm"
          className={closed ? 'hero__closed' : ''}
          onClick={() => setClosingOpen(true)}
          data-testid="open-closing"
        >
          <Moon size={15} /> {closed ? 'Gün kapatıldı' : 'Akşam kapanışı'}
        </Button>
      </div>
    </section>
  );
}

function CoachNudge() {
  const today = useToday();
  const { tasks, profile, consents } = useApp();
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const load = dayLoad(tasks, today);
  const setCoachDraft = useUi((s) => s.setCoachDraft);
  const navigate = useNavigate();
  const [text, setText] = useState('');

  const suggestion = overdue.length
    ? { line: `${word(overdue.length)[0].toLocaleUpperCase('tr')}${word(overdue.length).slice(1)} görev bekliyor. Tekrar tekrar taşınanı birlikte küçültelim mi?`, prompt: 'Sürekli erteliyorum', cta: 'Birlikte bakalım' }
    : load > profile.dailyMinutes
      ? { line: `Bugünkü planın ${formatDuration(load)}. Hedeflediğin süreden fazla. Hafifletelim mi?`, prompt: 'Bu hafta çok yüklüyüm', cta: 'Planı hafiflet' }
      : { line: 'Nereden başlayacağını birlikte seçebiliriz.', prompt: 'Bugün ne yapmalıyım?', cta: 'Bana sırayı söyle' };

  const go = (message: string) => {
    if (!message.trim()) return;
    setCoachDraft(message.trim());
    navigate('/koc');
  };

  return (
    <section className="card coach-nudge">
      <div className="coach-nudge__head">
        <span className="coach-nudge__icon"><MessagesSquare size={17} /></span>
        <div>
          <div className="card__title">Koçun</div>
          <span className="sim-badge">Simülasyon</span>
        </div>
      </div>
      <p className="coach-nudge__line">{suggestion.line}</p>
      <Button block variant="secondary" onClick={() => go(suggestion.prompt)} data-testid="nudge-cta">
        {suggestion.cta} <ArrowRight size={16} />
      </Button>
      {consents.thirdPartyAi && (
        <form
          className="coach-nudge__form"
          onSubmit={(e) => {
            e.preventDefault();
            go(text);
          }}
        >
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Koça bir şey sor..." aria-label="Koça soru sor" />
        </form>
      )}
    </section>
  );
}

function PetCard() {
  const pet = useApp((s) => s.pet);
  const mood = usePetMood();
  const stage = stageFor(pet.xp);
  const next = nextStage(pet.xp);
  return (
    <Link to="/hayvan" className="card card--flush pet-card" data-testid="pet-card">
      <PetStage size={138} height={170} />
      <div className="pet-card__body">
        <div className="pet-card__row">
          <strong>{pet.name || 'Yoldaşın'}</strong>
          <span className="chip chip--warm">{levelFor(pet.xp)}. seviye</span>
        </div>
        <Progress value={levelProgress(pet.xp)} tone="warm" label="Seviye ilerlemesi" />
        <div className="pet-card__note">
          <span>{MOOD_LINE[mood]}</span>
          <span className="num" data-testid="pet-xp">{pet.xp} puan</span>
        </div>
        {next && (
          <small className="pet-card__next">{stage.name} → {next.name}: {next.xp - pet.xp} puan kaldı</small>
        )}
      </div>
    </Link>
  );
}

function GoalsMini() {
  const goals = useApp((s) => s.goals);
  const tasks = useApp((s) => s.tasks);
  const active = goals.filter((g) => !g.doneOn).slice(0, 3);
  return (
    <section className="card">
      <div className="card__head">
        <span className="card__title">Hedeflerin</span>
        <Link to="/hedefler" className="link-more">Tümü <ChevronRight size={15} /></Link>
      </div>
      <div className="goals-mini">
        {active.map((g) => {
          const pct = goalProgress(g, tasks);
          const nm = nextMilestone(g);
          return (
            <Link key={g.id} to={`/hedefler/${g.id}`} className="goals-mini__item">
              <div className="goals-mini__row">
                <span className="goals-mini__title"><span className="dot" style={{ background: AREAS[g.area].color }} />{g.title}</span>
                <span className="num goals-mini__pct">%{Math.round(pct * 100)}</span>
              </div>
              <Progress value={pct} thin label={g.title} />
              {nm && <small>Sıradaki: {nm.title}</small>}
            </Link>
          );
        })}
        {active.length === 0 && (
          <EmptyState title="Henüz hedef yok" action={<Link to="/hedefler/yeni" className="btn btn--secondary btn--sm">Hedef oluştur</Link>} />
        )}
      </div>
    </section>
  );
}

export function TodayPage() {
  const today = useToday();
  const { tasks, profile, notifications, sessions } = useApp();
  const openNewTask = useUi((s) => s.openNewTask);
  const openReschedule = useUi((s) => s.openReschedule);
  const toggleTask = useApp((s) => s.toggleTask);
  const setNotifOpen = useUi((s) => s.setNotifOpen);
  const setDemoOpen = useUi((s) => s.setDemoOpen);
  const addTask = useApp((s) => s.addTask);
  const navigate = useNavigate();
  const [quick, setQuick] = useState('');
  const list = sortTasks(tasksOn(tasks, today));
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const mit = list.find((t) => t.isMit && !t.doneOn);
  const unread = notifications.some((n) => !n.read);
  const hour = new Date().getHours();
  const yesterdayFocus = sessions.length;

  return (
    <div className="page today">
      <header className="today-head">
        <div>
          <Label>{formatFull(today)}</Label>
          <h1 className="page-title">
            {greetingFor(hour)}{profile.name ? <>, <em>{profile.name}</em></> : null}
          </h1>
        </div>
        <div className="top-actions">
          <IconButton label="Sunum paneli" className="only-mobile demo-mobile" onClick={() => setDemoOpen(true)} data-testid="demo-open-mobile">
            <FlaskConical size={19} />
          </IconButton>
          <IconButton label="Bildirim merkezi" className="bell-btn" onClick={() => setNotifOpen(true)} data-testid="bell">
            <Bell size={20} />
            {unread && <i />}
          </IconButton>
        </div>
      </header>

      <div className="today-grid">
        <div className="today-main">
          <DayHero />

          {overdue.length > 0 && (
            <motion.button
              type="button"
              className="overdue-bar"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate('/gorevler?f=kacan')}
              data-testid="overdue-bar"
            >
              <span>
                <strong>{overdue.length} görev</strong> yeni tarih bekliyor. Cezası yok, sadece yeniden planla.
              </span>
              <ChevronRight size={18} />
            </motion.button>
          )}

          {mit && (
            <section className="mit" data-testid="mit-card">
              <TaskCheck done={false} onToggle={() => toggleTask(mit.id)} label={`${mit.title} görevini tamamla`} />
              <div className="mit__text">
                <Label>Günün en önemli işi</Label>
                <h3>{mit.title}</h3>
                <small>{mit.time ? `${mit.time} · ` : ''}{formatDuration(mit.estimateMin)}</small>
              </div>
              <div className="mit__actions">
                <IconButton label="Ertele" onClick={() => openReschedule(mit.id)}><CalendarClock size={18} /></IconButton>
                <Button variant="dark" onClick={() => navigate(`/odak?gorev=${mit.id}`)} data-testid="mit-focus">
                  <Timer size={16} /> Odaklan
                </Button>
              </div>
            </section>
          )}

          <section>
            <div className="section-head">
              <h2 className="section-title">Bugünün planı</h2>
              <button type="button" className="link-more" onClick={() => openNewTask({ date: today })}>
                <Plus size={15} /> Ayrıntılı ekle
              </button>
            </div>
            <div className="task-list">
              {list.filter((t) => t.id !== mit?.id).map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
            {list.length === 0 && (
              <EmptyState title={yesterdayFocus ? 'Bugün boş' : 'Plan bekliyor'}>Bir görev ekleyerek güne başla.</EmptyState>
            )}
            <form
              className="quick-add"
              style={{ marginTop: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!quick.trim()) return;
                addTask({ title: quick.trim(), date: today });
                setQuick('');
              }}
            >
              <input
                className="input"
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
                placeholder="Bugüne hızlı görev ekle"
                aria-label="Bugüne hızlı görev ekle"
                data-testid="quick-add"
              />
              <Button type="submit" variant="secondary" disabled={!quick.trim()} aria-label="Ekle">
                <Plus size={17} />
              </Button>
            </form>
          </section>
        </div>

        <aside className="today-side">
          <PetCard />
          <CoachNudge />
          <GoalsMini />
        </aside>
      </div>
    </div>
  );
}
