import { simulatedCoach } from './coach/simulatedCoach';
import type { CoachService } from './coach/types';

/**
 * Tüm dış bağımlılıkların tek giriş noktası. Backend geldiğinde burada yalnızca
 * uygulama değişir, ekranlar değişmez.
 */
export const coachService: CoachService = simulatedCoach;

/** Abonelik simülasyonu: gerçek ödeme yapılmaz. */
export const billingService = {
  isSimulation: true,
  plans: {
    aylik: { label: 'Aylık', price: '₺249', period: '/ ay', note: 'Örnek fiyat, test edilecek' },
    yillik: { label: 'Yıllık', price: '₺1.790', period: '/ yıl', note: 'Aylık yaklaşık ₺149. Örnek fiyat' },
  },
};

export const FREE_COACH_LIMIT = 15;
