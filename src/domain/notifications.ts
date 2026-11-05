import type {
  AppData,
  AppNotification,
  ISODate,
  NotificationAction,
  NotificationCategory,
  Task,
} from './types';
import { isOverdue } from './stats';

export const CATEGORY_LABELS: Record<NotificationCategory, { name: string; desc: string; locked?: string }> = {
  yasam: { name: 'Yaşam hatırlatıcıları', desc: 'Su, hareket gibi seçtiğin saatlerdeki mesajlar' },
  ozel: { name: 'Özel hatırlatıcılar', desc: 'Kendi yazdığın hatırlatıcılar' },
  plan: { name: 'Günlük plan', desc: 'Sabah ve akşam plan durumu' },
  kacan: { name: 'Kaçan görevler', desc: 'Yapılmayan görev ve yeniden planlama' },
  rapor: { name: 'Raporlar', desc: 'Haftalık ve aylık rapor hazır olduğunda' },
  hayvan: { name: 'Hayvan', desc: 'Yaklaşan gelişim anları' },
  donus: { name: 'Geri dönüş', desc: 'Uzun süre girmediğinde nazik bir davet' },
  ticari: { name: 'Kampanya ve duyurular', desc: 'Ayrı onay gerekir. Varsayılan olarak kapalıdır.' },
};

interface Template {
  id: string;
  category: NotificationCategory;
  title: string;
  body: (ctx: { task?: Task; petName: string; name: string }) => string;
  actions: NotificationAction[];
  needs?: 'acik-gorev' | 'kacan-gorev' | 'yaklasan-gelisim';
}

export const TEMPLATES: Template[] = [
  { id: 'su-1', category: 'yasam', title: 'Küçük bir mola', body: () => 'Bugün su içtin mi?', actions: ['yaptim', 'tamam'] },
  { id: 'su-2', category: 'yasam', title: 'Bir bardak su', body: () => 'Bir bardak su, sonra kaldığın yerden devam.', actions: ['yaptim', 'tamam'] },
  { id: 'hareket-1', category: 'yasam', title: 'Beş dakika', body: () => 'Hadi biraz hareket et.', actions: ['yaptim', 'tamam'] },
  { id: 'plan-1', category: 'plan', title: 'Gün kapanıyor', body: () => 'Bugünkü planını tamamladın mı?', actions: ['tamam'], needs: 'acik-gorev' },
  { id: 'plan-2', category: 'plan', title: 'Akşam kapanışı', body: () => 'Bir dakikada günü kapatalım, kalanlara tarih verelim.', actions: ['tamam'], needs: 'acik-gorev' },
  { id: 'kacan-1', category: 'kacan', title: 'Planladığın görev', body: ({ task }) => `Planladığın görevi henüz yapmadın: ${task?.title}`, actions: ['yaptim', 'yarina', 'tarih-sec'], needs: 'kacan-gorev' },
  { id: 'kacan-2', category: 'kacan', title: 'Yeni bir tarih?', body: ({ task }) => `Bu görevi başka bir güne taşımak ister misin? ${task?.title}`, actions: ['yaptim', 'yarina', 'tarih-sec'], needs: 'kacan-gorev' },
  { id: 'rapor-1', category: 'rapor', title: 'Haftalık raporun hazır', body: () => 'Bu haftaya iki dakikada birlikte bakalım.', actions: ['ac-rapor'] },
  { id: 'hayvan-1', category: 'hayvan', title: 'Yakın bir gelişim', body: ({ petName }) => `${petName} yeni aşamaya çok yakın.`, actions: ['ac-hayvan'], needs: 'yaklasan-gelisim' },
  { id: 'donus-1', category: 'donus', title: 'Planı birlikte toparlayalım', body: () => 'Kaldığın yerden, küçük bir adımla başlayabilirsin.', actions: ['ac-koc'] },
];

