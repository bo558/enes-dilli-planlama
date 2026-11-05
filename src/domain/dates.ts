import type { ISODate } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (s: ISODate): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso: ISODate, n: number): ISODate => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const diffDays = (a: ISODate, b: ISODate): number =>
  Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86_400_000);

/** 0 = Pazartesi ... 6 = Pazar */
export const weekdayIndex = (iso: ISODate): number => (fromISO(iso).getDay() + 6) % 7;

export const startOfWeek = (iso: ISODate): ISODate => addDays(iso, -weekdayIndex(iso));

export const weekDays = (iso: ISODate): ISODate[] => {
  const s = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};

export const startOfMonth = (iso: ISODate): ISODate => `${iso.slice(0, 7)}-01`;

export const addMonths = (iso: ISODate, n: number): ISODate => {
  const d = fromISO(startOfMonth(iso));
  d.setMonth(d.getMonth() + n);
  return toISO(d);
};

/** Ay görünümü için pazartesiden başlayan, altı haftalık tablo */
export const monthGrid = (iso: ISODate): ISODate[] => {
  const s = startOfWeek(startOfMonth(iso));
  return Array.from({ length: 42 }, (_, i) => addDays(s, i));
};

export const isSameMonth = (a: ISODate, b: ISODate) => a.slice(0, 7) === b.slice(0, 7);

export const realToday = (): ISODate => toISO(new Date());

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('tr-TR', opts);
const fDayMonth = fmt({ day: 'numeric', month: 'long' });
const fDayMonthShort = fmt({ day: 'numeric', month: 'short' });
const fWeekday = fmt({ weekday: 'long' });
const fWeekdayShort = fmt({ weekday: 'short' });
const fMonthYear = fmt({ month: 'long', year: 'numeric' });
const fFull = fmt({ day: 'numeric', month: 'long', weekday: 'long' });

export const formatDayMonth = (iso: ISODate) => fDayMonth.format(fromISO(iso));
export const formatDayMonthShort = (iso: ISODate) => fDayMonthShort.format(fromISO(iso));
export const formatWeekday = (iso: ISODate) => fWeekday.format(fromISO(iso));
export const formatWeekdayShort = (iso: ISODate) => fWeekdayShort.format(fromISO(iso));
export const formatMonthYear = (iso: ISODate) => fMonthYear.format(fromISO(iso));
export const formatFull = (iso: ISODate) => fFull.format(fromISO(iso));

export const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const relativeDay = (iso: ISODate | null, today: ISODate): string => {
  if (!iso) return 'Tarihsiz';
  const diff = diffDays(iso, today);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Yarın';
  if (diff === -1) return 'Dün';
  if (diff > 1 && diff < 7) return formatWeekday(iso);
  if (diff < -1 && diff > -7) return `${-diff} gün önce`;
  return formatDayMonthShort(iso);
};

export const formatDuration = (min: number): string => {
  const m = Math.round(min);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} sa ${rest} dk` : `${h} sa`;
};

export const formatClock = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${pad(m)}:${pad(s % 60)}`;
};

export const greetingFor = (hour: number): string => {
  if (hour < 6) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
};
