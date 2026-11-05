import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { PageHeader, PlanTabs } from '@/app/AppShell';
import { AREAS } from '@/domain/catalog';
import {
  addDays,
  addMonths,
  formatDayMonth,
  formatDuration,
  formatFull,
  formatMonthYear,
  formatWeekdayShort,
  isSameMonth,
  monthGrid,
  weekDays,
  WEEKDAY_LABELS,
} from '@/domain/dates';
import { dayLoad, isOverdue, sortTasks, tasksOn } from '@/domain/stats';
import type { ISODate, Task } from '@/domain/types';
import { Button, EmptyState, IconButton, Segmented, Triangle } from '@/design-system/ui';
import { TaskCheck, TaskRow } from '@/features/tasks/TaskRow';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './planner.css';

type View = 'gun' | 'hafta' | 'ay';

function LoadBar({ load, capacity }: { load: number; capacity: number }) {
  const pct = Math.min(1, load / capacity);
  const over = load > capacity;
  return (
    <div className="load" title={`Plan: ${formatDuration(load)} / ${formatDuration(capacity)}`}>
      <div className={`load__fill ${over ? 'is-over' : ''}`} style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

function MiniCard({ task, onDragStart, onDragEnd }: { task: Task; onDragStart: (e: DragEvent) => void; onDragEnd: () => void }) {
  const goal = useApp((s) => s.goals.find((g) => g.id === task.goalId));
  const toggleTask = useApp((s) => s.toggleTask);
  const openTask = useUi((s) => s.openTask);
  const today = useToday();
  const late = isOverdue(task, today);
  return (
    <div
      className={`mini ${task.doneOn ? 'is-done' : ''} ${late ? 'is-late' : ''}`}
      draggable={!task.doneOn}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => openTask(task.id)}
      data-testid="planner-card"
      data-task-id={task.id}
      style={{ '--area': goal ? AREAS[goal.area].color : 'var(--line-strong)' } as React.CSSProperties}
    >
      <TaskCheck done={!!task.doneOn} onToggle={() => toggleTask(task.id)} label={`${task.title} tamamla`} />
      <div className="mini__body">
        <span className="mini__title">{task.title}</span>
        <span className="mini__meta">{task.time ? `${task.time} · ` : ''}{formatDuration(task.estimateMin)}</span>
        {late && <span className="mini__late">Yeni tarih bekliyor</span>}
      </div>
    </div>
  );
}

function WeekView({ anchor }: { anchor: ISODate }) {
  const today = useToday();
  const tasks = useApp((s) => s.tasks);
  const capacity = useApp((s) => s.profile.dailyMinutes);
  const moveTask = useApp((s) => s.moveTask);
  const openNewTask = useUi((s) => s.openNewTask);
  const pushToast = useUi((s) => s.pushToast);
  const [over, setOver] = useState<ISODate | null>(null);
  const [showPast, setShowPast] = useState(false);
  const days = weekDays(anchor);
  const hasPast = days.some((d) => d < today);

  const onDrop = (e: DragEvent, date: ISODate) => {
    e.preventDefault();
    setOver(null);
    document.body.classList.remove('is-dragging');
    const id = e.dataTransfer.getData('text/task');
    if (!id) return;
    const task = useApp.getState().tasks.find((t) => t.id === id);
    if (task && task.date !== date) {
      moveTask(id, date, 'oncelik');
      pushToast({ text: `Görev ${formatDayMonth(date)} tarihine taşındı`, tone: 'basari' });
    }
  };

  return (
    <div className={`week ${showPast ? 'show-past' : ''}`} data-testid="week-view">
      {hasPast && (
        <button type="button" className="past-toggle" onClick={() => setShowPast((v) => !v)} data-testid="past-toggle">
          {showPast ? 'Geçen günleri gizle' : 'Bu haftanın geçen günlerini göster'}
        </button>
      )}
      {days.map((d, i) => {
        const list = sortTasks(tasksOn(tasks, d));
        const load = dayLoad(tasks, d);
        return (
          <section
            key={d}
            className={`day-col ${d === today ? 'is-today' : ''} ${over === d ? 'is-over' : ''} ${d < today ? 'is-past' : ''}`}
            data-date={d}
            data-testid="day-col"
            onDragOver={(e) => { e.preventDefault(); setOver(d); }}
            onDragLeave={() => setOver((v) => (v === d ? null : v))}
            onDrop={(e) => onDrop(e, d)}
          >
            <header className="day-col__head">
              <div className="day-col__date">
                <span>{WEEKDAY_LABELS[i]}</span>
                <strong className="num">{Number(d.slice(8))}</strong>
                {d === today && <Triangle size={10} />}
              </div>
              <IconButton size="sm" label={`${formatDayMonth(d)} için görev ekle`} onClick={() => openNewTask({ date: d })}>
                <Plus size={15} />
              </IconButton>
            </header>
            <LoadBar load={load} capacity={capacity} />
            <div className="day-col__list">
              {list.map((t) => (
                <div key={t.id} className="day-col__item">
                  <span className="only-narrow"><TaskRow task={t} /></span>
                  <span className="only-wide">
                    <MiniCard
                      task={t}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/task', t.id);
                        document.body.classList.add('is-dragging');
                      }}
                      onDragEnd={() => document.body.classList.remove('is-dragging')}
                    />
                  </span>
                </div>
              ))}
              {list.length === 0 && <span className="day-col__empty">Boş</span>}
            </div>
            {load > capacity && <span className="day-col__over">Yoğun: {formatDuration(load)}</span>}
          </section>
        );
      })}
    </div>
  );
}

