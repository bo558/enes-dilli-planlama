import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, PlanTabs } from '@/app/AppShell';
import { addDays, formatFull, relativeDay } from '@/domain/dates';
import { isOverdue, sortTasks } from '@/domain/stats';
import type { Task } from '@/domain/types';
import { Button, EmptyState } from '@/design-system/ui';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import { TaskRow } from './TaskRow';
import './tasks.css';

type Filter = 'bugun' | 'yaklasan' | 'kacan' | 'tarihsiz' | 'tamamlanan';

export function TasksPage() {
  const [params, setParams] = useSearchParams();
  const tasks = useApp((s) => s.tasks);
  const moveTask = useApp((s) => s.moveTask);
  const today = useToday();
  const openNewTask = useUi((s) => s.openNewTask);
  const pushToast = useUi((s) => s.pushToast);
  const [goalFilter, setGoalFilter] = useState('');
  const goals = useApp((s) => s.goals);

  const lists = useMemo(() => {
    const scoped = goalFilter ? tasks.filter((t) => t.goalId === goalFilter) : tasks;
    return {
      bugun: sortTasks(scoped.filter((t) => t.date === today)),
      yaklasan: scoped.filter((t) => !t.doneOn && t.date && t.date > today).sort((a, b) => a.date!.localeCompare(b.date!)),
      kacan: scoped.filter((t) => isOverdue(t, today)).sort((a, b) => a.date!.localeCompare(b.date!)),
      tarihsiz: scoped.filter((t) => !t.date && !t.doneOn),
      tamamlanan: scoped
        .filter((t) => t.doneOn)
        .sort((a, b) => b.doneOn!.localeCompare(a.doneOn!))
        .slice(0, 40),
    };
  }, [tasks, today, goalFilter]);

  const filter = (params.get('f') as Filter) || (lists.kacan.length ? 'kacan' : 'bugun');
  const setFilter = (f: Filter) => setParams({ f }, { replace: true });

  const FILTERS: { id: Filter; label: string; count?: number }[] = [
    { id: 'kacan', label: 'Kaçan', count: lists.kacan.length },
    { id: 'bugun', label: 'Bugün', count: lists.bugun.filter((t) => !t.doneOn).length },
    { id: 'yaklasan', label: 'Yaklaşan', count: lists.yaklasan.length },
    { id: 'tarihsiz', label: 'Tarihsiz', count: lists.tarihsiz.length },
    { id: 'tamamlanan', label: 'Tamamlanan' },
  ];

  const list = lists[filter];

  const grouped = useMemo(() => {
    if (filter !== 'yaklasan') return null;
    const map = new Map<string, Task[]>();
    list.forEach((t) => map.set(t.date!, [...(map.get(t.date!) ?? []), t]));
    return [...map.entries()];
  }, [filter, list]);

  return (
    <div className="page page--narrow">
      <PlanTabs />
      <PageHeader
        eyebrow="Görev takibi"
        title={lists.kacan.length ? <><em>{lists.kacan.length} görev</em> yeni tarih bekliyor</> : <>Görevlerin <em>yolunda</em></>}
        actions={
          <Button onClick={() => openNewTask({ date: today })} data-testid="task-new">
            <Plus size={17} /> Görev ekle
          </Button>
        }
      />

      <div className="filter-row" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="option-chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} data-testid={`filter-${f.id}`}>
            {f.label}
            {f.count != null && <span className="filter-count num">{f.count}</span>}
          </button>
        ))}
        <select className="input" aria-label="Hedefe göre süz" style={{ width: 'auto', minHeight: 40, flexShrink: 0, fontSize: 13.5, paddingBlock: 6 }} value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)}>
          <option value="">Tüm hedefler</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.title.slice(0, 34)}</option>
          ))}
        </select>
      </div>

      {filter === 'kacan' && lists.kacan.length > 1 && (
        <div className="bulk-bar">
          <span>Hepsini tek seferde planla. Cezası yok, yeni tarih verdiğin için puan kazanırsın.</span>
          <Button
            size="sm"
            variant="dark"
            data-testid="bulk-move"
            onClick={() => {
              lists.kacan.forEach((t) => moveTask(t.id, addDays(today, 1), 'zaman'));
              pushToast({ text: `${lists.kacan.length} görev yarına taşındı`, tone: 'basari' });
            }}
          >
            Hepsini yarına taşı
          </Button>
        </div>
      )}

      {grouped ? (
        grouped.map(([date, items]) => (
          <section key={date} className="task-list">
            <div className="group-title">
              {relativeDay(date, today)} <small>{formatFull(date)}</small>
            </div>
            {items.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </section>
        ))
      ) : (
        <div className="task-list">
          {list.map((t) => (
            <TaskRow key={t.id} task={t} showDate={filter === 'tamamlanan'} />
          ))}
        </div>
      )}

      {list.length === 0 && (
        <EmptyState
          title={filter === 'kacan' ? 'Kaçan görev yok' : 'Burada görev yok'}
          action={<Button variant="secondary" onClick={() => openNewTask({ date: today })}>Görev ekle</Button>}
        >
          {filter === 'kacan' ? 'Planın güncel. Böyle devam.' : 'Yeni bir görev ekleyerek başlayabilirsin.'}
        </EmptyState>
      )}
    </div>
  );
}
