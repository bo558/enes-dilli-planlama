import { AREAS, GOAL_SUGGESTIONS, PLAN_TEMPLATES, TECHNIQUES } from '@/domain/catalog';
import { addDays, formatDuration, formatWeekday, startOfWeek } from '@/domain/dates';
import { dayLoad, focusByTechnique, isOverdue, mostMoved, periodStats, sortTasks, tasksOn } from '@/domain/stats';
import type { CoachFlow, GoalArea, TechniqueId } from '@/domain/types';
import { STARTER_PROMPTS, type CoachContext, type CoachResult, type CoachService } from './types';

/**
 * ÖNEMLİ: Bu dosya yapay zekâ değildir. Önceden yazılmış senaryolar, kullanıcının
 * prototipteki verisiyle doldurulur. Metinler Enes Dilli tarafından onaylanmamıştır
 * ve onun yöntemini temsil etmez.
 */

const norm = (s: string) => s.toLocaleLowerCase('tr').trim();
const hasAny = (text: string, words: string[]) => words.some((w) => text.includes(w));

const SAFETY = ['intihar', 'kendime zarar', 'ölmek istiyorum', 'yaşamak istemiyorum', 'kendimi öldür', 'canıma kıy'];
const BOUNDARY = ['ilaç', 'teşhis', 'depresyon', 'hisse', 'kripto', 'yatırım tavsiye', 'hangi fon', 'avukat', 'dava'];

const areaFromText = (t: string): GoalArea | null => {
  if (hasAny(t, ['zihin', 'amaç'])) return 'zihin';
  if (hasAny(t, ['plan', 'düzen', 'iş'])) return 'planlama';
  if (hasAny(t, ['enerji', 'alışkanlık', 'hareket', 'uyku'])) return 'enerji';
  if (hasAny(t, ['finans', 'bütçe', 'para', 'birikim'])) return 'finans';
  return null;
};

const hedefAkisi = (message: string, flow: CoachFlow): CoachResult => {
  const text = norm(message);
  const data = { ...flow.data };

  if (flow.step === 0) {
    const area = areaFromText(text);
    if (!area) {
      return {
        flow,
        replies: [{
          text: 'Bu alanlardan birini seçersen ilerleyelim.',
          source: 'genel',
          quickReplies: Object.values(AREAS).map((a) => a.name),
        }],
      };
    }
    data.area = area;
    return {
      flow: { id: 'hedef', step: 1, data },
      replies: [{
        text: `${AREAS[area].name} alanında altı ay sonra neyin değişmiş olmasını istersin? Bir cümle yeterli.`,
        source: 'genel',
        quickReplies: GOAL_SUGGESTIONS[area],
      }],
    };
  }

  if (flow.step === 1) {
    data.title = message.trim();
    return {
      flow: { id: 'hedef', step: 2, data },
      replies: [{
        text: 'Güzel. Bu neden önemli? Olduğunda hayatında ne değişecek?',
        source: 'genel',
        quickReplies: ['Daha rahat hissedeceğim', 'Kendime daha çok güveneceğim', 'Zamanımı daha iyi kullanacağım'],
      }],
    };
  }

  if (flow.step === 2) {
    data.why = message.trim();
    return {
      flow: { id: 'hedef', step: 3, data },
      replies: [{
        text: 'Son soru: Buna haftada gerçekçi olarak ne kadar zaman ayırabilirsin?',
        source: 'genel',
        quickReplies: ['Haftada 1 saat', 'Haftada 3 saat', 'Haftada 5 saat veya fazlası'],
      }],
    };
  }

  const area = (data.area as GoalArea) ?? 'planlama';
  const template = PLAN_TEMPLATES[area];
  const weeks = text.includes('1 saat') ? 8 : text.includes('5 saat') ? 4 : 6;
  return {
    flow: null,
    memory: `${data.title} hedefine ayırabildiği süre: ${message.trim()}.`,
    replies: [{
      text: `Tamam. ${weeks} haftalık bir taslak hazırladım. Onaylamadan hiçbir görev oluşmaz; sonra istediğin gibi düzenleyebilirsin.`,
      source: 'genel',
      card: {
        kind: 'hedef-onerisi',
        goal: { title: data.title ?? 'Yeni hedef', why: data.why ?? '', area, weeks },
        milestones: template.milestones,
        tasks: template.tasks,
      },
    }],
  };
};

