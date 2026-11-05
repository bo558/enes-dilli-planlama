import { addDays, diffDays, startOfWeek, weekDays } from './dates';
import { type AppData, type FocusSession, type Goal, type GoalArea, type ISODate, type Task } from './types';

export const isOverdue = (t: Task, today: ISODate) => !t.doneOn && !!t.date && t.date < today;

export const tasksOn = (tasks: Task[], date: ISODate) => tasks.filter((t) => t.date === date);

export const sortTasks = (tasks: Task[]) =>
  [...tasks].sort((a, b) => {
    if (!!a.doneOn !== !!b.doneOn) return a.doneOn ? 1 : -1;
    if (a.isMit !== b.isMit) return a.isMit ? -1 : 1;
    return (a.time ?? '99').localeCompare(b.time ?? '99');
  });

export const dayProgress = (tasks: Task[], date: ISODate) => {
  const list = tasksOn(tasks, date);
  const done = list.filter((t) => t.doneOn).length;
  return { total: list.length, done, pct: list.length ? done / list.length : 0 };
};

export const dayLoad = (tasks: Task[], date: ISODate) =>
  tasksOn(tasks, date)
    .filter((t) => !t.doneOn)
    .reduce((s, t) => s + t.estimateMin, 0);

export const goalProgress = (goal: Goal, tasks: Task[]) => {
  const list = tasks.filter((t) => t.goalId === goal.id);
  const units = list.length + goal.milestones.length * 2;
  if (!units) return 0;
  const done = list.filter((t) => t.doneOn).length + goal.milestones.filter((m) => m.doneOn).length * 2;
  return done / units;
};

export const nextMilestone = (goal: Goal) => goal.milestones.find((m) => !m.doneOn) ?? null;

const activityDates = (data: AppData) => {
  const set = new Set<ISODate>();
  data.tasks.forEach((t) => t.doneOn && set.add(t.doneOn));
  data.sessions.forEach((s) => set.add(s.date));
  return set;
};

export const daysSinceActive = (data: AppData, today: ISODate): number => {
  const dates = [...activityDates(data)].filter((d) => d <= today).sort();
  if (!dates.length) return 0;
  return diffDays(today, dates[dates.length - 1]);
};

export const activeDaysInWeek = (data: AppData, weekStart: ISODate): ISODate[] => {
  const days = new Set(weekDays(weekStart));
  return [...activityDates(data)].filter((d) => days.has(d));
};

export interface PeriodStats {
  from: ISODate;
  to: ISODate;
  planned: number;
  done: number;
  adherence: number;
  focusMin: number;
  sessions: number;
  moved: number;
  activeDays: number;
}

/** asOf verilirse henüz gelmemiş günlerin görevleri plana uyuma sayılmaz. */
export const periodStats = (data: AppData, from: ISODate, to: ISODate, asOf?: ISODate): PeriodStats => {
  const planned = data.tasks.filter((t) => t.date && t.date >= from && t.date <= to && (!asOf || t.date <= asOf));
  // Plana uyum: görev, planlandığı gün veya öncesinde bitmişse sayılır.
  const done = planned.filter((t) => t.doneOn && t.doneOn <= t.date!).length;
  const sessions = data.sessions.filter((s) => s.date >= from && s.date <= to);
  const moved = data.tasks.reduce((sum, t) => sum + t.moves.filter((m) => m.on >= from && m.on <= to).length, 0);
  const active = [...activityDates(data)].filter((d) => d >= from && d <= to).length;
  return {
    from,
    to,
    planned: planned.length,
    done,
    adherence: planned.length ? done / planned.length : 0,
    focusMin: sessions.reduce((s, x) => s + x.actualMin, 0),
    sessions: sessions.length,
    moved,
    activeDays: active,
  };
};

export const dailySeries = (data: AppData, from: ISODate, days: number) =>
  Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const list = tasksOn(data.tasks, date);
    return {
      date,
      planned: list.length,
      done: list.filter((t) => t.doneOn && t.doneOn <= date).length,
      focusMin: data.sessions.filter((s) => s.date === date).reduce((s, x) => s + x.actualMin, 0),
    };
  });