export interface GateResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface Evaluation {
  gates: GateResult[];
  passed: boolean;
  templateId: string | null;
  task?: Task;
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const isQuietNow = (quietStart: string, quietEnd: string, minutesNow: number): boolean => {
  const s = toMinutes(quietStart);
  const e = toMinutes(quietEnd);
  if (s === e) return false;
  return s < e ? minutesNow >= s && minutesNow < e : minutesNow >= s || minutesNow < e;
};

const sentToday = (data: AppData, today: ISODate) =>
  data.notifications.filter((n) => n.date === today && n.category !== 'ozel').length;

/** Üst üste yanıtsız kalan bildirim sayısı (geri çekilme kuralı için) */
export const unansweredStreak = (data: AppData, category: NotificationCategory): number => {
  const list = data.notifications.filter((n) => n.category === category);
  let streak = 0;
  for (const n of list) {
    if (n.outcome !== 'yanitsiz') break;
    streak += 1;
  }
  return streak;
};

const pickTemplate = (data: AppData, category: NotificationCategory): Template | null => {
  const candidates = TEMPLATES.filter((t) => t.category === category);
  if (!candidates.length) return null;
  // Tazelik: en uzun süredir gösterilmeyen şablon öne çıkar (bkz. Duolingo KDD 2020).
  const lastIndex = (id: string) => {
    const i = data.notifications.findIndex((n) => n.templateId === id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...candidates].sort((a, b) => lastIndex(b.id) - lastIndex(a.id))[0];
};

/** Plandaki karar akışı: izin ve kategori, durum, sessiz saat ve sınır. */
export const evaluateNotification = (
  data: AppData,
  category: NotificationCategory,
  today: ISODate,
  minutesNow: number,
  opts: { taskId?: string; ignoreQuiet?: boolean } = {},
): Evaluation => {
  const gates: GateResult[] = [];
  const prefs = data.prefs;

  const permissionOk = prefs.permission !== 'reddedildi';
  const categoryOk = prefs.categories[category];
  const vacationOk = !prefs.vacation;
  gates.push({
    name: 'İzin ve kategori açık mı?',
    passed: permissionOk && categoryOk && vacationOk,
    detail: !permissionOk
      ? 'Bildirim izni kapalı.'
      : !categoryOk
        ? `"${CATEGORY_LABELS[category].name}" kategorisi kapalı.`
        : !vacationOk
          ? 'Tatil modu açık.'
          : 'Kategori açık.',
  });

  const template = pickTemplate(data, category);
  let task: Task | undefined;
  let stateOk = true;
  let stateDetail = 'Bu tür için durum koşulu yok.';
  if (template?.needs === 'kacan-gorev') {
    task = opts.taskId
      ? data.tasks.find((t) => t.id === opts.taskId)
      : data.tasks.find((t) => isOverdue(t, today));
    if (task && !task.doneOn && task.date && task.date <= today) {
      stateDetail = `"${task.title}" hâlâ açık.`;
    } else {
      stateOk = false;
      stateDetail = task?.doneOn ? 'Görev zaten tamamlandı, mesaj gönderilmez.' : 'Kaçan görev yok.';
    }
  }
  if (template?.needs === 'acik-gorev') {
    const open = data.tasks.filter((t) => t.date === today && !t.doneOn);
    stateOk = open.length > 0;
    stateDetail = stateOk ? `Bugün ${open.length} açık görev var.` : 'Bugünkü plan tamam, mesaj gönderilmez.';
  }
  gates.push({ name: 'Durum hâlâ geçerli mi?', passed: stateOk, detail: stateDetail });

  const quiet = !opts.ignoreQuiet && isQuietNow(prefs.quietStart, prefs.quietEnd, minutesNow);
  const count = sentToday(data, today);
  const limitOk = category === 'ozel' || count < prefs.dailyLimit;
  const streak = unansweredStreak(data, category);
  const backoffOk = streak < 3;
  gates.push({
    name: 'Sessiz saat ve sınır uygun mu?',
    passed: !quiet && limitOk && backoffOk,
    detail: quiet
      ? `Sessiz saatler (${prefs.quietStart}–${prefs.quietEnd}) içinde.`
      : !limitOk
        ? `Günlük sınıra ulaşıldı (${count}/${prefs.dailyLimit}).`
        : !backoffOk
          ? 'Bu tür üst üste 3 kez yanıtsız kaldı, sıklık azaltıldı.'
          : `Bugün gönderilen: ${count}/${prefs.dailyLimit}.`,
  });

  const passed = gates.every((g) => g.passed);
  return { gates, passed, templateId: passed ? (template?.id ?? null) : null, task };
};

export const buildNotification = (
  data: AppData,
  evaluation: Evaluation,
  category: NotificationCategory,
  today: ISODate,
  id: string,
): AppNotification | null => {
  const template = TEMPLATES.find((t) => t.id === evaluation.templateId);
  if (!template) return null;
  return {
    id,
    category,
    templateId: template.id,
    title: template.title,
    body: template.body({ task: evaluation.task, petName: data.pet.name || 'Yoldaşın', name: data.profile.name }),
    date: today,
    taskId: evaluation.task?.id ?? null,
    actions: template.actions,
    read: false,
    outcome: 'yanitsiz',
  };
};

export const ACTION_LABELS: Record<NotificationAction, string> = {
  yaptim: 'Yaptım',
  yarina: 'Yarına taşı',
  'tarih-sec': 'Tarih seç',
  'ac-rapor': 'Raporu aç',
  'ac-koc': 'Koçu aç',
  'ac-hayvan': 'Hayvana bak',
  tamam: 'Tamam',
};
