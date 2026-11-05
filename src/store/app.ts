import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildDemoData, DATA_VERSION, defaultLifeReminders, emptyData } from '@/data/seed';
import { addDays, realToday, startOfWeek } from '@/domain/dates';
import { allowedXp, focusXp, levelFor, stageFor, XP_RULES } from '@/domain/gamification';
import {
  buildNotification,
  evaluateNotification,
  type Evaluation,
} from '@/domain/notifications';
import { isOverdue } from '@/domain/stats';
import type {
  ActiveFocus,
  AppData,
  ChatMessage,
  CoachCard,
  DayClosing,
  Goal,
  GoalArea,
  ISODate,
  MoveReason,
  NotificationAction,
  NotificationCategory,
  NotificationPrefs,
  PetSpecies,
  Profile,
  Reminder,
  Task,
  TechniqueId,
  XpType,
} from '@/domain/types';
import { coachService, FREE_COACH_LIMIT } from '@/services';
import { safeStorage } from '@/services/storage';
import { useUi } from './ui';

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const focusElapsedSec = (f: ActiveFocus, now = Date.now()) =>
  f.elapsedBeforeSec + (f.startedAt ? (now - f.startedAt) / 1000 : 0);

export interface NewGoalInput {
  title: string;
  why: string;
  area: GoalArea;
  targetDate: ISODate;
  milestones: { title: string; dueDate: ISODate | null }[];
  tasks: { title: string; date: ISODate | null; estimateMin: number; milestoneIndex?: number }[];
}

export interface OnboardingInput {
  profile: Partial<Profile>;
  consents: AppData['consents'];
  goal: NewGoalInput;
  species: PetSpecies;
  petName: string;
  permission: NotificationPrefs['permission'];
  firstTaskTitle: string;
}

interface Actions {
  today: () => ISODate;
  setTheme: (t: AppData['theme']) => void;

  loadDemo: () => void;
  resetAll: () => void;
  completeOnboarding: (input: OnboardingInput) => void;

  updateProfile: (p: Partial<Profile>) => void;
  setConsents: (c: Partial<AppData['consents']>) => void;

  addGoal: (g: NewGoalInput) => string;
  updateGoal: (id: string, p: Partial<Pick<Goal, 'title' | 'why' | 'area' | 'targetDate'>>) => void;
  deleteGoal: (id: string) => void;
  toggleGoalDone: (id: string) => void;
  addMilestone: (goalId: string, title: string, dueDate: ISODate | null) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  removeMilestone: (goalId: string, milestoneId: string) => void;

