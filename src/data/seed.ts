import { addDays, weekdayIndex } from '@/domain/dates';
import type {
  AppData,
  FocusSession,
  Goal,
  ISODate,
  MoveReason,
  NotificationPrefs,
  Reminder,
  Task,
  XpEvent,
} from '@/domain/types';

export const DATA_VERSION = 3;

/** Tekrarlanabilir sözde rastgele üreteç: örnek veri her açılışta aynı görünür. */
const prng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const defaultPrefs = (): NotificationPrefs => ({
  categories: {
    yasam: true,
    ozel: true,
    plan: true,
    kacan: true,
    rapor: true,
    hayvan: true,
    donus: true,
    ticari: false,
  },
  quietStart: '23:00',
  quietEnd: '07:30',
  dailyLimit: 3,
  hideOnLock: false,
  vacation: false,
  permission: 'sorulmadi',
});

export const defaultLifeReminders = (): Reminder[] => [
  { id: 'r-su', title: 'Su', body: 'Bugün su içtin mi?', category: 'yasam', time: '14:30', days: [0, 1, 2, 3, 4, 5, 6], enabled: true },
  { id: 'r-hareket', title: 'Hareket', body: 'Hadi biraz hareket et.', category: 'yasam', time: '16:00', days: [0, 1, 2, 3, 4], enabled: true },
];

export const emptyData = (today: ISODate): AppData => ({
  version: DATA_VERSION,
  onboarded: false,
  isDemo: false,
  dayOffset: 0,
  theme: 'acik',
  profile: {
    name: '',
    email: '',
    areas: [],
    struggle: '',
    workWindow: 'sabah',
    dailyMinutes: 60,
    tone: 'sakin',
    morningTime: '08:30',
    eveningTime: '21:30',
    joinedOn: today,
  },
  consents: { age18: false, privacy: false, thirdPartyAi: false, marketing: false },
  subscription: { status: 'deneme', plan: null, trialEnds: addDays(today, 14) },
  goals: [],
  tasks: [],
  sessions: [],
  focus: null,
  xpEvents: [],
  pet: { species: 'tilki', name: '', xp: 0, equipped: [], backdrop: 'taslak', plainMode: false },
  reminders: defaultLifeReminders(),
  prefs: defaultPrefs(),
  notifications: [],
  messages: [],
  coachFlow: null,
  coachMemory: [],
  coachUsedThisMonth: 0,
  closings: {},
  weeklyReviews: {},
});

const task = (
  id: string,
  title: string,
  date: ISODate | null,
  today: ISODate,
  extra: Partial<Task> = {},
): Task => ({
  id,
  title,
  goalId: null,
  milestoneId: null,
  date,
  time: null,
  estimateMin: 25,
  isMit: false,
  doneOn: null,
  doneHour: null,
  actualMin: 0,
  moves: [],
  notes: '',
  createdOn: addDays(today, -3),
  ...extra,
});

/**
 * Müşteri sunumu için kurgusal kişi. Gerçek kullanıcı verisi içermez.
 * Tüm tarihler bugüne göre hesaplanır, böylece prototip her gün güncel görünür.
 */
