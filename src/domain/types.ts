// Alan modeli. Plan dokümanındaki veri yapılarının prototip karşılığıdır;
// ileride API sözleşmesine dönüştürülebilir.

export type ISODate = string; // YYYY-AA-GG (yerel tarih)

export type GoalArea = 'zihin' | 'planlama' | 'enerji' | 'finans';

export interface Milestone {
  id: string;
  title: string;
  dueDate: ISODate | null;
  doneOn: ISODate | null;
}

export interface Goal {
  id: string;
  title: string;
  why: string;
  area: GoalArea;
  targetDate: ISODate;
  createdOn: ISODate;
  milestones: Milestone[];
  doneOn: ISODate | null;
}

export type MoveReason = 'zaman' | 'enerji' | 'oncelik' | 'unuttum' | 'diger';

export interface TaskMove {
  from: ISODate | null;
  to: ISODate | null;
  reason: MoveReason;
  on: ISODate;
}

export interface Task {
  id: string;
  title: string;
  goalId: string | null;
  milestoneId: string | null;
  date: ISODate | null;
  time: string | null; // SS:DD
  estimateMin: number;
  isMit: boolean; // Günün en önemli işi
  doneOn: ISODate | null;
  doneHour: number | null;
  actualMin: number;
  moves: TaskMove[];
  notes: string;
  createdOn: ISODate;
}

export type TechniqueId = 'pomodoro' | 'serbest' | 'iki-dakika' | 'onemli-is';

export interface FocusSession {
  id: string;
  taskId: string | null;
  goalId: string | null;
  technique: TechniqueId;
  plannedMin: number;
  actualMin: number;
  date: ISODate;
  hour: number;
  completed: boolean;
}

export interface ActiveFocus {
  technique: TechniqueId;
  taskId: string | null;
  phase: 'odak' | 'mola';
  plannedSec: number;
  elapsedBeforeSec: number;
  startedAt: number | null; // Epoch ms. Çalışmıyorsa null.
  cycle: number;
  focusMin: number;
  breakMin: number;
}

export type XpType = 'gorev' | 'odak' | 'kapanis' | 'yeniden-plan' | 'haftalik' | 'kilometre' | 'demo';

export interface XpEvent {
  id: string;
  type: XpType;
  amount: number;
  date: ISODate;
  label: string;
  refId: string | null;
}

export type PetSpecies = 'tilki' | 'baykus' | 'turna';
export type StageId = 'yumurta' | 'yavru' | 'genc' | 'yetiskin' | 'usta';
export type PetMood = 'neseli' | 'sakin' | 'uykulu';

export interface PetState {
  species: PetSpecies;
  name: string;
  xp: number;
  equipped: string[];
  backdrop: string;
  plainMode: boolean;
}

export type NotificationCategory =
  | 'yasam'
  | 'ozel'
  | 'plan'
  | 'kacan'
  | 'rapor'
  | 'hayvan'
  | 'donus'
  | 'ticari';

export interface Reminder {
  id: string;
  title: string;
  body: string;
  category: 'yasam' | 'ozel';
  time: string;
  days: number[]; // 0=Pazartesi ... 6=Pazar
  enabled: boolean;
}

export interface NotificationPrefs {
  categories: Record<NotificationCategory, boolean>;
  quietStart: string;
  quietEnd: string;
  dailyLimit: number;
  hideOnLock: boolean;
  vacation: boolean;
  permission: 'sorulmadi' | 'verildi' | 'reddedildi';
}

export type NotificationAction = 'yaptim' | 'yarina' | 'tarih-sec' | 'ac-rapor' | 'ac-koc' | 'ac-hayvan' | 'tamam';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  templateId: string;
  title: string;
  body: string;
  date: ISODate;
  taskId: string | null;
  actions: NotificationAction[];
  read: boolean;
  outcome: 'yanitsiz' | NotificationAction;
}

export type CoachSource = 'enes-ornek' | 'genel' | 'icerik-yok' | 'guvenlik' | 'sistem';

export type CoachCard =
  | {
      kind: 'hedef-onerisi';
      goal: { title: string; why: string; area: GoalArea; weeks: number };
      milestones: string[];
      tasks: string[];
      applied?: boolean;
    }
  | {
      kind: 'tasima-onerisi';
      moves: { taskId: string; title: string; from: ISODate; to: ISODate }[];
      applied?: boolean;
    }
  | { kind: 'bolme-onerisi'; taskId: string; taskTitle: string; parts: string[]; applied?: boolean }
  | { kind: 'teknik-onerisi'; technique: TechniqueId; reason: string }
  | { kind: 'hafta-ozeti'; adherence: number; done: number; planned: number; focusMin: number; moved: number }
  | { kind: 'guvenlik' }
  | { kind: 'kaynak-yok'; topic: string };

export interface ChatMessage {
  id: string;
  role: 'kullanici' | 'koc';
  text: string;
  source?: CoachSource;
  card?: CoachCard;
  quickReplies?: string[];
  createdAt: number;
}

export interface CoachFlow {
  id: 'hedef';
  step: number;
  data: Record<string, string>;
}

export interface CoachMemoryItem {
  id: string;
  text: string;
  addedOn: ISODate;
}

export type WorkWindow = 'sabah' | 'oglen' | 'aksam';

export interface Profile {
  name: string;
  email: string;
  areas: GoalArea[];
  struggle: string;
  workWindow: WorkWindow;
  dailyMinutes: number;
  tone: 'sakin' | 'motive' | 'sade';
  morningTime: string;
  eveningTime: string;
  joinedOn: ISODate;
}

export interface Subscription {
  status: 'deneme' | 'ucretsiz' | 'premium';
  plan: 'aylik' | 'yillik' | null;
  trialEnds: ISODate | null;
}

export interface Consents {
  age18: boolean;
  privacy: boolean;
  thirdPartyAi: boolean;
  marketing: boolean;
}

export interface DayClosing {
  mood: 1 | 2 | 3;
  note: string;
}

export interface AppData {
  version: number;
  onboarded: boolean;
  isDemo: boolean;
  dayOffset: number;
  theme: 'acik' | 'koyu';
  profile: Profile;
  consents: Consents;
  subscription: Subscription;
  goals: Goal[];
  tasks: Task[];
  sessions: FocusSession[];
  focus: ActiveFocus | null;
  xpEvents: XpEvent[];
  pet: PetState;
  reminders: Reminder[];
  prefs: NotificationPrefs;
  notifications: AppNotification[];
  messages: ChatMessage[];
  coachFlow: CoachFlow | null;
  coachMemory: CoachMemoryItem[];
  coachUsedThisMonth: number;
  closings: Record<ISODate, DayClosing>;
  weeklyReviews: Record<ISODate, { focusNote: string }>;
}
