import { ArrowLeft, Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AREAS } from '@/domain/catalog';
import { diffDays, formatDayMonth } from '@/domain/dates';
import { goalProgress, sortTasks } from '@/domain/stats';
import type { GoalArea, ISODate } from '@/domain/types';
import { Ribbon } from '@/design-system/Ribbon';
import { Button, EmptyState, Field, IconButton, Label, Sheet } from '@/design-system/ui';
import { TaskCheck, TaskRow } from '@/features/tasks/TaskRow';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './goals.css';

export function GoalDetailPage() {
  const { id } = useParams();
  const goal = useApp((s) => s.goals.find((g) => g.id === id));
  const allTasks = useApp((s) => s.tasks);
  const { toggleMilestone, addMilestone, removeMilestone, updateGoal, deleteGoal, toggleGoalDone } = useApp.getState();
  const openNewTask = useUi((s) => s.openNewTask);
  const pushToast = useUi((s) => s.pushToast);
  const today = useToday();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDate, setMsDate] = useState<ISODate>('');
  const [form, setForm] = useState({ title: '', why: '', area: 'planlama' as GoalArea, targetDate: '' });
  const [showDone, setShowDone] = useState(false);

  const tasks = useMemo(() => allTasks.filter((t) => t.goalId === id), [allTasks, id]);
  if (!goal) return <Navigate to="/hedefler" replace />;

  const open = sortTasks(tasks.filter((t) => !t.doneOn)).sort((a, b) => (a.date ?? '9').localeCompare(b.date ?? '9'));
  const done = tasks.filter((t) => t.doneOn).sort((a, b) => b.doneOn!.localeCompare(a.doneOn!));
  const pct = goalProgress(goal, allTasks);
  const left = diffDays(goal.targetDate, today);
  const area = AREAS[goal.area];

  return (
    <div className="page page--narrow">
      <Link to="/hedefler" className="back-link"><ArrowLeft size={16} /> Hedefler</Link>

      <section className="goal-hero">
        <div className="goal-hero__text">
          <span className="chip"><span className="dot" style={{ background: area.color }} />{area.name}</span>
          <h1 className="page-title" data-testid="goal-title">{goal.title}</h1>
          {goal.why && <blockquote className="goal-why">{goal.why}</blockquote>}
          <div className="goal-hero__meta">
            <span>Hedef tarih: <b>{formatDayMonth(goal.targetDate)}</b></span>
            <span>{left >= 0 ? `${left} gün kaldı` : `${-left} gün geçti`}</span>
          </div>
        </div>
        <div className="goal-hero__ribbon">
          <Ribbon value={pct} size={130} fill={area.color} />
          <strong className="num" data-testid="goal-pct">%{Math.round(pct * 100)}</strong>
        </div>
      </section>

      <div className="goal-actions">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setForm({ title: goal.title, why: goal.why, area: goal.area, targetDate: goal.targetDate });
            setEditOpen(true);
          }}
        >
          <Pencil size={14} /> Düzenle
        </Button>
        <Button size="sm" variant="secondary" onClick={() => toggleGoalDone(goal.id)}>
          <Trophy size={14} /> {goal.doneOn ? 'Tamamlanmadı olarak işaretle' : 'Hedefi tamamladım'}
        </Button>
      </div>

      <section className="card">
        <div className="card__head">
          <Label>Kilometre taşları</Label>
          <span className="chip num">{goal.milestones.filter((m) => m.doneOn).length}/{goal.milestones.length}</span>
        </div>
        <ol className="ms-list" data-testid="milestones">
          {goal.milestones.map((m, i) => {
            const count = tasks.filter((t) => t.milestoneId === m.id);
            return (
              <li key={m.id} className={`ms ${m.doneOn ? 'is-done' : ''}`}>
                <TaskCheck done={!!m.doneOn} onToggle={() => toggleMilestone(goal.id, m.id)} label={`${m.title} kilometre taşı`} />
                <div className="ms__body">
                  <div className="ms__title"><span className="ms__num num">{String(i + 1).padStart(2, '0')}</span>{m.title}</div>
                  <small>
                    {m.doneOn ? `${formatDayMonth(m.doneOn)} tamamlandı` : m.dueDate ? `${formatDayMonth(m.dueDate)} hedefi` : 'Tarih yok'}
                    {count.length > 0 && ` · ${count.filter((t) => t.doneOn).length}/${count.length} görev`}
                    {!m.doneOn && ' · +50 puan'}
                  </small>
                </div>
                <IconButton size="sm" label="Kilometre taşını sil" onClick={() => removeMilestone(goal.id, m.id)}>
                  <Trash2 size={14} />
                </IconButton>
              </li>
            );
          })}
        </ol>
        <form
          className="ms-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (!msTitle.trim()) return;
            addMilestone(goal.id, msTitle.trim(), msDate || null);
            setMsTitle('');
            setMsDate('');
          }}
        >
          <input className="input" placeholder="Yeni kilometre taşı" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} aria-label="Yeni kilometre taşı" data-testid="ms-title" />
          <input className="input" type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} aria-label="Kilometre taşı tarihi" />
          <Button type="submit" variant="secondary" disabled={!msTitle.trim()} aria-label="Ekle"><Plus size={17} /></Button>
        </form>
      </section>

      <section>
        <div className="section-head">
          <h2 className="section-title">Açık görevler</h2>
          <button type="button" className="link-more" onClick={() => openNewTask({ date: today, goalId: goal.id })} data-testid="goal-add-task">
            <Plus size={15} /> Görev ekle
          </button>
        </div>
        <div className="task-list">
          {open.slice(0, 14).map((t) => (
            <TaskRow key={t.id} task={t} showDate hideGoal />
          ))}
        </div>
        {open.length === 0 && <div className="card"><EmptyState title="Açık görev yok">Bu hedef için yeni bir adım ekleyebilirsin.</EmptyState></div>}
        {done.length > 0 && (
          <>
            <button type="button" className="link-more" style={{ marginTop: 12 }} onClick={() => setShowDone((v) => !v)}>
              {showDone ? 'Tamamlananları gizle' : `${done.length} tamamlanan görevi göster`}
            </button>
            {showDone && (
              <div className="task-list" style={{ marginTop: 8 }}>
                {done.slice(0, 20).map((t) => <TaskRow key={t.id} task={t} showDate hideGoal />)}
              </div>
            )}
          </>
        )}
      </section>

      <Sheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Hedefi düzenle"
        footer={
          <>
            <Button
              variant="danger"
              onClick={() => {
                deleteGoal(goal.id);
                pushToast({ text: 'Hedef silindi. Görevler hedefsiz olarak kaldı.', tone: 'bilgi' });
                navigate('/hedefler');
              }}
            >
              <Trash2 size={15} /> Sil
            </Button>
            <Button
              onClick={() => {
                updateGoal(goal.id, form);
                setEditOpen(false);
              }}
            >
              Kaydet
            </Button>
          </>
        }
      >
        <Field label="Hedef"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Neden önemli?"><textarea className="input" value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} /></Field>
        <Field label="Alan">
          <select className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value as GoalArea })}>
            {(Object.keys(AREAS) as GoalArea[]).map((a) => <option key={a} value={a}>{AREAS[a].name}</option>)}
          </select>
        </Field>
        <Field label="Hedef tarih"><input className="input" type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></Field>
      </Sheet>
    </div>
  );
}