export const buildDemoData = (today: ISODate): AppData => {
  const rand = prng(20261105);
  const base = emptyData(today);

  const goals: Goal[] = [
    {
      id: 'g-yan-proje',
      title: 'Yan projemi ilk ödeme yapan müşteriye ulaştırmak',
      why: 'Maaşıma bağlı kalmadan kendi işimi denemek istiyorum.',
      area: 'planlama',
      targetDate: addDays(today, 68),
      createdOn: addDays(today, -32),
      doneOn: null,
      milestones: [
        { id: 'm1', title: 'Hedef müşteriyi netleştir', dueDate: addDays(today, -18), doneOn: addDays(today, -19) },
        { id: 'm2', title: '10 aday görüşmesi yap', dueDate: addDays(today, 6), doneOn: null },
        { id: 'm3', title: 'Teklif sayfasını yayınla', dueDate: addDays(today, 26), doneOn: null },
        { id: 'm4', title: 'İlk ödemeyi al', dueDate: addDays(today, 68), doneOn: null },
      ],
    },
    {
      id: 'g-hareket',
      title: 'Haftada 3 gün düzenli hareket etmek',
      why: 'Gün sonunda daha enerjik olmak istiyorum.',
      area: 'enerji',
      targetDate: addDays(today, 40),
      createdOn: addDays(today, -28),
      doneOn: null,
      milestones: [
        { id: 'm5', title: 'İlk iki haftayı tamamla', dueDate: addDays(today, -14), doneOn: addDays(today, -14) },
        { id: 'm6', title: 'Sabah rutinine ekle', dueDate: addDays(today, 8), doneOn: null },
        { id: 'm7', title: 'Altı haftayı kesintisiz bitir', dueDate: addDays(today, 40), doneOn: null },
      ],
    },
    {
      id: 'g-butce',
      title: 'Aylık bütçemi kurmak',
      why: 'Ay sonunu tahmin edebilmek ve birikime başlamak istiyorum.',
      area: 'finans',
      targetDate: addDays(today, 20),
      createdOn: addDays(today, -15),
      doneOn: null,
      milestones: [
        { id: 'm8', title: 'Son üç ayın giderlerini çıkar', dueDate: addDays(today, 1), doneOn: null },
        { id: 'm9', title: 'Kategori sınırlarını belirle', dueDate: addDays(today, 12), doneOn: null },
      ],
    },
    {
      id: 'g-sabah',
      title: 'Her sabah 10 dakika günlük yazmak',
      why: 'Güne dağınık değil, net başlamak istiyorum.',
      area: 'zihin',
      targetDate: addDays(today, 30),
      createdOn: addDays(today, -21),
      doneOn: null,
      milestones: [
        { id: 'm10', title: 'İlk 14 günü tamamla', dueDate: addDays(today, -7), doneOn: addDays(today, -6) },
        { id: 'm11', title: 'Haftalık okuma ekle', dueDate: addDays(today, 15), doneOn: null },
      ],
    },
  ];

  const historyTitles: Record<string, string[]> = {
    'g-yan-proje': ['Aday listesini güncelle', 'Görüşme notlarını temize çek', 'İki adaya mesaj yaz', 'Teklif taslağını düzenle', 'Rakip fiyatlarını incele'],
    'g-hareket': ['30 dakika yürüyüş', 'Evde esneme rutini', 'Spor kıyafetini hazırla'],
    'g-butce': ['Kart ekstrelerini indir', 'Abonelikleri listele', 'Market harcamalarını topla'],
    'g-sabah': ['10 dakika günlük yaz', 'Haftalık notları oku'],
  };
  const goalIds = Object.keys(historyTitles);
  const techniques: FocusSession['technique'][] = ['pomodoro', 'pomodoro', 'pomodoro', 'onemli-is', 'serbest'];

  const tasks: Task[] = [];
  const sessions: FocusSession[] = [];
  const xpEvents: XpEvent[] = [];
  const closings: AppData['closings'] = {};
  const reasons: MoveReason[] = ['zaman', 'enerji', 'oncelik', 'unuttum'];

  for (let back = 34; back >= 1; back--) {
    const date = addDays(today, -back);
    const wd = weekdayIndex(date);
    const weekend = wd >= 5;
    // Son haftalara doğru artan uyum: gelişim hikâyesi raporda görülebilsin.
    const momentum = 0.5 + ((34 - back) / 34) * 0.32;
    const skipDay = rand() < (weekend ? 0.45 : 0.08);
    if (skipDay) continue;
    const count = weekend ? 1 + Math.floor(rand() * 2) : 3 + Math.floor(rand() * 3);
    let tasksXp = 0;

    for (let i = 0; i < count; i++) {
      const goalId = goalIds[Math.floor(rand() * goalIds.length)];
      const titles = historyTitles[goalId];
      const title = titles[Math.floor(rand() * titles.length)];
      const done = rand() < momentum;
      const estimate = [15, 25, 25, 30, 45][Math.floor(rand() * 5)];
      const actual = done ? Math.round(estimate * (0.8 + rand() * 0.6)) : 0;
      const hour = 8 + Math.floor(rand() * 4) + (rand() < 0.35 ? 9 : 0);
      const id = `h-${back}-${i}`;
      const moved = !done || rand() < 0.1;
      tasks.push(
        task(id, title, date, today, {
          goalId,
          estimateMin: estimate,
          doneOn: done ? date : null,
          doneHour: done ? hour : null,
          actualMin: actual,
          createdOn: addDays(date, -2),
          // Yapılmayan geçmiş görevler ileri taşınmış sayılır, açık görev kalabalığı yaratmaz.
          ...(done
            ? {}
            : { doneOn: addDays(date, 1), doneHour: 20, actualMin: Math.round(estimate * 0.9) }),
          moves: moved
            ? [{ from: addDays(date, -1), to: date, reason: reasons[Math.floor(rand() * 4)], on: addDays(date, -1) }]
            : [],
        }),
      );
      if (done && back <= 20 && tasksXp < 50) {
        xpEvents.push({ id: `xp-${id}`, type: 'gorev', amount: 10, date, label: title, refId: id });
        tasksXp += 10;
      }
    }

    const sessionCount = weekend ? (rand() < 0.5 ? 1 : 0) : 1 + Math.floor(rand() * 3);
    let focusXp = 0;
    for (let s = 0; s < sessionCount; s++) {
      const technique = techniques[Math.floor(rand() * techniques.length)];
      const planned = technique === 'onemli-is' ? 50 : technique === 'serbest' ? 40 : 25;
      const actual = technique === 'serbest' ? 25 + Math.floor(rand() * 35) : Math.round(planned * (rand() < 0.85 ? 1 : 0.6));
      const hour = rand() < 0.7 ? 9 + Math.floor(rand() * 3) : 19 + Math.floor(rand() * 3);
      const goalId = goalIds[Math.floor(rand() * rand() * goalIds.length)];
      const id = `fs-${back}-${s}`;
      sessions.push({
        id,
        taskId: null,
        goalId,
        technique,
        plannedMin: planned,
        actualMin: actual,
        date,
        hour,
        completed: actual >= planned,
      });
      const gain = Math.min(Math.round((actual / 25) * 10), 40 - focusXp);
      if (back <= 20 && gain > 0) {
        xpEvents.push({ id: `xp-${id}`, type: 'odak', amount: gain, date, label: 'Odak oturumu', refId: id });
        focusXp += gain;
      }
    }

    if (back <= 20 && rand() < 0.45) {
      closings[date] = { mood: (1 + Math.floor(rand() * 3)) as 1 | 2 | 3, note: '' };
      xpEvents.push({ id: `xp-k-${back}`, type: 'kapanis', amount: 5, date, label: 'Akşam kapanışı', refId: null });
    }
  }

  // Bugün ve yakın gelecek: sunumda değiştirilecek canlı görevler.
  const liveTasks: Task[] = [
    task('t-mit', 'Üç aday görüşmesi için mesaj gönder', today, today, { goalId: 'g-yan-proje', milestoneId: 'm2', time: '09:30', estimateMin: 30, isMit: true }),
    task('t-gunluk', '10 dakika günlük yaz', today, today, { goalId: 'g-sabah', time: '08:15', estimateMin: 10, doneOn: today, doneHour: 8, actualMin: 12 }),
    task('t-ekstre', 'Son üç ayın kart ekstrelerini indir', today, today, { goalId: 'g-butce', milestoneId: 'm8', time: '13:00', estimateMin: 15 }),
    task('t-yuruyus', '30 dakika yürüyüş', today, today, { goalId: 'g-hareket', time: '18:30', estimateMin: 30 }),
    task('t-notlar', 'Geçen haftanın görüşme notlarını özetle', today, today, { goalId: 'g-yan-proje', estimateMin: 25 }),
    // Kaçan görevler: yeniden planlama akışını gösterir.
    task('t-teklif', 'Teklif sayfası metninin ilk bölümünü yaz', addDays(today, -1), today, {
      goalId: 'g-yan-proje',
      milestoneId: 'm3',
      estimateMin: 45,
      moves: [
        { from: addDays(today, -4), to: addDays(today, -3), reason: 'zaman', on: addDays(today, -4) },
        { from: addDays(today, -3), to: addDays(today, -1), reason: 'enerji', on: addDays(today, -3) },
      ],
    }),
    task('t-abonelik', 'Kullanmadığım abonelikleri listele', addDays(today, -2), today, { goalId: 'g-butce', estimateMin: 20 }),
    // Yaklaşanlar
    task('t-a1', 'İki yeni aday bul', addDays(today, 1), today, { goalId: 'g-yan-proje', milestoneId: 'm2', time: '10:00', estimateMin: 30 }),
    task('t-a2', 'Evde esneme rutini', addDays(today, 1), today, { goalId: 'g-hareket', time: '08:00', estimateMin: 15 }),
    task('t-a3', 'Market harcamalarını topla', addDays(today, 1), today, { goalId: 'g-butce', estimateMin: 25 }),
    task('t-a4', '10 dakika günlük yaz', addDays(today, 1), today, { goalId: 'g-sabah', time: '08:15', estimateMin: 10 }),
    task('t-a5', 'Görüşme soru listesini düzenle', addDays(today, 2), today, { goalId: 'g-yan-proje', estimateMin: 30 }),
    task('t-a6', 'Aday görüşmesi 1', addDays(today, 2), today, { goalId: 'g-yan-proje', milestoneId: 'm2', time: '11:00', estimateMin: 45 }),
    task('t-a7', 'Aday görüşmesi 2', addDays(today, 2), today, { goalId: 'g-yan-proje', milestoneId: 'm2', time: '14:00', estimateMin: 45 }),
    task('t-a8', 'Görüşme notlarını temize çek', addDays(today, 2), today, { goalId: 'g-yan-proje', estimateMin: 30 }),
    task('t-a9', '30 dakika yürüyüş', addDays(today, 2), today, { goalId: 'g-hareket', time: '18:30', estimateMin: 30 }),
    task('t-a10', 'Bütçe kategorilerini taslak olarak yaz', addDays(today, 3), today, { goalId: 'g-butce', milestoneId: 'm9', estimateMin: 30 }),
    task('t-a11', 'Haftalık notları oku', addDays(today, 4), today, { goalId: 'g-sabah', estimateMin: 15 }),
    task('t-a12', '30 dakika yürüyüş', addDays(today, 4), today, { goalId: 'g-hareket', estimateMin: 30 }),
    task('t-a13', 'Teklif sayfası için görsel seç', addDays(today, 6), today, { goalId: 'g-yan-proje', milestoneId: 'm3', estimateMin: 30 }),
    task('t-a14', 'Kategori sınırlarını belirle', addDays(today, 9), today, { goalId: 'g-butce', milestoneId: 'm9', estimateMin: 40 }),
    task('t-a15', 'Teklif sayfasını yayına al', addDays(today, 16), today, { goalId: 'g-yan-proje', milestoneId: 'm3', estimateMin: 60 }),
    task('t-b1', 'Telefon faturasını kontrol et', null, today, { estimateMin: 10 }),
  ];

  // Bugün için geçmiş odak ve puan
  sessions.push({ id: 'fs-bugun', taskId: 't-gunluk', goalId: 'g-sabah', technique: 'pomodoro', plannedMin: 25, actualMin: 25, date: today, hour: 8, completed: true });
  xpEvents.push({ id: 'xp-bugun-1', type: 'gorev', amount: 10, date: today, label: '10 dakika günlük yaz', refId: 't-gunluk' });
  xpEvents.push({ id: 'xp-bugun-2', type: 'odak', amount: 10, date: today, label: 'Odak oturumu', refId: 'fs-bugun' });
  xpEvents.push({ id: 'xp-m1', type: 'kilometre', amount: 50, date: addDays(today, -19), label: 'Hedef müşteriyi netleştir', refId: 'm1' });

  const xp = xpEvents.reduce((s, e) => s + e.amount, 0);

  return {
    ...base,
    onboarded: true,
    isDemo: true,
    profile: {
      name: 'Deniz',
      email: 'deniz@ornek.test',
      areas: ['planlama', 'enerji', 'finans'],
      struggle: 'uygulayamiyorum',
      workWindow: 'sabah',
      dailyMinutes: 90,
      tone: 'sakin',
      morningTime: '08:30',
      eveningTime: '21:30',
      joinedOn: addDays(today, -34),
    },
    consents: { age18: true, privacy: true, thirdPartyAi: true, marketing: false },
    subscription: { status: 'deneme', plan: null, trialEnds: addDays(today, 9) },
    goals,
    tasks: [...liveTasks, ...tasks],
    sessions,
    xpEvents: xpEvents.sort((a, b) => (a.date < b.date ? 1 : -1)),
    closings,
    pet: { species: 'tilki', name: 'Kıvılcım', xp, equipped: ['atki'], backdrop: 'taslak', plainMode: false },
    reminders: [
      ...defaultLifeReminders(),
      { id: 'r-kapanis', title: 'Akşam kapanışı', body: 'Bir dakikada günü kapatalım.', category: 'ozel', time: '21:30', days: [0, 1, 2, 3, 4, 5, 6], enabled: true },
      { id: 'r-aile', title: 'Annemi ara', body: 'Pazar araması zamanı.', category: 'ozel', time: '11:00', days: [6], enabled: true },
    ],
    prefs: { ...defaultPrefs(), permission: 'verildi' },
    coachMemory: [
      { id: 'cm-1', text: 'Sabahları daha verimli çalıştığını söyledi.', addedOn: addDays(today, -20) },
      { id: 'cm-2', text: 'Yan projesini tam zamanlı işinin yanında yürütüyor.', addedOn: addDays(today, -30) },
    ],
    coachUsedThisMonth: 23,
    messages: [
      {
        id: 'demo-m1',
        role: 'koc',
        text: 'Merhaba Deniz. "Teklif sayfası metninin ilk bölümünü yaz" görevi iki kez taşınmış. İstersen önce buna bakalım ya da başka bir konudan başlayalım.',
        source: 'genel',
        quickReplies: ['Sürekli erteliyorum', 'Bugün ne yapmalıyım?', 'Hedefim belirsiz', 'Bu hafta çok yüklüyüm', 'Haftam nasıl geçti?', 'Hangi tekniği kullanmalıyım?', 'Enes bu konuda ne diyor?'],
        createdAt: Date.now(),
      },
    ],
    notifications: [
      { id: 'n-1', category: 'plan', templateId: 'plan-1', title: 'Gün kapanıyor', body: 'Bugünkü planını tamamladın mı?', date: addDays(today, -1), taskId: null, actions: ['tamam'], read: true, outcome: 'tamam' },
      { id: 'n-2', category: 'kacan', templateId: 'kacan-1', title: 'Planladığın görev', body: 'Planladığın görevi henüz yapmadın: Teklif sayfası metninin ilk bölümünü yaz', date: today, taskId: 't-teklif', actions: ['yaptim', 'yarina', 'tarih-sec'], read: false, outcome: 'yanitsiz' },
      { id: 'n-3', category: 'rapor', templateId: 'rapor-1', title: 'Haftalık raporun hazır', body: 'Bu haftaya iki dakikada birlikte bakalım.', date: addDays(today, -2), taskId: null, actions: ['ac-rapor'], read: true, outcome: 'ac-rapor' },
    ],
  };
};
