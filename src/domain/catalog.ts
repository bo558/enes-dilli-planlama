import type { GoalArea, MoveReason, TechniqueId } from './types';

/** Alanlar, sitede yayınlanan dört aşamadan alındı. */
export const AREAS: Record<GoalArea, { name: string; short: string; color: string; desc: string }> = {
  zihin: { name: 'Zihin ve Amaç', short: 'Zihin', color: 'var(--area-zihin)', desc: 'Ne istediğini ve nedenini netleştirmek' },
  planlama: { name: 'Planlama ve Düzen', short: 'Planlama', color: 'var(--area-planlama)', desc: 'Günlerini ve işlerini bir sisteme oturtmak' },
  enerji: { name: 'Enerji ve Alışkanlık', short: 'Enerji', color: 'var(--area-enerji)', desc: 'Sürdürülebilir bir ritim kurmak' },
  finans: { name: 'Hedef ve Finans', short: 'Finans', color: 'var(--area-finans)', desc: 'Uzun vadeli hedeflerini ve bütçeni toparlamak' },
};

export const MOVE_REASONS: Record<MoveReason, string> = {
  zaman: 'Zamanım yetmedi',
  enerji: 'Enerjim düşüktü',
  oncelik: 'Başka iş öne geçti',
  unuttum: 'Unuttum',
  diger: 'Başka bir neden',
};

export interface Technique {
  id: TechniqueId;
  name: string;
  short: string;
  whenToUse: string;
  how: string[];
  defaultFocus: number;
  defaultBreak: number;
  countUp?: boolean;
  badge: string;
}

export const TECHNIQUES: Technique[] = [
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    short: 'Kısa aralıklarla ilerle',
    whenToUse: 'Başlamakta zorlandığında veya işi kısa aralıklara bölmek istediğinde.',
    how: ['Tek bir görev seç.', '25 dakika yalnızca ona odaklan.', '5 dakika mola ver, sonra tekrar et.'],
    defaultFocus: 25,
    defaultBreak: 5,
    badge: '25 / 5',
  },
  {
    id: 'onemli-is',
    name: 'Günün en önemli işi',
    short: 'Önce en değerli işi bitir',
    whenToUse: 'Önceliklerin karıştığında ve gün dağıldığında.',
    how: ['Sabah tek bir görev seç.', 'Başka bir işe geçmeden ona blok ayır.', 'Bitince günün geri kalanı serbest kalır.'],
    defaultFocus: 50,
    defaultBreak: 10,
    badge: '50 dk',
  },
  {
    id: 'iki-dakika',
    name: 'İki dakika kuralı',
    short: 'Küçük işleri biriktirme',
    whenToUse: 'Küçük işler birikip zihnini meşgul ettiğinde.',
    how: ['İki dakikada bitecek bir iş seç.', 'Planlamadan hemen yap.', 'İşaretle ve devam et.'],
    defaultFocus: 2,
    defaultBreak: 0,
    badge: '2 dk',
  },
  {
    id: 'serbest',
    name: 'Serbest odak',
    short: 'Akışı bölmeden çalış',
    whenToUse: 'Derin işlerde kısa aralıklar seni böldüğünde.',
    how: ['Sayacı başlat.', 'Akış bitene kadar çalış.', 'Bitince çalıştığın sürenin beşte biri kadar mola ver.'],
    defaultFocus: 0,
    defaultBreak: 0,
    countUp: true,
    badge: 'Sayaç',
  },
];

export const FUTURE_TECHNIQUES = [
  { name: 'Zaman bloklama', when: 'Takvimi dolu olanlar için', where: 'v1.1' },
  { name: 'Eisenhower matrisi', when: 'Çok iş varken öncelik için', where: 'v1.1' },
  { name: 'Eğer-o zaman planı', when: 'Tekrarlayan ertelemeye karşı', where: 'v1.1' },
  { name: 'Aralıklı tekrar', when: 'Öğrenme hedefleri için', where: 'v2' },
];

export const STRUGGLES = [
  { id: 'baslayamiyorum', label: 'Başlamakta zorlanıyorum' },
  { id: 'uygulayamiyorum', label: 'Plan yapıyorum, uygulayamıyorum' },
  { id: 'kacirinca', label: 'Bir gün kaçırınca bırakıyorum' },
  { id: 'belirsiz', label: 'Ne istediğim net değil' },
  { id: 'zaman', label: 'Zamanım yetmiyor' },
];

export const GOAL_SUGGESTIONS: Record<GoalArea, string[]> = {
  zihin: ['Her sabah 10 dakika günlük yazmak', 'Bu yıl için üç net öncelik belirlemek'],
  planlama: ['Haftalık planlama rutinimi oturtmak', 'Yan projemi ilk müşteriye ulaştırmak'],
  enerji: ['Haftada 3 gün düzenli hareket etmek', 'Uyku saatimi düzene sokmak'],
  finans: ['Aylık bütçemi kurmak', 'Üç aylık birikim hedefi oluşturmak'],
};

/** Plan taslağı şablonları. Gerçek üründe koç, onaylı yöntem kartlarıyla üretir. */
export const PLAN_TEMPLATES: Record<GoalArea, { milestones: string[]; tasks: string[] }> = {
  zihin: {
    milestones: ['Neden önemli olduğunu yaz', 'İki haftalık düzeni dene', 'Ritmi değerlendir ve ayarla', 'Sürdürülebilir hale getir'],
    tasks: ['Hedefin nedenini üç cümleyle yaz', 'Takvimde sabit bir zaman ayır', 'İlk denemeyi 10 dakikayla yap', 'Haftanın sonunda kısa bir not al'],
  },
  planlama: {
    milestones: ['Mevcut durumu çıkar', 'İlk çalışan sürümü kur', 'Düzenli tekrara geçir', 'Sonucu ölç ve iyileştir'],
    tasks: ['Yapılması gerekenleri tek listede topla', 'En küçük ilk adımı belirle', 'Hafta için iki çalışma bloğu ayır', 'İlk bloğu tamamla ve not al'],
  },
  enerji: {
    milestones: ['Başlangıç seviyeni gör', 'Üç günlük ritmi kur', 'Engelleri azalt', 'Ritmi kalıcı hale getir'],
    tasks: ['Bu hafta için üç gün seç', 'Gerekli hazırlığı önceden yap', 'İlk oturumu kısa tut', 'Kendini nasıl hissettiğini not al'],
  },
  finans: {
    milestones: ['Gelir ve giderleri çıkar', 'Aylık bütçeyi kur', 'Birikim adımını otomatikleştir', 'Üç aylık değerlendirme yap'],
    tasks: ['Son üç ayın giderlerini listele', 'Harcamaları kategorilere ayır', 'Aylık üst sınırları belirle', 'Birikim için bir tutar belirle'],
  },
};