  addTask: (t: Partial<Task> & { title: string }) => string;
  updateTask: (id: string, p: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  moveTask: (id: string, to: ISODate | null, reason?: MoveReason, opts?: { silent?: boolean }) => void;
  setMit: (id: string | null, date?: ISODate) => void;
  splitTask: (id: string, parts: string[]) => void;

  award: (type: XpType, requested: number, label: string, refId: string | null) => number;

  startFocus: (technique: TechniqueId, taskId: string | null, focusMin: number, breakMin: number) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  completeFocusPhase: () => void;
  finishFocusEarly: () => void;
  cancelFocus: () => void;
  skipBreak: () => void;
  startNextCycle: () => void;
  fastForwardFocus: () => void;

  setPetName: (name: string) => void;
  setPetSpecies: (s: PetSpecies) => void;
  togglePlainMode: () => void;
  toggleEquip: (id: string) => void;
  setBackdrop: (id: string) => void;

  addReminder: (r: Omit<Reminder, 'id'>) => void;
  updateReminder: (id: string, p: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  setPrefs: (p: Partial<NotificationPrefs>) => void;
  setCategory: (c: NotificationCategory, on: boolean) => void;
  triggerNotification: (category: NotificationCategory, opts?: { taskId?: string; ignoreQuiet?: boolean }) => Evaluation;
  actOnNotification: (id: string, action: NotificationAction) => NotificationAction;
  markAllRead: () => void;

  sendCoachMessage: (text: string) => Promise<void>;
  applyCoachCard: (messageId: string) => void;
  clearChat: () => void;
  removeMemory: (id: string) => void;
  addMemory: (text: string) => void;

  closeDay: (c: DayClosing) => void;
  completeWeeklyReview: (focusNote: string) => void;

  setSubscription: (s: Partial<AppData['subscription']>) => void;

  demoAdvanceDay: () => void;
  demoAddXp: (n: number) => void;
}

export type AppStore = AppData & Actions;

const dataOnly = (s: AppStore): AppData => {
  const d: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) if (typeof v !== 'function') d[k] = v;
  return d as unknown as AppData;
};

export const useApp = create<AppStore>()(
  persist(
    (set, get) => ({
      ...emptyData(realToday()),

      today: () => addDays(realToday(), get().dayOffset),
      setTheme: (theme) => set({ theme }),

      loadDemo: () => set({ ...buildDemoData(realToday()) }),
      resetAll: () => {
        useUi.setState({ banner: null, focusSummary: null, focusExpanded: false });
        set({ ...emptyData(realToday()) });
      },

      completeOnboarding: (input) => {
        const today = realToday();
        set({
          ...emptyData(today),
          onboarded: true,
          consents: input.consents,
          theme: get().theme,
          profile: { ...emptyData(today).profile, ...input.profile, joinedOn: today },
          prefs: { ...emptyData(today).prefs, permission: input.permission },
          pet: { species: input.species, name: input.petName, xp: 0, equipped: [], backdrop: 'taslak', plainMode: false },
          reminders: defaultLifeReminders(),
        });
        get().addGoal(input.goal);
        const firstId = get().addTask({ title: input.firstTaskTitle, date: today, estimateMin: 2, isMit: false });
        get().toggleTask(firstId);
        set((s) => ({
          messages: [
            {
              id: uid('m'),
              role: 'koc',
              text: `Merhaba ${input.profile.name ?? ''}. Planın hazır. Takıldığında buradan yazabilirsin.`.replace(' .', '.'),
              source: 'sistem',
              quickReplies: ['Bugün ne yapmalıyım?', 'Bu hafta çok yüklüyüm'],
              createdAt: Date.now(),
            },
            ...s.messages,
          ],
        }));
      },

      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setConsents: (c) => set((s) => ({ consents: { ...s.consents, ...c } })),

      addGoal: (g) => {
        const today = get().today();
        const id = uid('g');
        const milestones = g.milestones.map((m) => ({ id: uid('m'), title: m.title, dueDate: m.dueDate, doneOn: null }));
        const goal: Goal = {
          id,
          title: g.title,
          why: g.why,
          area: g.area,
          targetDate: g.targetDate,
          createdOn: today,
          milestones,
          doneOn: null,
        };
        const tasks: Task[] = g.tasks.map((t) => ({
          id: uid('t'),
          title: t.title,
          goalId: id,
          milestoneId: t.milestoneIndex != null ? (milestones[t.milestoneIndex]?.id ?? null) : null,
          date: t.date,
          time: null,
          estimateMin: t.estimateMin,
          isMit: false,
          doneOn: null,
          doneHour: null,
          actualMin: 0,
          moves: [],
          notes: '',
          createdOn: today,
        }));
        set((s) => ({ goals: [goal, ...s.goals], tasks: [...tasks, ...s.tasks] }));
        return id;
      },
      updateGoal: (id, p) => set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...p } : g)) })),
      deleteGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          tasks: s.tasks.map((t) => (t.goalId === id ? { ...t, goalId: null, milestoneId: null } : t)),
        })),
      toggleGoalDone: (id) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, doneOn: g.doneOn ? null : get().today() } : g)),
        })),
      addMilestone: (goalId, title, dueDate) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, milestones: [...g.milestones, { id: uid('m'), title, dueDate, doneOn: null }] }
              : g,
          ),
        })),
      toggleMilestone: (goalId, milestoneId) => {
        const goal = get().goals.find((g) => g.id === goalId);
        const m = goal?.milestones.find((x) => x.id === milestoneId);
        if (!goal || !m) return;
        const doneOn = m.doneOn ? null : get().today();
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, milestones: g.milestones.map((x) => (x.id === milestoneId ? { ...x, doneOn } : x)) }
              : g,
          ),
        }));
        if (doneOn) get().award('kilometre', XP_RULES.kilometre.amount, m.title, m.id);
      },
      removeMilestone: (goalId, milestoneId) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId ? { ...g, milestones: g.milestones.filter((x) => x.id !== milestoneId) } : g,
          ),
          tasks: s.tasks.map((t) => (t.milestoneId === milestoneId ? { ...t, milestoneId: null } : t)),
        })),

      addTask: (t) => {
        const id = uid('t');
        const today = get().today();
        const task: Task = {
          id,
          goalId: null,
          milestoneId: null,
          date: today,
          time: null,
          estimateMin: 25,
          isMit: false,
          doneOn: null,
          doneHour: null,
          actualMin: 0,
          moves: [],
          notes: '',
          createdOn: today,
          ...t,
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return id;
      },
      updateTask: (id, p) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      toggleTask: (id) => {
        const today = get().today();
        const t = get().tasks.find((x) => x.id === id);
        if (!t) return;
        const ui = useUi.getState();
        if (t.doneOn) {
          const event = get().xpEvents.find((e) => e.type === 'gorev' && e.refId === id);
          set((s) => ({
            tasks: s.tasks.map((x) => (x.id === id ? { ...x, doneOn: null, doneHour: null } : x)),
            xpEvents: event ? s.xpEvents.filter((e) => e !== event) : s.xpEvents,
            pet: event ? { ...s.pet, xp: Math.max(0, s.pet.xp - event.amount) } : s.pet,
          }));
          return;
        }
        const wasOverdue = isOverdue(t, today);
        set((s) => ({
          tasks: s.tasks.map((x) =>
            x.id === id
              ? {
                  ...x,
                  doneOn: today,
                  doneHour: new Date().getHours(),
                  actualMin: x.actualMin || x.estimateMin,
                  // Geç tamamlanan görev bugüne yazılır; takvim ve rapor tutarlı kalır.
                  date: wasOverdue || !x.date ? today : x.date,
                }
              : x,
          ),
        }));
        const granted = get().award('gorev', XP_RULES.gorev.amount, t.title, t.id);
        if (granted === 0) {
          ui.pushToast({ text: 'Görev tamamlandı. Bugünkü görev puanı sınırına ulaştın.', tone: 'bilgi' });
        }
        ui.pulsePet();
      },

      moveTask: (id, to, reason = 'diger', opts) => {
        const today = get().today();
        const t = get().tasks.find((x) => x.id === id);
        if (!t || t.date === to) return;
        const wasOverdue = isOverdue(t, today);
        set((s) => ({
          tasks: s.tasks.map((x) =>
            x.id === id
              ? {
                  ...x,
                  date: to,
                  isMit: false,
                  moves: opts?.silent ? x.moves : [...x.moves, { from: x.date, to, reason, on: today }],
                }
              : x,
          ),
        }));
        if (wasOverdue && to) get().award('yeniden-plan', XP_RULES.yenidenPlan.amount, `Yeni tarih: ${t.title}`, t.id);
      },

      setMit: (id, date) => {
        const target = date ?? get().today();
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.date === target ? { ...t, isMit: id !== null && t.id === id ? !t.isMit : false } : t,
          ),
        }));
      },

      splitTask: (id, parts) => {
        const original = get().tasks.find((t) => t.id === id);
        if (!original) return;
        const today = get().today();
        const perPart = Math.max(10, Math.round(original.estimateMin / parts.length));
        const newTasks: Task[] = parts.map((title, i) => ({
          ...original,
          id: uid('t'),
          title: i === 0 ? `${original.title}: ${title}` : title,
          date: addDays(today, i),
          estimateMin: perPart,
          moves: [],
          isMit: false,
          doneOn: null,
          doneHour: null,
          actualMin: 0,
          createdOn: today,
        }));
        set((s) => ({ tasks: [...newTasks, ...s.tasks.filter((t) => t.id !== id)] }));
      },

      award: (type, requested, label, refId) => {
        const s = get();
        const date = s.today();
        const amount = allowedXp(s.xpEvents, type, requested, date, refId);
        if (amount <= 0) return 0;
        const before = s.pet.xp;
        const after = before + amount;
        set((st) => ({
          pet: { ...st.pet, xp: after },
          xpEvents: [{ id: uid('xp'), type, amount, date, label, refId }, ...st.xpEvents],
        }));
        const ui = useUi.getState();
        ui.pushToast({ text: `+${amount} puan`, tone: 'xp' });
        ui.pulsePet();
        const stageBefore = stageFor(before);
        const stageAfter = stageFor(after);
        if (stageBefore.id !== stageAfter.id) ui.setStageUp(stageAfter.id);
        else if (levelFor(after) > levelFor(before)) {
          ui.pushToast({ text: `${s.pet.name || 'Yoldaşın'} ${levelFor(after)}. seviyeye geçti`, tone: 'basari' });
        }
        return amount;
      },

      startFocus: (technique, taskId, focusMin, breakMin) =>
        set({
          focus: {
            technique,
            taskId,
            phase: 'odak',
            plannedSec: focusMin * 60,
            elapsedBeforeSec: 0,
            startedAt: Date.now(),
            cycle: 1,
            focusMin,
            breakMin,
          },
        }),
      pauseFocus: () =>
        set((s) =>
          s.focus?.startedAt
            ? { focus: { ...s.focus, elapsedBeforeSec: focusElapsedSec(s.focus), startedAt: null } }
            : s,
        ),
      resumeFocus: () =>
        set((s) => (s.focus && !s.focus.startedAt ? { focus: { ...s.focus, startedAt: Date.now() } } : s)),

      completeFocusPhase: () => {
        const f = get().focus;
        if (!f) return;
        const ui = useUi.getState();
        if (f.phase === 'mola') {
          set({ focus: { ...f, startedAt: null, elapsedBeforeSec: f.plannedSec } });
          ui.pushToast({ text: 'Mola bitti. Hazır olduğunda devam et.', tone: 'bilgi' });
          return;
        }
        const minutes = Math.round(focusElapsedSec(f) / 60);
        const xp = recordSession(f, Math.max(minutes, Math.round(f.plannedSec / 60)), true);
        if (f.breakMin > 0) {
          set({
            focus: { ...f, phase: 'mola', plannedSec: f.breakMin * 60, elapsedBeforeSec: 0, startedAt: Date.now() },
          });
        } else {
          set({ focus: null });
          ui.setFocusExpanded(false);
        }
        ui.setFocusSummary({ minutes: Math.max(minutes, Math.round(f.plannedSec / 60)), xp, taskId: f.taskId, completed: true });
      },

      finishFocusEarly: () => {
        const f = get().focus;
        if (!f) return;
        const ui = useUi.getState();
        const minutes = Math.round(focusElapsedSec(f) / 60);
        if (f.phase === 'odak' && minutes >= 1) {
          const xp = recordSession(f, minutes, f.plannedSec === 0);
          ui.setFocusSummary({ minutes, xp, taskId: f.taskId, completed: f.plannedSec === 0 });
        } else if (f.phase === 'odak') {
          ui.pushToast({ text: 'Bir dakikadan kısa oturumlar kaydedilmez.', tone: 'bilgi' });
        }
        set({ focus: null });
        ui.setFocusExpanded(false);
      },
      cancelFocus: () => {
        set({ focus: null });
        useUi.getState().setFocusExpanded(false);
      },
      skipBreak: () => {
        const f = get().focus;
        if (f?.phase === 'mola') set({ focus: { ...f, elapsedBeforeSec: f.plannedSec, startedAt: null } });
      },
      startNextCycle: () => {
        const f = get().focus;
        if (!f) return;
        set({
          focus: {
            ...f,
            phase: 'odak',
            plannedSec: f.focusMin * 60,
            elapsedBeforeSec: 0,
            startedAt: Date.now(),
            cycle: f.cycle + 1,
          },
        });
      },
      fastForwardFocus: () => {
        const f = get().focus;
        if (!f) return;
        const planned = f.plannedSec || 25 * 60;
        set({ focus: { ...f, elapsedBeforeSec: Math.max(planned - 3, 0), startedAt: Date.now() } });
      },

      setPetName: (name) => set((s) => ({ pet: { ...s.pet, name } })),
      setPetSpecies: (species) => set((s) => ({ pet: { ...s.pet, species } })),
      togglePlainMode: () => set((s) => ({ pet: { ...s.pet, plainMode: !s.pet.plainMode } })),
      toggleEquip: (id) =>
        set((s) => ({
          pet: {
            ...s.pet,
            equipped: s.pet.equipped.includes(id) ? s.pet.equipped.filter((x) => x !== id) : [...s.pet.equipped, id],
          },
        })),
      setBackdrop: (backdrop) => set((s) => ({ pet: { ...s.pet, backdrop } })),

      addReminder: (r) => set((s) => ({ reminders: [{ ...r, id: uid('r') }, ...s.reminders] })),
      updateReminder: (id, p) =>
        set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...p } : r)) })),
      deleteReminder: (id) => set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),
      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
      setCategory: (c, on) =>
        set((s) => ({ prefs: { ...s.prefs, categories: { ...s.prefs.categories, [c]: on } } })),

      triggerNotification: (category, opts) => {
        const s = get();
        const today = s.today();
        const now = new Date();
        const evaluation = evaluateNotification(dataOnly(s), category, today, now.getHours() * 60 + now.getMinutes(), opts);
        if (evaluation.passed) {
          const n = buildNotification(dataOnly(s), evaluation, category, today, uid('n'));
          if (n) {
            set((st) => ({ notifications: [n, ...st.notifications] }));
            useUi.getState().setBanner(n);
          }
        }
        return evaluation;
      },
      actOnNotification: (id, action) => {
        const s = get();
        const n = s.notifications.find((x) => x.id === id);
        set((st) => ({
          notifications: st.notifications.map((x) => (x.id === id ? { ...x, read: true, outcome: action } : x)),
        }));
        const ui = useUi.getState();
        ui.setBanner(null);
        if (n?.taskId) {
          const task = s.tasks.find((t) => t.id === n.taskId);
          if (action === 'yaptim' && task && !task.doneOn) s.toggleTask(n.taskId);
          if (action === 'yarina' && task) {
            s.moveTask(n.taskId, addDays(s.today(), 1), 'zaman');
            ui.pushToast({ text: 'Görev yarına taşındı.', tone: 'basari' });
          }
          if (action === 'tarih-sec') ui.openReschedule(n.taskId);
        } else if (action === 'yaptim') {
          ui.pushToast({ text: 'Harika, not edildi.', tone: 'basari' });
        }
        return action;
      },
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      sendCoachMessage: async (text) => {
        const clean = text.trim();
        if (!clean) return;
        const s = get();
        const ui = useUi.getState();
        const user: ChatMessage = { id: uid('m'), role: 'kullanici', text: clean, createdAt: Date.now() };
        set((st) => ({ messages: [...st.messages, user] }));

        if (s.subscription.status === 'ucretsiz' && s.coachUsedThisMonth >= FREE_COACH_LIMIT) {
          set((st) => ({
            messages: [
              ...st.messages,
              {
                id: uid('m'),
                role: 'koc',
                text: `Bu ayki ${FREE_COACH_LIMIT} ücretsiz koç mesajını kullandın. Premium ile devam edebilir ya da gelecek ayı bekleyebilirsin. (Örnek kota, karara bağlı.)`,
                source: 'sistem',
                createdAt: Date.now(),
              },
            ],
          }));
          return;
        }

        ui.setCoachTyping(true);
        try {
          const result = await coachService.respond(clean, { data: dataOnly(get()), today: get().today() });
          const replies: ChatMessage[] = result.replies.map((r) => ({
            id: uid('m'),
            role: 'koc',
            text: r.text,
            source: r.source,
            card: r.card,
            quickReplies: r.quickReplies,
            createdAt: Date.now(),
          }));
          set((st) => ({
            messages: [...st.messages, ...replies],
            coachFlow: result.flow,
            coachUsedThisMonth: st.coachUsedThisMonth + 1,
            coachMemory: result.memory
              ? [{ id: uid('cm'), text: result.memory, addedOn: st.today() }, ...st.coachMemory]
              : st.coachMemory,
          }));
        } finally {
          ui.setCoachTyping(false);
        }
      },

      applyCoachCard: (messageId) => {
        const s = get();
        const msg = s.messages.find((m) => m.id === messageId);
        const card = msg?.card;
        if (!card) return;
        const today = s.today();
        const ui = useUi.getState();
        const mark = (next: CoachCard) =>
          set((st) => ({ messages: st.messages.map((m) => (m.id === messageId ? { ...m, card: next } : m)) }));

        if (card.kind === 'hedef-onerisi' && !card.applied) {
          const weekDays = card.goal.weeks * 7;
          s.addGoal({
            title: card.goal.title,
            why: card.goal.why,
            area: card.goal.area,
            targetDate: addDays(today, weekDays),
            milestones: card.milestones.map((title, i) => ({
              title,
              dueDate: addDays(today, Math.round((weekDays / card.milestones.length) * (i + 1))),
            })),
            tasks: card.tasks.map((title, i) => ({ title, date: addDays(today, i + 1), estimateMin: 25 })),
          });
          mark({ ...card, applied: true });
          ui.pushToast({ text: 'Hedef ve görevler planına eklendi.', tone: 'basari' });
        }
        if (card.kind === 'tasima-onerisi' && !card.applied) {
          card.moves.forEach((m) => s.moveTask(m.taskId, m.to, 'zaman'));
          mark({ ...card, applied: true });
          ui.pushToast({ text: `${card.moves.length} görev taşındı. Takvim güncellendi.`, tone: 'basari' });
        }
        if (card.kind === 'bolme-onerisi' && !card.applied) {
          s.splitTask(card.taskId, card.parts);
          mark({ ...card, applied: true });
          ui.pushToast({ text: 'Görev üç parçaya bölündü.', tone: 'basari' });
        }
      },

      clearChat: () => set({ messages: [], coachFlow: null }),
      removeMemory: (id) => set((s) => ({ coachMemory: s.coachMemory.filter((m) => m.id !== id) })),
      addMemory: (text) =>
        set((s) => ({ coachMemory: [{ id: uid('cm'), text, addedOn: s.today() }, ...s.coachMemory] })),

      closeDay: (c) => {
        const today = get().today();
        set((s) => ({ closings: { ...s.closings, [today]: c } }));
        get().award('kapanis', XP_RULES.kapanis.amount, 'Akşam kapanışı', today);
      },
      completeWeeklyReview: (focusNote) => {
        const week = startOfWeek(get().today());
        set((s) => ({ weeklyReviews: { ...s.weeklyReviews, [week]: { focusNote } } }));
        get().award('haftalik', XP_RULES.haftalik.amount, 'Haftalık değerlendirme', week);
      },

      setSubscription: (p) => set((s) => ({ subscription: { ...s.subscription, ...p } })),

      demoAdvanceDay: () => {
        set((s) => ({ dayOffset: s.dayOffset + 1 }));
        const s = get();
        const today = s.today();
        const missed = s.tasks.filter((t) => isOverdue(t, today));
        useUi.getState().pushToast({
          text: missed.length ? `Yeni gün. ${missed.length} görev yeni tarih bekliyor.` : 'Yeni güne geçildi.',
          tone: missed.length ? 'uyari' : 'bilgi',
        });
        if (missed.length) s.triggerNotification('kacan', { ignoreQuiet: true });
      },
      demoAddXp: (n) => {
        get().award('demo', n, 'Demo puanı', null);
      },
    }),
    {
      name: 'edk-duzen-prototip',
      version: DATA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      // Şema değişirse eski prototip verisi yerine temiz başlangıç yapılır.
      migrate: () => emptyData(realToday()) as AppStore,
    },
  ),
);

function recordSession(f: ActiveFocus, minutes: number, completed: boolean): number {
  const { tasks, today, award } = useApp.getState();
  const date = today();
  const task = tasks.find((t) => t.id === f.taskId);
  useApp.setState((s) => ({
    sessions: [
      {
        id: uid('fs'),
        taskId: f.taskId,
        goalId: task?.goalId ?? null,
        technique: f.technique,
        plannedMin: Math.round(f.plannedSec / 60),
        actualMin: minutes,
        date,
        hour: new Date().getHours(),
        completed,
      },
      ...s.sessions,
    ],
    tasks: s.tasks.map((t) => (t.id === f.taskId ? { ...t, actualMin: t.actualMin + minutes } : t)),
  }));
  return award('odak', focusXp(minutes), 'Odak oturumu', null);
}

export const useToday = () => {
  const offset = useApp((s) => s.dayOffset);
  return addDays(realToday(), offset);
};
