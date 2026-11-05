import type { AppData, CoachCard, CoachFlow, CoachSource, ISODate } from '@/domain/types';

export interface CoachReply {
  text: string;
  source: CoachSource;
  card?: CoachCard;
  quickReplies?: string[];
}

export interface CoachResult {
  replies: CoachReply[];
  flow: CoachFlow | null;
  memory?: string;
}

export interface CoachContext {
  data: AppData;
  today: ISODate;
}

/**
 * Koç servisi sözleşmesi. Gerçek üründe bu arayüz, onaylı bilgi tabanı ve
 * model API'si kullanan sunucu tarafı bir istemciyle uygulanacak.
 */
export interface CoachService {
  readonly isSimulation: boolean;
  respond(message: string, ctx: CoachContext): Promise<CoachResult>;
}

export const STARTER_PROMPTS = [
  'Bugün ne yapmalıyım?',
  'Hedefim belirsiz',
  'Bu hafta çok yüklüyüm',
  'Sürekli erteliyorum',
  'Haftam nasıl geçti?',
  'Hangi tekniği kullanmalıyım?',
  'Enes bu konuda ne diyor?',
];
