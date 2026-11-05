import { Check, Scissors, Star, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOVE_REASONS } from '@/domain/catalog';
import { addDays, formatDayMonth, formatDuration, formatWeekday, relativeDay, startOfWeek } from '@/domain/dates';
import { dayLoad, dayProgress, tasksOn } from '@/domain/stats';
import type { ISODate, MoveReason, Task } from '@/domain/types';
import { Button, Field, Sheet, Switch } from '@/design-system/ui';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './tasks.css';

const ESTIMATES = [10, 15, 25, 30, 45, 60, 90];

function TaskFields({
  value,
  onChange,
}: {
  value: Partial<Task>;
  onChange: (p: Partial<Task>) => void;
}) {
  const goals = useApp((s) => s.goals);
  const today = useToday();
  const tasks = useApp((s) => s.tasks);
  const capacity = useApp((s) => s.profile.dailyMinutes);
  const load = value.date ? dayLoad(tasks, value.date) : 0;
  return (
    <>
      <Field label="Görev">
        <input
          className="input"
          value={value.title ?? ''}
          placeholder="Örneğin: Sunumun ilk üç slaytını hazırla"
          onChange={(e) => onChange({ title: e.target.value })}
          data-testid="task-title"
        />
      </Field>
      <Field label="Bağlı olduğu hedef">
        <select className="input" value={value.goalId ?? ''} onChange={(e) => onChange({ goalId: e.target.value || null })}>
          <option value="">Hedefsiz görev</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
      </Field>
      <div className="field-row">
        <Field label="Tarih">
          <input className="input" type="date" value={value.date ?? ''} onChange={(e) => onChange({ date: e.target.value || null })} data-testid="task-date" />
        </Field>
        <Field label="Saat (isteğe bağlı)">
          <input className="input" type="time" value={value.time ?? ''} onChange={(e) => onChange({ time: e.target.value || null })} />
        </Field>
      </div>
      <div className="field">
        <span className="field__label">Tahmini süre</span>
        <div className="est-row">
          {ESTIMATES.map((m) => (
            <button key={m} type="button" className="option-chip" aria-pressed={value.estimateMin === m} onClick={() => onChange({ estimateMin: m })}>
              {formatDuration(m)}
            </button>
          ))}
        </div>
        {value.date && load + (value.estimateMin ?? 0) > capacity && (
          <span className="field__hint" style={{ color: 'var(--warm-ink)' }}>
            {relativeDay(value.date, today)} için plan {formatDuration(load)}. Günlük hedefin {formatDuration(capacity)}; bu görev günü aşırı yükleyebilir.
          </span>
        )}
      </div>
    </>
  );
}

