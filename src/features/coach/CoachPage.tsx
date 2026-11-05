import { motion } from 'motion/react';
import { ArrowRightLeft, Check, Info, Scissors, Send, ShieldAlert, Target, Timer, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AREAS, TECHNIQUES } from '@/domain/catalog';
import { formatDuration, formatDayMonthShort, relativeDay } from '@/domain/dates';
import type { ChatMessage, CoachCard, CoachSource } from '@/domain/types';
import { Button, IconButton, Switch } from '@/design-system/ui';
import { RibbonMark } from '@/design-system/Ribbon';
import { FREE_COACH_LIMIT } from '@/services';
import { STARTER_PROMPTS } from '@/services/coach/types';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './coach.css';

const SOURCE_LABEL: Record<CoachSource, string | null> = {
  'enes-ornek': 'Enes\'in yöntemi · Örnek gösterim, onay bekliyor',
  genel: 'Genel öneri',
  'icerik-yok': 'Onaylı içerik yok',
  guvenlik: 'Güvenlik protokolü',
  sistem: null,
};

function CardView({ message, onClose }: { message: ChatMessage; onClose?: () => void }) {
  const card = message.card as CoachCard;
  const apply = useApp((s) => s.applyCoachCard);
  const navigate = useNavigate();
  const today = useToday();
  const go = (path: string) => { onClose?.(); navigate(path); };

  if (card.kind === 'hedef-onerisi') {
    return (
      <div className="ccard" data-testid="coach-card-goal">
        <div className="ccard__label"><Target size={14} /> Hedef taslağı · {card.goal.weeks} hafta</div>
        <div className="ccard__title">{card.goal.title}</div>
        <span className="chip" style={{ alignSelf: 'flex-start' }}><span className="dot" style={{ background: AREAS[card.goal.area].color }} />{AREAS[card.goal.area].name}</span>
        <div>
          <div className="ccard__sub">Kilometre taşları</div>
          <ol className="ccard__list">{card.milestones.map((m) => <li key={m}>{m}</li>)}</ol>
        </div>
        <div>
          <div className="ccard__sub">İlk görevler</div>
          <ul className="ccard__list ccard__list--dot">{card.tasks.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
        {card.applied ? (
          <div className="ccard__done"><Check size={15} /> Planına eklendi</div>
        ) : (
          <Button block onClick={() => apply(message.id)} data-testid="coach-apply">Onayla ve planıma ekle</Button>
        )}
      </div>
    );
  }

  if (card.kind === 'tasima-onerisi') {
    return (
      <div className="ccard" data-testid="coach-card-move">
        <div className="ccard__label"><ArrowRightLeft size={14} /> Önerilen değişiklik</div>
        <ul className="ccard__moves">
          {card.moves.map((m) => (
            <li key={m.taskId}>
              <strong>{m.title}</strong>
              <span>{relativeDay(m.from, today)} → {relativeDay(m.to, today)}</span>
            </li>
          ))}
        </ul>
        {card.applied ? (
          <div className="ccard__done"><Check size={15} /> Takvimine işlendi</div>
        ) : (
          <Button block onClick={() => apply(message.id)} data-testid="coach-apply">Bu değişikliği uygula</Button>
        )}
      </div>
    );
  }

  if (card.kind === 'bolme-onerisi') {
    return (
      <div className="ccard" data-testid="coach-card-split">
        <div className="ccard__label"><Scissors size={14} /> Görevi parçala</div>
        <div className="ccard__title">{card.taskTitle}</div>
        <ol className="ccard__list">{card.parts.map((p) => <li key={p}>{p}</li>)}</ol>
        {card.applied ? (
          <div className="ccard__done"><Check size={15} /> Görev parçalandı</div>
        ) : (
          <Button block onClick={() => apply(message.id)} data-testid="coach-apply">Parçalara böl</Button>
        )}
      </div>
    );
  }

  if (card.kind === 'teknik-onerisi') {
    const t = TECHNIQUES.find((x) => x.id === card.technique)!;
    return (
      <div className="ccard">
        <div className="ccard__label"><Timer size={14} /> Önerilen teknik</div>
        <div className="ccard__title">{t.name}</div>
        <p className="ccard__text">{card.reason}</p>
        <Button block variant="secondary" onClick={() => go(`/odak?teknik=${t.id}`)}>Odak ekranını aç</Button>
      </div>
    );
  }

  if (card.kind === 'hafta-ozeti') {
    return (
      <div className="ccard">
        <div className="ccard__label">Bu hafta</div>
        <div className="ccard__stats">
          <div><strong className="num">%{card.adherence}</strong><span>plana uyum</span></div>
          <div><strong className="num">{card.done}/{card.planned}</strong><span>görev</span></div>
          <div><strong className="num">{formatDuration(card.focusMin)}</strong><span>odak</span></div>
        </div>
        <Button block variant="secondary" onClick={() => go('/raporlar')}>Raporu aç</Button>
      </div>
    );
  }

  if (card.kind === 'guvenlik') {
    return (
      <div className="ccard ccard--safety" data-testid="coach-card-safety">
        <div className="ccard__label"><ShieldAlert size={14} /> Şimdi destek al</div>
        <p className="ccard__text">Acil bir durumdaysan <strong>112</strong> numaralı acil hattı ara. Güvendiğin bir kişiye veya bir ruh sağlığı uzmanına ulaşman en doğrusu.</p>
        <p className="ccard__fine">Yer tutucu metin: Gerçek üründe bu metin ve yönlendirmeler uzman onayıyla yazılacak.</p>
      </div>
    );
  }

  return (
    <div className="ccard">
      <div className="ccard__label"><Info size={14} /> İçerik ekibine not</div>
      <p className="ccard__text">"{card.topic}" konusu için onaylı yöntem kartı bulunamadı. Koç, olmayan içeriği Enes Dilli'ye mal etmez.</p>
    </div>
  );
}

function Bubble({ message, onClose }: { message: ChatMessage; onClose?: () => void }) {
  const isUser = message.role === 'kullanici';
  const source = message.source ? SOURCE_LABEL[message.source] : null;
  return (
    <motion.div
      className={`msg ${isUser ? 'msg--user' : 'msg--coach'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      data-testid={isUser ? 'msg-user' : 'msg-coach'}
    >
      {!isUser && <span className="msg__avatar"><RibbonMark size={20} color="#60a4f1" /></span>}
      <div className="msg__col">
        <div className="msg__bubble">{message.text}</div>
        {message.card && <CardView message={message} onClose={onClose} />}
        {source && (
          <div className={`msg__source msg__source--${message.source}`}>
            {source} <span aria-hidden="true">·</span> Simülasyon
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ConsentGate() {
  const setConsents = useApp((s) => s.setConsents);
  return (
    <div className="coach-gate">
      <span className="coach-gate__mark"><RibbonMark size={40} /></span>
      <h2>Koç için iznin gerekiyor</h2>
      <p>Gerçek üründe mesajların yanıt üretmek için üçüncü taraf bir yapay zekâ sağlayıcısına gönderilecek. İzin vermezsen planlama, odak ve raporlar çalışmaya devam eder.</p>
      <Button onClick={() => setConsents({ thirdPartyAi: true })}>İzin ver ve koçu aç</Button>
      <small>Prototipte mesajların hiçbir yere gönderilmez.</small>
    </div>
  );
}

export function CoachPanel({ onClose, compact }: { onClose?: () => void; compact?: boolean }) {
  const messages = useApp((s) => s.messages);
  const send = useApp((s) => s.sendCoachMessage);
  const consent = useApp((s) => s.consents.thirdPartyAi);
  const clearChat = useApp((s) => s.clearChat);
  const subscription = useApp((s) => s.subscription.status);
  const used = useApp((s) => s.coachUsedThisMonth);
  const typing = useUi((s) => s.coachTyping);
  const draft = useUi((s) => s.coachDraft);
  const setDraft = useUi((s) => s.setCoachDraft);
  const [text, setText] = useState('');
  const [showNotice, setShowNotice] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];
  const quick = last?.role === 'koc' ? last.quickReplies : undefined;
  const showStarters = messages.length === 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, typing]);

  useEffect(() => {
    if (draft && consent) {
      setDraft(null);
      void send(draft);
    }
  }, [draft, consent, send, setDraft]);

  const submit = (value: string) => {
    if (!value.trim() || typing) return;
    setText('');
    void send(value);
  };

  return (
    <div className="coach-panel" data-testid="coach-panel">
      <header className="coach-head">
        <span className="coach-head__avatar"><RibbonMark size={26} color="#fff" /></span>
        <div className="coach-head__text">
          <h1>Koçun</h1>
          <span>Enes Dilli'nin yöntemleriyle çalışacak dijital koç</span>
        </div>
        <div className="coach-head__actions">
          {messages.length > 0 && (
            <IconButton label="Sohbeti temizle" onClick={clearChat}><Trash2 size={18} /></IconButton>
          )}
          {onClose && <IconButton label="Kapat" onClick={onClose}><X size={20} /></IconButton>}
        </div>
      </header>

      {!consent ? (
        <ConsentGate />
      ) : (
        <>
          {showNotice && (
            <div className="coach-notice" data-testid="coach-notice">
              <span><strong>Bu bir simülasyon.</strong> Yanıtlar gerçek yapay zekâdan gelmez; hazır senaryolardır ve Enes Dilli tarafından onaylanmamıştır.</span>
              <IconButton size="sm" label="Uyarıyı gizle" onClick={() => setShowNotice(false)}><X size={15} /></IconButton>
            </div>
          )}
          <div className="coach-scroll">
            {showStarters && (
              <div className="coach-empty">
                <RibbonMark size={54} />
                <h2>Bugün neye birlikte <em>bakalım?</em></h2>
                <p>Hedefini netleştirebilir, planını hafifletebilir veya sıradaki adımı seçebiliriz.</p>
              </div>
            )}
            {messages.map((m) => (
              <Bubble key={m.id} message={m} onClose={onClose} />
            ))}
            {typing && (
              <div className="msg msg--coach" data-testid="coach-typing">
                <span className="msg__avatar"><RibbonMark size={20} color="#60a4f1" /></span>
                <div className="msg__bubble typing" aria-label="Koç yazıyor"><i /><i /><i /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="coach-bottom">
            {!typing && (quick || showStarters) && (
              <div className="quick-replies">
                {(quick ?? STARTER_PROMPTS).map((q) => (
                  <button key={q} type="button" className="quick" onClick={() => submit(q)} data-testid="quick-reply">{q}</button>
                ))}
              </div>
            )}
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                submit(text);
              }}
            >
              <input
                className="composer__input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Koça yaz..."
                aria-label="Koça mesaj yaz"
                data-testid="coach-input"
              />
              <button type="submit" className="composer__send" aria-label="Gönder" disabled={!text.trim() || typing}>
                <Send size={18} />
              </button>
            </form>
            {subscription === 'ucretsiz' && !compact && (
              <div className="coach-quota">Bu ay {Math.min(used, FREE_COACH_LIMIT)}/{FREE_COACH_LIMIT} ücretsiz mesaj kullanıldı (örnek kota)</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MemoryAside() {
  const memory = useApp((s) => s.coachMemory);
  const removeMemory = useApp((s) => s.removeMemory);
  const goals = useApp((s) => s.goals);
  const consent = useApp((s) => s.consents.thirdPartyAi);
  const setConsents = useApp((s) => s.setConsents);
  const today = useToday();
  return (
    <aside className="coach-aside">
      <section className="card">
        <div className="card__title">Koçun bildikleri</div>
        <p className="aside-note">Koç yalnızca senin gördüğün ve silebildiğin notları hatırlar.</p>
        <ul className="memory">
          {memory.map((m) => (
            <li key={m.id}>
              <span>{m.text}<small>{formatDayMonthShort(m.addedOn)}</small></span>
              <IconButton size="sm" label="Bu notu sil" onClick={() => removeMemory(m.id)}><X size={14} /></IconButton>
            </li>
          ))}
          {memory.length === 0 && <li className="memory__empty">Henüz not yok.</li>}
        </ul>
      </section>
      <section className="card">
        <div className="card__title">Bağlam</div>
        <p className="aside-note">Bu sohbette kullanılan veriler:</p>
        <ul className="ctx">
          <li><strong>{goals.filter((g) => !g.doneOn).length}</strong> aktif hedef</li>
          <li>Son 14 günün görev ve odak özeti</li>
          <li>Tercih ettiğin çalışma zamanı</li>
        </ul>
        <div className="setting-row" style={{ marginTop: 12 }}>
          <div>
            <div className="setting-row__title">Yapay zekâ izni</div>
            <div className="setting-row__desc">Son güncelleme: {relativeDay(today, today).toLocaleLowerCase('tr')}</div>
          </div>
          <Switch checked={consent} onChange={(v) => setConsents({ thirdPartyAi: v })} label="Yapay zekâ izni" />
        </div>
      </section>
      <section className="card coach-rules">
        <div className="card__title">Koçun sınırları</div>
        <ul>
          <li>Yapay zekâ olduğunu her zaman söyler.</li>
          <li>Değişiklik için onayını bekler.</li>
          <li>Teşhis veya yatırım tavsiyesi vermez.</li>
          <li>Onaylı içerik yoksa bunu açıkça belirtir.</li>
        </ul>
      </section>
    </aside>
  );
}

export function CoachPage() {
  return (
    <div className="coach-page">
      <div className="coach-page__chat">
        <CoachPanel />
      </div>
      <MemoryAside />
    </div>
  );
}