const yukAnalizi = ({ data, today }: CoachContext): CoachResult => {
  const capacity = data.profile.dailyMinutes;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((date) => ({ date, load: dayLoad(data.tasks, date) }));
  const heaviest = [...days].sort((a, b) => b.load - a.load)[0];

  if (!heaviest || heaviest.load <= capacity) {
    return {
      flow: null,
      replies: [{
        text: `Önümüzdeki yedi güne baktım. En yüklü gün ${formatDuration(heaviest?.load ?? 0)} ve günlük ${formatDuration(capacity)} kapasitenin içinde. Plan şu an dengeli görünüyor.`,
        source: 'genel',
        quickReplies: ['Bugün ne yapmalıyım?', 'Haftam nasıl geçti?'],
      }],
    };
  }

  const movable = sortTasks(tasksOn(data.tasks, heaviest.date))
    .filter((t) => !t.doneOn && !t.isMit)
    .reverse();
  const moves: { taskId: string; title: string; from: string; to: string }[] = [];
  let remaining = heaviest.load;
  const loads = new Map(days.map((d) => [d.date, d.load]));

  for (const t of movable) {
    if (remaining <= capacity) break;
    const target = [...days]
      .filter((d) => d.date > heaviest.date && (loads.get(d.date) ?? 0) + t.estimateMin <= capacity)
      .sort((a, b) => (loads.get(a.date) ?? 0) - (loads.get(b.date) ?? 0))[0];
    if (!target) continue;
    moves.push({ taskId: t.id, title: t.title, from: heaviest.date, to: target.date });
    loads.set(target.date, (loads.get(target.date) ?? 0) + t.estimateMin);
    remaining -= t.estimateMin;
  }

  if (!moves.length) {
    return {
      flow: null,
      replies: [{
        text: `${formatWeekday(heaviest.date)} günü ${formatDuration(heaviest.load)} iş var. Kapasitenin üzerinde, ancak taşıyabileceğim uygun bir gün bulamadım. Bir görevi küçültmek daha iyi olabilir.`,
        source: 'genel',
        quickReplies: ['Sürekli erteliyorum'],
      }],
    };
  }

  return {
    flow: null,
    replies: [{
      text: `En yüklü günün ${formatWeekday(heaviest.date)}: ${formatDuration(heaviest.load)}. Günlük kapasiten ${formatDuration(capacity)}. ${moves.length} görevi daha boş günlere taşımayı öneriyorum.`,
      source: 'genel',
      card: { kind: 'tasima-onerisi', moves },
    }],
  };
};

const ertelemeAnalizi = ({ data }: CoachContext): CoachResult => {
  const top = mostMoved(data, 1)[0];
  if (!top) {
    return {
      flow: null,
      replies: [{
        text: 'Kayıtlara göre sık taşınan bir görevin yok. Bugün başlamakta zorlandığın bir iş varsa iki dakikalık ilk adımını birlikte bulabiliriz.',
        source: 'genel',
        card: { kind: 'teknik-onerisi', technique: 'iki-dakika', reason: 'Başlama eşiğini düşürür.' },
      }],
    };
  }
  return {
    flow: null,
    replies: [{
      text: `"${top.title}" görevi ${top.moves.length} kez taşındı. Bu çoğu zaman tembellik değil, görevin fazla büyük olduğunun işaretidir. Üç küçük parçaya bölelim mi?`,
      source: 'genel',
      card: {
        kind: 'bolme-onerisi',
        taskId: top.id,
        taskTitle: top.title,
        parts: ['10 dakikalık kaba taslak çıkar', 'Ana kısmı tamamla', 'Gözden geçir ve bitir'],
      },
    }],
  };
};

