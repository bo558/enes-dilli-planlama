import { startOfWeek } from './dates';
import type { AppData, ISODate, PetMood, PetSpecies, StageId, XpEvent, XpType } from './types';

/** Plan dokümanı 8. bölümdeki başlangıç değerleri. Beta sonrası ayarlanabilir. */
export const XP_RULES = {
  gorev: { amount: 10, dailyCap: 50, label: 'Plandaki görev' },
  odak: { amount: 10, perMinutes: 25, dailyCap: 40, label: 'Odak oturumu (25 dk başına)' },
  kapanis: { amount: 5, dailyCap: 5, label: 'Akşam kapanışı' },
  yenidenPlan: { amount: 3, label: 'Kaçan göreve yeni tarih' },
  haftalik: { amount: 20, label: 'Haftalık değerlendirme' },
  kilometre: { amount: 50, label: 'Kilometre taşı' },
} as const;

export interface Stage {
  id: StageId;
  name: string;
  xp: number;
  targetDay: string;
  change: string;
  reward: string;
  v11?: boolean;
}

export const STAGES: Stage[] = [
  { id: 'yumurta', name: 'Yumurta', xp: 0, targetDay: 'Kayıt', change: 'Seçilen tür ve isim', reward: 'İlk tema' },
  { id: 'yavru', name: 'Yavru', xp: 10, targetDay: '1. gün', change: 'Çatlama anı', reward: 'İlk tepkiler' },
  { id: 'genc', name: 'Genç', xp: 250, targetDay: '7. gün', change: 'Yeni görünüm', reward: 'Atkı' },
  { id: 'yetiskin', name: 'Yetişkin', xp: 1000, targetDay: '28. gün', change: 'Tam form', reward: 'Başarı kartı' },
  { id: 'usta', name: 'Usta', xp: 3000, targetDay: '90. gün+', change: 'Nadir görünüm', reward: 'Sezonluk kozmetik', v11: true },
];

export const stageFor = (xp: number): Stage => {
  let current = STAGES[0];
  for (const s of STAGES) if (xp >= s.xp) current = s;
  return current;
};

export const nextStage = (xp: number): Stage | null => STAGES.find((s) => s.xp > xp) ?? null;

export const stageProgress = (xp: number): number => {
  const current = stageFor(xp);
  const next = nextStage(xp);
  if (!next) return 1;
  return (xp - current.xp) / (next.xp - current.xp);
};

export const levelFor = (xp: number): number => Math.floor(xp / 100) + 1;
export const levelProgress = (xp: number): number => (xp % 100) / 100;

const earnedOn = (events: XpEvent[], type: XpType, date: ISODate) =>
  events.filter((e) => e.type === type && e.date === date).reduce((sum, e) => sum + e.amount, 0);

/**
 * Sınırlara göre verilebilecek puanı hesaplar. Kullanıcı kendi görevlerini yazdığı için
 * günlük sınırlar puan toplamayı anlamsız hale getirir.
 */
export const allowedXp = (
  events: XpEvent[],
  type: XpType,
  requested: number,
  date: ISODate,
  refId: string | null,
): number => {
  switch (type) {
    case 'gorev':
      return Math.max(0, Math.min(requested, XP_RULES.gorev.dailyCap - earnedOn(events, type, date)));
    case 'odak':
      return Math.max(0, Math.min(requested, XP_RULES.odak.dailyCap - earnedOn(events, type, date)));
    case 'kapanis':
      return Math.max(0, Math.min(requested, XP_RULES.kapanis.dailyCap - earnedOn(events, type, date)));
    case 'yeniden-plan':
      return events.some((e) => e.type === type && e.refId === refId) ? 0 : requested;
    case 'haftalik': {
      const week = startOfWeek(date);
      return events.some((e) => e.type === type && startOfWeek(e.date) === week) ? 0 : requested;
    }
    case 'kilometre':
      return events.some((e) => e.type === type && e.refId === refId) ? 0 : requested;
    default:
      return requested;
  }
};

export const focusXp = (minutes: number): number =>
  minutes < 5 ? 0 : Math.round((minutes / XP_RULES.odak.perMinutes) * XP_RULES.odak.amount);