export const weeklyAdherenceSeries = (data: AppData, today: ISODate, weeks: number) => {
  const current = startOfWeek(today);
  return Array.from({ length: weeks }, (_, i) => {
    const from = addDays(current, -7 * (weeks - 1 - i));
    const to = addDays(from, 6);
    const s = periodStats(data, from, to, today);
    return { from, to, adherence: s.adherence, planned: s.planned, done: s.done, focusMin: s.focusMin };
  });
};

export const focusByGoal = (data: AppData, from: ISODate, to: ISODate) => {
  const map = new Map<string, number>();
  data.sessions
    .filter((s) => s.date >= from && s.date <= to)
    .forEach((s) => map.set(s.goalId ?? 'yok', (map.get(s.goalId ?? 'yok') ?? 0) + s.actualMin));
  return [...map.entries()]
    .map(([goalId, minutes]) => {
      const goal = data.goals.find((g) => g.id === goalId);
      return {
        goalId,
        minutes,
        title: goal?.title ?? 'Hedefe bağlı olmayan',
        area: (goal?.area ?? null) as GoalArea | null,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
};

export const focusByTechnique = (data: AppData, from: ISODate, to: ISODate) => {
  const map = new Map<FocusSession['technique'], { minutes: number; count: number; completed: number }>();
  data.sessions
    .filter((s) => s.date >= from && s.date <= to)
    .forEach((s) => {
      const cur = map.get(s.technique) ?? { minutes: 0, count: 0, completed: 0 };
      map.set(s.technique, {
        minutes: cur.minutes + s.actualMin,
        count: cur.count + 1,
        completed: cur.completed + (s.completed ? 1 : 0),
      });
    });
  return [...map.entries()].map(([technique, v]) => ({ technique, ...v })).sort((a, b) => b.minutes - a.minutes);
};

export const HEAT_BANDS = [
  { label: '06–09', from: 6, to: 9 },
  { label: '09–12', from: 9, to: 12 },
  { label: '12–15', from: 12, to: 15 },
  { label: '15–18', from: 15, to: 18 },
  { label: '18–21', from: 18, to: 21 },
  { label: '21–24', from: 21, to: 24 },
];

/** Gün × saat dilimi: tamamlanan görev + odak dakikası (25 dk = 1 birim) */
export const productivityHeatmap = (data: AppData, from: ISODate, to: ISODate) => {
  const grid = HEAT_BANDS.map(() => Array.from({ length: 7 }, () => 0));
  const band = (h: number) => HEAT_BANDS.findIndex((b) => h >= b.from && h < b.to);
  const wd = (iso: ISODate) => (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;
  data.tasks.forEach((t) => {
    if (t.doneOn && t.doneOn >= from && t.doneOn <= to && t.doneHour != null) {
      const b = band(t.doneHour);
      if (b >= 0) grid[b][wd(t.doneOn)] += 1;
    }
  });
  data.sessions.forEach((s) => {
    if (s.date >= from && s.date <= to) {
      const b = band(s.hour);
      if (b >= 0) grid[b][wd(s.date)] += s.actualMin / 25;
    }
  });
  const max = Math.max(1, ...grid.flat());
  let best = { band: 0, day: 0, value: 0 };
  grid.forEach((row, b) => row.forEach((v, d) => { if (v > best.value) best = { band: b, day: d, value: v }; }));
  return { grid, max, best };
};

export const mostMoved = (data: AppData, limit = 5) =>
  data.tasks
    .filter((t) => t.moves.length > 0 && !t.doneOn)
    .sort((a, b) => b.moves.length - a.moves.length)
    .slice(0, limit);

export const moveReasonCounts = (data: AppData, from: ISODate, to: ISODate) => {
  const counts: Record<string, number> = {};
  data.tasks.forEach((t) =>
    t.moves.filter((m) => m.on >= from && m.on <= to).forEach((m) => {
      counts[m.reason] = (counts[m.reason] ?? 0) + 1;
    }),
  );
  return counts;
};

export const estimateAccuracy = (data: AppData, from: ISODate, to: ISODate) => {
  const list = data.tasks.filter((t) => t.doneOn && t.doneOn >= from && t.doneOn <= to && t.actualMin > 0);
  return {
    estimate: list.reduce((s, t) => s + t.estimateMin, 0),
    actual: list.reduce((s, t) => s + t.actualMin, 0),
    count: list.length,
  };
};

export const activeDayMap = (data: AppData) => activityDates(data);