const haftaOzeti = ({ data, today }: CoachContext): CoachResult => {
  const from = startOfWeek(today);
  const s = periodStats(data, from, addDays(from, 6), today);
  const pct = Math.round(s.adherence * 100);
  const strong = s.focusMin >= 120 ? `Bu hafta ${formatDuration(s.focusMin)} odaklandın.` : `${s.activeDays} gün aktif oldun.`;
  const issue = s.moved > 2 ? `${s.moved} görev taşındı; plan biraz iddialı olabilir.` : 'Taşınan görev sayın düşük.';
  return {
    flow: null,
    replies: [{
      text: `${strong} ${issue} Gelecek hafta için tek öneri: Günde en fazla bir büyük işe yer aç.`,
      source: 'genel',
      card: { kind: 'hafta-ozeti', adherence: pct, done: s.done, planned: s.planned, focusMin: s.focusMin, moved: s.moved },
      quickReplies: ['Bu hafta çok yüklüyüm', 'Sürekli erteliyorum'],
    }],
  };
};

const teknikOnerisi = ({ data, today }: CoachContext): CoachResult => {
  const stats = focusByTechnique(data, addDays(today, -30), today);
  const best = [...stats].sort((a, b) => b.completed / b.count - a.completed / a.count)[0];
  const technique: TechniqueId = best?.technique ?? 'pomodoro';
  const info = TECHNIQUES.find((t) => t.id === technique)!;
  return {
    flow: null,
    replies: [{
      text: best
        ? `Son 30 günde en sık tamamladığın teknik ${info.name}. ${best.count} oturumun ${best.completed} tanesini bitirmişsin. Bugün de onunla başlayabilirsin.`
        : `Henüz odak geçmişin yok. ${info.name} başlamak için iyi bir yer.`,
      source: 'genel',
      card: { kind: 'teknik-onerisi', technique, reason: info.whenToUse },
    }],
  };
};

const bugunOnerisi = ({ data, today }: CoachContext): CoachResult => {
  const open = sortTasks(tasksOn(data.tasks, today)).filter((t) => !t.doneOn);
  const overdue = data.tasks.filter((t) => isOverdue(t, today));
  if (!open.length && !overdue.length) {
    return {
      flow: null,
      replies: [{ text: 'Bugünkü planın tamam. İstersen yarını gözden geçirebilir veya günü burada bırakabilirsin.', source: 'genel' }],
    };
  }
  const first = open[0];
  const note = overdue.length ? ` Ayrıca ${overdue.length} görev yeni tarih bekliyor; akşam kapanışında bakabiliriz.` : '';
  return {
    flow: null,
    replies: [{
      text: first
        ? `Önce "${first.title}" görevinden başla. Tahmini ${formatDuration(first.estimateMin)}. Bugün sırada ${open.length} görev var.${note}`
        : `Bugün için açık görev yok.${note}`,
      source: 'genel',
      card: first ? { kind: 'teknik-onerisi', technique: 'pomodoro', reason: `"${first.title}" için bir oturum başlat.` } : undefined,
    }],
  };
};