function DayView({ anchor, setAnchor }: { anchor: ISODate; setAnchor: (d: ISODate) => void }) {
  const today = useToday();
  const tasks = useApp((s) => s.tasks);
  const capacity = useApp((s) => s.profile.dailyMinutes);
  const openNewTask = useUi((s) => s.openNewTask);
  const list = sortTasks(tasksOn(tasks, anchor));
  const untimed = list.filter((t) => !t.time);
  const timed = list.filter((t) => t.time);
  const load = dayLoad(tasks, anchor);
  const hours = Array.from({ length: 17 }, (_, i) => 7 + i);
  const nowHour = new Date().getHours();

  return (
    <div className="day-view" data-testid="day-view">
      <div className="date-strip">
        {weekDays(anchor).map((d) => (
          <button key={d} type="button" className={`date-chip ${d === anchor ? 'is-active' : ''} ${d === today ? 'is-today' : ''}`} onClick={() => setAnchor(d)}>
            <span>{formatWeekdayShort(d)}</span>
            <strong className="num">{Number(d.slice(8))}</strong>
            <i className={tasksOn(tasks, d).length ? 'has' : ''} />
          </button>
        ))}
      </div>

      <div className="day-summary">
        <div>
          <strong>{formatFull(anchor)}</strong>
          <span>{list.length} görev · kalan {formatDuration(load)} / {formatDuration(capacity)}</span>
        </div>
        <LoadBar load={load} capacity={capacity} />
      </div>

      {untimed.length > 0 && (
        <section>
          <h3 className="sub-title">Saati belirsiz</h3>
          <div className="task-list">
            {untimed.map((t) => <TaskRow key={t.id} task={t} />)}
          </div>
        </section>
      )}

      <section className="timeline">
        {hours.map((h) => {
          const inHour = timed.filter((t) => Number(t.time!.slice(0, 2)) === h);
          return (
            <div key={h} className={`hour ${anchor === today && h === nowHour ? 'is-now' : ''}`}>
              <span className="hour__label num">{String(h).padStart(2, '0')}:00</span>
              <div className="hour__slot">
                {inHour.map((t) => <TaskRow key={t.id} task={t} />)}
                {inHour.length === 0 && (
                  <button
                    type="button"
                    className="hour__add"
                    aria-label={`${h}:00 için görev ekle`}
                    onClick={() => openNewTask({ date: anchor, time: `${String(h).padStart(2, '0')}:00` })}
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function MonthView({ anchor }: { anchor: ISODate }) {
  const today = useToday();
  const tasks = useApp((s) => s.tasks);
  const goals = useApp((s) => s.goals);
  const openNewTask = useUi((s) => s.openNewTask);
  const [selected, setSelected] = useState<ISODate>(isSameMonth(today, anchor) ? today : anchor);
  const grid = monthGrid(anchor);
  const milestones = useMemo(() => {
    const m = new Map<ISODate, string[]>();
    goals.forEach((g) => g.milestones.filter((x) => x.dueDate && !x.doneOn).forEach((x) => m.set(x.dueDate!, [...(m.get(x.dueDate!) ?? []), x.title])));
    return m;
  }, [goals]);
  const selectedList = sortTasks(tasksOn(tasks, selected));

  return (
    <div className="month-wrap" data-testid="month-view">
      <div className="month">
        {WEEKDAY_LABELS.map((w) => <div key={w} className="month__wd">{w}</div>)}
        {grid.map((d) => {
          const list = tasksOn(tasks, d);
          const open = list.filter((t) => !t.doneOn);
          const done = list.length - open.length;
          const missed = list.some((t) => isOverdue(t, today));
          const ms = milestones.get(d);
          return (
            <button
              key={d}
              type="button"
              data-testid="month-cell"
              data-date={d}
              className={`mcell ${isSameMonth(d, anchor) ? '' : 'is-out'} ${d === today ? 'is-today' : ''} ${d === selected ? 'is-selected' : ''}`}
              onClick={() => setSelected(d)}
              aria-label={`${formatDayMonth(d)}: ${list.length} görev`}
            >
              <span className="mcell__num num">{Number(d.slice(8))}</span>
              <span className="mcell__dots">
                {ms && <Triangle size={9} />}
                {missed && <i className="d d--bad" />}
                {list.length > 0 && <small className="num">{done}/{list.length}</small>}
              </span>
              <span className="mcell__titles">
                {list.slice(0, 2).map((t) => (
                  <em key={t.id} className={t.doneOn ? 'is-done' : ''}>{t.title}</em>
                ))}
                {list.length > 2 && <em className="more">+{list.length - 2} görev</em>}
              </span>
            </button>
          );
        })}
      </div>
      <section className="month-side">
        <div className="section-head">
          <h3 className="sub-title" style={{ margin: 0 }}>{formatFull(selected)}</h3>
          <button type="button" className="link-more" onClick={() => openNewTask({ date: selected })}><Plus size={15} /> Ekle</button>
        </div>
        {milestones.get(selected)?.map((m) => (
          <div key={m} className="ms-flag"><Triangle size={10} /> Kilometre taşı: {m}</div>
        ))}
        <div className="task-list">
          {selectedList.map((t) => <TaskRow key={t.id} task={t} />)}
        </div>
        {selectedList.length === 0 && <EmptyState title="Bu gün boş" />}
      </section>
    </div>
  );
}

export function PlannerPage() {
  const today = useToday();
  const [view, setView] = useState<View>('hafta');
  const [anchor, setAnchor] = useState<ISODate>(today);
  const openNewTask = useUi((s) => s.openNewTask);

  const shift = (dir: 1 | -1) => {
    if (view === 'gun') setAnchor((a) => addDays(a, dir));
    if (view === 'hafta') setAnchor((a) => addDays(a, dir * 7));
    if (view === 'ay') setAnchor((a) => addMonths(a, dir));
  };

  const label =
    view === 'gun'
      ? formatDayMonth(anchor)
      : view === 'hafta'
        ? `${formatDayMonth(weekDays(anchor)[0])} – ${formatDayMonth(weekDays(anchor)[6])}`
        : formatMonthYear(anchor);

  return (
    <div className="page planner">
      <PlanTabs />
      <PageHeader
        eyebrow="Planlama"
        title={<>Planını <em>gör ve düzenle</em></>}
        actions={<Button onClick={() => openNewTask({ date: anchor })} data-testid="planner-add"><Plus size={17} /> Görev ekle</Button>}
      />
      <button type="button" className="planner-fab" aria-label="Görev ekle" onClick={() => openNewTask({ date: anchor })} data-testid="planner-fab">
        <Plus size={24} />
      </button>
      <div className="planner-bar">
        <Segmented<View>
          ariaLabel="Takvim görünümü"
          value={view}
          onChange={setView}
          options={[
            { value: 'gun', label: 'Gün' },
            { value: 'hafta', label: 'Hafta' },
            { value: 'ay', label: 'Ay' },
          ]}
        />
        <div className="planner-nav">
          <IconButton label="Önceki" onClick={() => shift(-1)} data-testid="planner-prev"><ChevronLeft size={20} /></IconButton>
          <strong className="planner-label">{label}</strong>
          <IconButton label="Sonraki" onClick={() => shift(1)} data-testid="planner-next"><ChevronRight size={20} /></IconButton>
          <Button size="sm" variant="secondary" onClick={() => setAnchor(today)}>Bugün</Button>
        </div>
      </div>
      {view === 'hafta' && <p className="planner-tip only-wide">Görevleri günler arasında sürükleyebilirsin. Üst çizgi günlük kapasiteni gösterir.</p>}
      {view === 'hafta' && <WeekView anchor={anchor} />}
      {view === 'gun' && <DayView anchor={anchor} setAnchor={setAnchor} />}
      {view === 'ay' && <MonthView key={anchor.slice(0, 7)} anchor={anchor} />}
    </div>
  );
}
