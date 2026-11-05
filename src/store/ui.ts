import { create } from 'zustand';
import type { AppNotification, ISODate, StageId } from '@/domain/types';

export interface Toast {
  id: number;
  text: string;
  tone: 'bilgi' | 'basari' | 'uyari' | 'xp';
  actionLabel?: string;
  onAction?: () => void;
}

interface FocusSummary {
  minutes: number;
  xp: number;
  taskId: string | null;
  completed: boolean;
}

interface UiState {
  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;

  petPulse: number;
  pulsePet: () => void;

  stageUp: StageId | null;
  setStageUp: (s: StageId | null) => void;

  banner: AppNotification | null;
  setBanner: (n: AppNotification | null) => void;

  taskSheetId: string | null;
  openTask: (id: string | null) => void;
  newTaskFor: { date: ISODate | null; goalId?: string | null; time?: string | null } | null;
  openNewTask: (v: { date: ISODate | null; goalId?: string | null; time?: string | null } | null) => void;
  rescheduleId: string | null;
  openReschedule: (id: string | null) => void;
  splitId: string | null;
  openSplit: (id: string | null) => void;

  closingOpen: boolean;
  setClosingOpen: (v: boolean) => void;
  demoOpen: boolean;
  setDemoOpen: (v: boolean) => void;
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  coachDrawerOpen: boolean;
  setCoachDrawerOpen: (v: boolean) => void;
  coachTyping: boolean;
  setCoachTyping: (v: boolean) => void;
  coachDraft: string | null;
  setCoachDraft: (v: string | null) => void;

  focusSummary: FocusSummary | null;
  setFocusSummary: (s: FocusSummary | null) => void;
  focusExpanded: boolean;
  setFocusExpanded: (v: boolean) => void;
}

let toastId = 1;

export const useUi = create<UiState>((set) => ({
  toasts: [],
  pushToast: (t) => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), t.actionLabel ? 6000 : 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  petPulse: 0,
  pulsePet: () => set((s) => ({ petPulse: s.petPulse + 1 })),

  stageUp: null,
  setStageUp: (stageUp) => set({ stageUp }),

  banner: null,
  setBanner: (banner) => set({ banner }),

  taskSheetId: null,
  openTask: (taskSheetId) => set({ taskSheetId }),
  newTaskFor: null,
  openNewTask: (newTaskFor) => set({ newTaskFor }),
  rescheduleId: null,
  openReschedule: (rescheduleId) => set({ rescheduleId, taskSheetId: null }),
  splitId: null,
  openSplit: (splitId) => set({ splitId, rescheduleId: null, taskSheetId: null }),

  closingOpen: false,
  setClosingOpen: (closingOpen) => set({ closingOpen }),
  demoOpen: false,
  setDemoOpen: (demoOpen) => set({ demoOpen }),
  notifOpen: false,
  setNotifOpen: (notifOpen) => set({ notifOpen }),
  coachDrawerOpen: false,
  setCoachDrawerOpen: (coachDrawerOpen) => set({ coachDrawerOpen }),
  coachTyping: false,
  setCoachTyping: (coachTyping) => set({ coachTyping }),
  coachDraft: null,
  setCoachDraft: (coachDraft) => set({ coachDraft }),

  focusSummary: null,
  setFocusSummary: (focusSummary) => set({ focusSummary }),
  focusExpanded: false,
  setFocusExpanded: (focusExpanded) => set({ focusExpanded }),
}));