const respondToText = (message: string, ctx: CoachContext): CoachResult => {
  const text = norm(message);

  // Hassas konular her akışın önüne geçer.
  if (hasAny(text, SAFETY)) {
    return {
      flow: null,
      replies: [{
        text: 'Bunu benimle paylaştığın için teşekkür ederim. Ben bir yapay zekâyım ve bu konuda sana gereken desteği veremem. Burada koçluğa ara veriyorum.',
        source: 'guvenlik',
        card: { kind: 'guvenlik' },
      }],
    };
  }

  const flow = ctx.data.coachFlow;
  if (flow?.id === 'hedef') return hedefAkisi(message, flow);

  if (hasAny(text, BOUNDARY)) {
    return {
      flow: null,
      replies: [{
        text: 'Bu konuda teşhis veya bireysel tavsiye veremem. Bir uzmanla görüşmeni öneririm. İstersen bu görüşme için plana bir görev ekleyebilirsin.',
        source: 'genel',
        quickReplies: ['Bugün ne yapmalıyım?'],
      }],
    };
  }

  if (hasAny(text, ['aşama', 'program'])) {
    return {
      flow: null,
      replies: [{
        text: 'Sitede yayınlanan 28 günlük program dört aşamadan oluşuyor: Zihin ve Amaç, Planlama ve Düzen, Enerji ve Alışkanlık, Hedef ve Finans. Program içeriğinin ayrıntıları henüz sisteme yüklenmedi.',
        source: 'enes-ornek',
        quickReplies: ['Hedefim belirsiz', 'Bugün ne yapmalıyım?'],
      }],
    };
  }

  if (hasAny(text, ['enes', 'yöntem'])) {
    return {
      flow: null,
      replies: [{
        text: 'Bu konuda henüz onaylı bir yöntem kartı yok, bu yüzden Enes Dilli adına cevap vermem doğru olmaz. Gerçek üründe bu soru içerik ekibinin listesine düşer. İstersen genel bir öneri verebilirim.',
        source: 'icerik-yok',
        card: { kind: 'kaynak-yok', topic: message.trim() },
        quickReplies: ['Programın aşamaları neler?', 'Bugün ne yapmalıyım?'],
      }],
    };
  }

  if (hasAny(text, ['belirsiz', 'hedef', 'ne istediğimi', 'netleş'])) {
    return {
      flow: { id: 'hedef', step: 0, data: {} },
      replies: [{
        text: 'Belirsizlik normal, birlikte netleştirelim. Birkaç kısa soru soracağım. Önce şunu seç: Hangi alanda bir şey değişsin istiyorsun?',
        source: 'genel',
        quickReplies: Object.values(AREAS).map((a) => a.name),
      }],
    };
  }

  if (hasAny(text, ['yüklü', 'yoğun', 'yetişemi', 'çok iş', 'yük'])) return yukAnalizi(ctx);
  if (hasAny(text, ['ertel', 'taşı', 'başlayamı', 'erteleme'])) return ertelemeAnalizi(ctx);
  if (hasAny(text, ['haftam', 'hafta nasıl', 'rapor', 'nasıl gidiyor', 'değerlendir'])) return haftaOzeti(ctx);
  if (hasAny(text, ['teknik', 'pomodoro', 'odak'])) return teknikOnerisi(ctx);
  if (hasAny(text, ['bugün', 'ne yapmalı', 'nereden başla', 'sırada'])) return bugunOnerisi(ctx);

  if (hasAny(text, ['merhaba', 'selam', 'günaydın', 'iyi akşam'])) {
    return {
      flow: null,
      replies: [{
        text: `Merhaba ${ctx.data.profile.name || ''}. Bugün neye birlikte bakalım?`.replace(' .', '.'),
        source: 'sistem',
        quickReplies: STARTER_PROMPTS.slice(0, 4),
      }],
    };
  }

  return {
    flow: null,
    replies: [{
      text: 'Bu prototipte yalnızca hazır senaryolar çalışıyor ve bu soru onlardan biri değil. Gerçek üründe burada onaylı içeriklere dayalı bir yanıt olacak. Şunlardan birini deneyebilirsin:',
      source: 'sistem',
      quickReplies: STARTER_PROMPTS,
    }],
  };
};

export const simulatedCoach: CoachService = {
  isSimulation: true,
  respond: async (message, ctx) => {
    // Gerçek bir ağ gecikmesi hissi vermek için kısa bekleme.
    await new Promise((r) => setTimeout(r, 650 + Math.random() * 450));
    return respondToText(message, ctx);
  },
};

// Testler için dışa açık
export const __respondSync = respondToText;