export function NewTaskSheet() {
  const target = useUi((s) => s.newTaskFor);
  const close = useUi((s) => s.openNewTask);
  const addTask = useApp((s) => s.addTask);
  const pushToast = useUi((s) => s.pushToast);
  const today = useToday();
  const [form, setForm] = useState<Partial<Task>>({});

  useEffect(() => {
    if (target) setForm({ title: '', date: target.date ?? today, goalId: target.goalId ?? null, estimateMin: 25, time: target.time ?? null });
  }, [target, today]);

  const save = () => {
    if (!form.title?.trim()) return;
    addTask({ ...form, title: form.title.trim() } as Task);
    pushToast({ text: 'Görev eklendi', tone: 'basari' });
    close(null);
  };

  return (
    <Sheet
      open={!!target}
      onClose={() => close(null)}
      title="Yeni görev"
      footer={
        <>
          <Button variant="secondary" onClick={() => close(null)}>Vazgeç</Button>
          <Button onClick={save} disabled={!form.title?.trim()} data-testid="task-save">Ekle</Button>
        </>
      }
    >
      <TaskFields value={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
    </Sheet>
  );
}

export function TaskSheet() {
  const id = useUi((s) => s.taskSheetId);
  const close = useUi((s) => s.openTask);
  const openReschedule = useUi((s) => s.openReschedule);
  const openSplit = useUi((s) => s.openSplit);
  const task = useApp((s) => s.tasks.find((t) => t.id === id));
  const { updateTask, deleteTask, toggleTask, setMit } = useApp.getState();
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<Task>>({});
  const today = useToday();

  useEffect(() => {
    if (task) setForm(task);
    // Yalnızca açılan görev değiştiğinde formu doldur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = () => {
    if (task && form.title?.trim()) {
      const { date, ...rest } = form;
      updateTask(task.id, rest);
      if (date !== task.date) useApp.getState().moveTask(task.id, date ?? null, 'diger');
    }
    close(null);
  };

  return (
    <Sheet
      open={!!task}
      onClose={() => close(null)}
      title="Görev ayrıntısı"
      subtitle={task?.doneOn ? `${formatDayMonth(task.doneOn)} tarihinde tamamlandı` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={() => task && toggleTask(task.id)}>
            <Check size={16} /> {task?.doneOn ? 'Geri al' : 'Tamamla'}
          </Button>
          <Button onClick={save} data-testid="task-save-edit">Kaydet</Button>
        </>
      }
    >
      <TaskFields value={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
      <Field label="Notlar">
        <textarea className="input" rows={2} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Görevle ilgili kısa not" />
      </Field>
      {task && task.date === today && !task.doneOn && (
        <div className="setting-row">
          <div>
            <div className="setting-row__title">Günün en önemli işi</div>
            <div className="setting-row__desc">Bugünün en üstünde sabit kalır.</div>
          </div>
          <Switch checked={task.isMit} onChange={() => setMit(task.id)} label="Günün en önemli işi" />
        </div>
      )}
      {task && task.moves.length > 0 && (
        <div>
          <span className="field__label">Taşıma geçmişi</span>
          <ul style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)', display: 'grid', gap: 3 }}>
            {task.moves.map((m, i) => (
              <li key={i}>{m.from ? formatDayMonth(m.from) : 'Tarihsiz'} → {m.to ? formatDayMonth(m.to) : 'Tarihsiz'} · {MOVE_REASONS[m.reason]}</li>
            ))}
          </ul>
        </div>
      )}
      {task && !task.doneOn && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Button variant="secondary" onClick={() => openReschedule(task.id)}>Ertele</Button>
          <Button variant="secondary" onClick={() => openSplit(task.id)}><Scissors size={15} /> Parçala</Button>
          <Button variant="secondary" onClick={() => { close(null); navigate(`/odak?gorev=${task.id}`); }} style={{ gridColumn: '1 / -1' }}>
            <Star size={15} /> Bu görev için odak başlat
          </Button>
        </div>
      )}
      {task && (
        <Button variant="danger" onClick={() => { deleteTask(task.id); close(null); }} data-testid="task-delete">
          <Trash2 size={15} /> Görevi sil
        </Button>
      )}
    </Sheet>
  );
}

export function RescheduleSheet() {
  const id = useUi((s) => s.rescheduleId);
  const close = useUi((s) => s.openReschedule);
  const openSplit = useUi((s) => s.openSplit);
  const pushToast = useUi((s) => s.pushToast);
  const task = useApp((s) => s.tasks.find((t) => t.id === id));
  const tasks = useApp((s) => s.tasks);
  const capacity = useApp((s) => s.profile.dailyMinutes);
  const moveTask = useApp((s) => s.moveTask);
  const today = useToday();
  const [date, setDate] = useState<ISODate | null>(null);
  const [reason, setReason] = useState<MoveReason>('zaman');

  useEffect(() => {
    if (id) {
      setDate(addDays(today, 1));
      setReason('zaman');
    }
  }, [id, today]);

  const nextMon = addDays(startOfWeek(today), 7);
  const weekend = addDays(startOfWeek(today), 5);
  const options: { label: string; date: ISODate }[] = [
    { label: 'Yarın', date: addDays(today, 1) },
    { label: 'Öbür gün', date: addDays(today, 2) },
    ...(weekend > today ? [{ label: 'Hafta sonu', date: weekend }] : []),
    { label: 'Gelecek hafta', date: nextMon },
  ];

  const save = () => {
    if (!task) return;
    moveTask(task.id, date, reason);
    pushToast({
      text: date ? `Görev ${relativeDay(date, today).toLocaleLowerCase('tr')} tarihine taşındı` : 'Görev tarihsiz listeye alındı',
      tone: 'basari',
    });
    close(null);
  };

  return (
    <Sheet
      open={!!task}
      onClose={() => close(null)}
      title="Yeni tarih seç"
      subtitle={task?.title}
      footer={
        <>
          <Button variant="secondary" onClick={() => close(null)}>Vazgeç</Button>
          <Button onClick={save} data-testid="reschedule-save">Taşı</Button>
        </>
      }
    >
      {task && task.moves.length >= 1 && (
        <div className="coach-hint">
          <div className="coach-hint__body">
            <span>
              <strong>Bu görev {task.moves.length} kez taşındı.</strong> Çoğu zaman bu, görevin büyük olduğunu gösterir. Parçalara bölmek ister misin?
            </span>
            <Button size="sm" variant="secondary" onClick={() => openSplit(task.id)} data-testid="reschedule-split">
              <Scissors size={14} /> Parçalara böl
            </Button>
          </div>
        </div>
      )}
      <div className="date-options">
        {options.map((o) => {
          const load = dayLoad(tasks, o.date);
          return (
            <button key={o.label} type="button" className="date-option" aria-pressed={date === o.date} onClick={() => setDate(o.date)} data-testid={`date-${o.label}`}>
              <strong>{o.label}</strong>
              <small>
                {formatDayMonth(o.date)} · {load > capacity ? <span style={{ color: 'var(--bad)' }}>yoğun</span> : formatDuration(load)}
              </small>
            </button>
          );
        })}
      </div>
      <div className="field-row">
        <Field label="Başka bir tarih">
          <input className="input" type="date" value={date ?? ''} min={today} onChange={(e) => setDate(e.target.value || null)} />
        </Field>
        <div className="field">
          <span className="field__label">Veya</span>
          <button type="button" className="option-chip" aria-pressed={date === null} onClick={() => setDate(null)} style={{ minHeight: 46 }}>
            Tarihsiz listeye al
          </button>
        </div>
      </div>
      <div className="field">
        <span className="field__label">Neden taşıyorsun? <span style={{ color: 'var(--faint)', fontWeight: 600 }}>(raporlarda kalıp görmek için)</span></span>
        <div className="option-row">
          {(Object.keys(MOVE_REASONS) as MoveReason[]).map((r) => (
            <button key={r} type="button" className="option-chip" aria-pressed={reason === r} onClick={() => setReason(r)}>
              {MOVE_REASONS[r]}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

export function SplitSheet() {
  const id = useUi((s) => s.splitId);
  const close = useUi((s) => s.openSplit);
  const pushToast = useUi((s) => s.pushToast);
  const task = useApp((s) => s.tasks.find((t) => t.id === id));
  const splitTask = useApp((s) => s.splitTask);
  const [parts, setParts] = useState<string[]>([]);

  useEffect(() => {
    if (id) setParts(['10 dakikalık kaba taslak çıkar', 'Ana kısmı tamamla', 'Gözden geçir ve bitir']);
  }, [id]);

  return (
    <Sheet
      open={!!task}
      onClose={() => close(null)}
      title="Görevi parçala"
      subtitle={task?.title}
      footer={
        <>
          <Button variant="secondary" onClick={() => setParts((p) => [...p, ''])}>Parça ekle</Button>
          <Button
            data-testid="split-save"
            onClick={() => {
              if (!task) return;
              splitTask(task.id, parts.map((p) => p.trim()).filter(Boolean));
              pushToast({ text: 'Görev parçalandı ve günlere yayıldı', tone: 'basari' });
              close(null);
            }}
          >
            Parçala
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>
        Öneriler örnek metindir. Parçalar bugünden başlayarak ardışık günlere dağıtılır.
      </p>
      {parts.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="label label--plain num" style={{ width: 24 }}>{String(i + 1).padStart(2, '0')}</span>
          <input className="input" value={p} aria-label={`Parça ${i + 1}`} onChange={(e) => setParts((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Parçayı kaldır" onClick={() => setParts((arr) => arr.filter((_, j) => j !== i))}>
            <X size={15} />
          </button>
        </div>
      ))}
    </Sheet>
  );
}

const MOODS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: 'Zor geçti' },
  { value: 2, label: 'İdare eder' },
  { value: 3, label: 'İyi geçti' },
];

export function ClosingSheet() {
  const open = useUi((s) => s.closingOpen);
  const setOpen = useUi((s) => s.setClosingOpen);
  const openReschedule = useUi((s) => s.openReschedule);
  const pushToast = useUi((s) => s.pushToast);
  const { tasks, closeDay, moveTask, toggleTask } = useApp();
  const today = useToday();
  const [mood, setMood] = useState<1 | 2 | 3>(2);
  const [note, setNote] = useState('');
  const open_ = tasksOn(tasks, today).filter((t) => !t.doneOn);
  const progress = dayProgress(tasks, today);

  return (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      title="Akşam kapanışı"
      subtitle={`${formatWeekday(today)} · ${progress.done}/${progress.total} görev`}
      footer={
        <Button
          data-testid="closing-save"
          onClick={() => {
            closeDay({ mood, note });
            setOpen(false);
            pushToast({ text: 'Gün kapatıldı. Yarın görüşürüz.', tone: 'basari' });
          }}
        >
          Günü kapat
        </Button>
      }
    >
      <div>
        <span className="field__label">Kalan görevler</span>
        {open_.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>Bugün için açık görev kalmadı.</p>
        ) : (
          <div style={{ marginTop: 4 }}>
            {open_.map((t) => (
              <div key={t.id} className="closing-item">
                <span>{t.title}</span>
                <span className="closing-item__btns">
                  <Button size="sm" variant="secondary" onClick={() => toggleTask(t.id)}>Yaptım</Button>
                  <Button size="sm" variant="secondary" onClick={() => moveTask(t.id, addDays(today, 1), 'zaman')}>Yarın</Button>
                  <Button size="sm" variant="ghost" onClick={() => openReschedule(t.id)}>Tarih</Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="field">
        <span className="field__label">Bugün nasıldı?</span>
        <div className="mood-row">
          {MOODS.map((m) => (
            <button key={m.value} type="button" className="option-chip" style={{ justifyContent: 'center' }} aria-pressed={mood === m.value} onClick={() => setMood(m.value)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <Field label="Yarına not (isteğe bağlı)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Yarın neyi farklı yapacaksın?" />
      </Field>
    </Sheet>
  );
}