export const SPECIES: Record<PetSpecies, { name: string; line: string; trait: string }> = {
  tilki: { name: 'Tilki', line: 'Kıvrak, yol bulan bir yoldaş.', trait: 'Tıkandığında yeni yol arar' },
  baykus: { name: 'Baykuş', line: 'Sakin, gözlemci bir yoldaş.', trait: 'Dikkatini tek işe toplar' },
  turna: { name: 'Turna', line: 'Sabırlı, uzun yol yoldaşı.', trait: 'Uzun hedefte ritmini korur' },
};

export interface Cosmetic {
  id: string;
  name: string;
  kind: 'aksesuar' | 'zemin';
  requires: { stage?: StageId; achievement?: string; premium?: boolean };
  hint: string;
}

export const COSMETICS: Cosmetic[] = [
  { id: 'atki', name: 'Atkı', kind: 'aksesuar', requires: { stage: 'genc' }, hint: 'Genç aşamasında açılır' },
  { id: 'gozluk', name: 'Yuvarlak gözlük', kind: 'aksesuar', requires: { achievement: 'on-saat' }, hint: '10 saat odak' },
  { id: 'madalya', name: 'Kilometre madalyası', kind: 'aksesuar', requires: { achievement: 'kilometre' }, hint: 'İlk kilometre taşı' },
  { id: 'taslak', name: 'Mimari kâğıt', kind: 'zemin', requires: {}, hint: 'Başlangıç zemini' },
  { id: 'safak', name: 'Şafak', kind: 'zemin', requires: { stage: 'genc' }, hint: 'Genç aşamasında açılır' },
  { id: 'gece', name: 'Gece mavisi', kind: 'zemin', requires: { premium: true }, hint: 'Premium' },
];

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  done: boolean;
  progress?: string;
}

export const achievementsFor = (data: AppData, weekActiveDays: number): Achievement[] => {
  const doneTasks = data.tasks.filter((t) => t.doneOn).length;
  const focusMin = data.sessions.reduce((s, x) => s + x.actualMin, 0);
  const replans = data.tasks.reduce((s, t) => s + t.moves.length, 0);
  const milestones = data.goals.reduce((s, g) => s + g.milestones.filter((m) => m.doneOn).length, 0);
  return [
    { id: 'ilk-adim', name: 'İlk adım', desc: 'İlk görevini tamamla', done: doneTasks >= 1 },
    { id: 'ilk-odak', name: 'İlk oturum', desc: 'İlk odak oturumunu bitir', done: data.sessions.length >= 1 },
    { id: 'yeniden-kurdu', name: 'Yeniden kurdu', desc: 'Kaçan bir göreve yeni tarih ver', done: replans >= 1 },
    { id: 'bes-gun', name: 'Beş gün ritmi', desc: 'Bir haftada 5 gün aktif ol', done: weekActiveDays >= 5, progress: `${Math.min(weekActiveDays, 5)}/5` },
    { id: 'kilometre', name: 'Kilometre taşı', desc: 'Bir kilometre taşını tamamla', done: milestones >= 1 },
    { id: 'on-saat', name: 'On saat', desc: 'Toplam 10 saat odaklan', done: focusMin >= 600, progress: `${Math.min(Math.floor(focusMin / 60), 10)}/10 sa` },
    { id: 'kapanisci', name: 'Günü kapatan', desc: 'Yedi akşam kapanışı yap', done: Object.keys(data.closings).length >= 7, progress: `${Math.min(Object.keys(data.closings).length, 7)}/7` },
  ];
};

export const isCosmeticUnlocked = (c: Cosmetic, data: AppData, achievements: Achievement[]): boolean => {
  if (c.requires.premium) return data.subscription.status !== 'ucretsiz';
  if (c.requires.stage) {
    const need = STAGES.find((s) => s.id === c.requires.stage)!;
    if (data.pet.xp < need.xp) return false;
  }
  if (c.requires.achievement) {
    return achievements.find((a) => a.id === c.requires.achievement)?.done ?? false;
  }
  return true;
};

export const moodFor = (donePct: number, daysSinceActive: number): PetMood => {
  if (daysSinceActive >= 3) return 'uykulu';
  if (donePct >= 0.5) return 'neseli';
  return 'sakin';
};

export const MOOD_LINE: Record<PetMood, string> = {
  neseli: 'Bugün iyi gidiyor.',
  sakin: 'Sıradaki adımı bekliyor.',
  uykulu: 'Biraz dinlendi. Hazır olduğunda buradasın.',
};
