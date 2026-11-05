import { ArrowLeft, ArrowRight, Bell, Check, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoBeyaz from '@/assets/logo-beyaz.png';
import { AREAS, GOAL_SUGGESTIONS, PLAN_TEMPLATES, STRUGGLES } from '@/domain/catalog';
import { addDays, formatDayMonth, realToday } from '@/domain/dates';
import { SPECIES } from '@/domain/gamification';
import type { GoalArea, PetSpecies, WorkWindow } from '@/domain/types';
import { Ribbon, RibbonMark } from '@/design-system/Ribbon';
import { Button, Field, SimBadge, Switch } from '@/design-system/ui';
import { PetArt } from '@/features/pet/PetArt';
import { useApp } from '@/store/app';
import { useUi } from '@/store/ui';
import './onboarding.css';

type Step = 'hosgeldin' | 'hesap' | 'onay' | 'alan' | 'zorluk' | 'hedef' | 'netlestir' | 'ritim' | 'plan' | 'yoldas' | 'ilk' | 'bildirim' | 'deneme';
const ORDER: Step[] = ['hosgeldin', 'hesap', 'onay', 'alan', 'zorluk', 'hedef', 'netlestir', 'ritim', 'plan', 'yoldas', 'ilk', 'bildirim', 'deneme'];

function CoachSays({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="ob-coach" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <span className="ob-coach__avatar"><RibbonMark size={20} color="#60a4f1" /></span>
      <div className="ob-coach__bubble">{children}</div>
    </motion.div>
  );
}

export function OnboardingPage() {
  const today = realToday();
  const navigate = useNavigate();
  const loadDemo = useApp((s) => s.loadDemo);
  const completeOnboarding = useApp((s) => s.completeOnboarding);
  const pushToast = useUi((s) => s.pushToast);

  const [step, setStep] = useState<Step>('hosgeldin');
  const [name, setName] = useState('');
  const [consents, setConsents] = useState({ age18: false, privacy: false, thirdPartyAi: true, marketing: false });
  const [areas, setAreas] = useState<GoalArea[]>([]);
  const [struggle, setStruggle] = useState('');
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [weeks, setWeeks] = useState(8);
  const [metric, setMetric] = useState('');
  const [workWindow, setWorkWindow] = useState<WorkWindow>('sabah');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [milestones, setMilestones] = useState<string[]>([]);
  const [tasks, setTasks] = useState<string[]>([]);
  const [species, setSpecies] = useState<PetSpecies>('tilki');
  const [petName, setPetName] = useState('');
  const [firstDone, setFirstDone] = useState(false);
  const [permission, setPermission] = useState<'sorulmadi' | 'verildi' | 'reddedildi'>('sorulmadi');
  const [morning, setMorning] = useState('08:30');
  const [evening, setEvening] = useState('21:30');

  const idx = ORDER.indexOf(step);
  const area = areas[0] ?? 'planlama';
  const next = () => setStep(ORDER[Math.min(ORDER.length - 1, idx + 1)]);
  const back = () => setStep(ORDER[Math.max(0, idx - 1)]);

  useEffect(() => {
    if (step === 'plan') {
      setMilestones(PLAN_TEMPLATES[area].milestones);
      setTasks(PLAN_TEMPLATES[area].tasks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step === 'plan']);

  const firstTaskTitle = 'Telefonunu sessize al ve hedefini bir kez daha oku';
  const targetDate = addDays(today, weeks * 7);
  const canNext = useMemo(() => {
    switch (step) {
      case 'hesap': return name.trim().length >= 2;
      case 'onay': return consents.age18 && consents.privacy;
      case 'alan': return areas.length > 0;
      case 'zorluk': return !!struggle;
      case 'hedef': return title.trim().length >= 3;
      case 'plan': return milestones.length > 0;
      case 'yoldas': return petName.trim().length >= 2;
      case 'ilk': return firstDone;
      default: return true;
    }
  }, [step, name, consents, areas, struggle, title, milestones, petName, firstDone]);

  const finish = () => {
    const span = weeks * 7;
    completeOnboarding({
      profile: {
        name: name.trim(),
        areas,
        struggle,
        workWindow,
        dailyMinutes,
        morningTime: morning,
        eveningTime: evening,
      },
      consents,
      goal: {
        title: title.trim(),
        why: why.trim(),
        area,
        targetDate,
        milestones: milestones.filter((m) => m.trim()).map((m, i, list) => ({ title: m, dueDate: addDays(today, Math.round((span / list.length) * (i + 1))) })),
        tasks: tasks.filter((t) => t.trim()).map((t, i) => ({ title: t, date: addDays(today, i), estimateMin: 25, milestoneIndex: 0 })),
      },
      species,
      petName: petName.trim(),
      permission,
      firstTaskTitle,
    });
    useUi.setState({ stageUp: null, toasts: [] });
    navigate('/', { replace: true });
    pushToast({ text: 'Planın hazır. İlk günün kolay gelsin.', tone: 'basari' });
  };

  const visual = (
    <aside className="ob-visual">
      <img src={logoBeyaz} alt="Enes Dilli Akademi" className="ob-visual__logo" />
      <div className="ob-visual__art">
        {['yoldas', 'ilk', 'bildirim', 'deneme'].includes(step) ? (
          <motion.div key={species + firstDone} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 18 }}>
            <PetArt species={species} stage={firstDone ? 'yavru' : 'yumurta'} mood="neseli" size={280} />
          </motion.div>
        ) : (
          <Ribbon value={step === 'hosgeldin' ? 0.72 : Math.max(0.04, idx / (ORDER.length - 1))} size={320} stroke={18} track="rgb(255 255 255 / 0.1)" fill="#60a4f1" label="Karşılama akışı ilerlemesi" />
        )}
      </div>
      <p className="ob-visual__quote">Bilgiyi topladın, sıra düzeni kurmakta.</p>
      <small className="ob-visual__src">enesdilliakademi.com</small>
    </aside>
  );

  return (
    <div className={`ob ${step === 'hosgeldin' ? 'ob--welcome' : ''}`} data-testid="onboarding">
      {visual}
      <main className="ob-main">
        {step !== 'hosgeldin' && (
          <div className="ob-top">
            <button type="button" className="icon-btn" aria-label="Geri" onClick={back} data-testid="ob-back"><ArrowLeft size={20} /></button>
            <div className="ob-progress" role="progressbar" aria-valuenow={idx} aria-valuemax={ORDER.length - 1}>
              <motion.div className="ob-progress__fill" animate={{ width: `${(idx / (ORDER.length - 1)) * 100}%` }} />
            </div>
            <span className="ob-count num">{idx}/{ORDER.length - 1}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="ob-body"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {step === 'hosgeldin' && (
              <div className="ob-welcome">
                <div className="ob-welcome__art">
                  <Ribbon value={0.72} size={230} track="var(--surface-3)" label="Düzen" />
                </div>
                <span className="label">Düzen · Enes Dilli Akademi</span>
                <h1>Hedefini <em>her gün yapabileceğin</em> adımlara çevir.</h1>
                <p>Bir koç, net bir plan ve seninle büyüyen bir yoldaş. Kaçırdığın günde suçlamaz, planı birlikte yeniden kurar.</p>
                <div className="ob-welcome__cta">
                  <Button block onClick={next} data-testid="ob-start">Başla <ArrowRight size={17} /></Button>
                  <Button block variant="secondary" onClick={() => { loadDemo(); navigate('/', { replace: true }); }} data-testid="ob-demo">
                    Örnek verilerle gez
                  </Button>
                </div>
                <small className="ob-fine">Etkileşimli prototip. Veriler yalnızca bu tarayıcıda kalır; "Düzen" çalışma adıdır.</small>
              </div>
            )}

            {step === 'hesap' && (
              <>
                <h1 className="ob-title">Sana nasıl <em>hitap edelim?</em></h1>
                <Field label="Adın">
                  <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Adın" data-testid="ob-name" />
                </Field>
                <div className="ob-sso">
                  <Button variant="secondary" block onClick={() => pushToast({ text: 'Giriş altyapısı bu prototipte yok', tone: 'bilgi' })}>Apple ile devam et</Button>
                  <Button variant="secondary" block onClick={() => pushToast({ text: 'Giriş altyapısı bu prototipte yok', tone: 'bilgi' })}>Google ile devam et</Button>
                </div>
              </>
            )}

            {step === 'onay' && (
              <>
                <h1 className="ob-title">Başlamadan önce <em>net olalım</em></h1>
                <p className="ob-lead">Yapay zekâ koçu kullanacaksın. Verilerinin nereye gittiğini bilmen önemli.</p>
                <div className="ob-consents">
                  <label className="consent">
                    <input type="checkbox" checked={consents.age18} onChange={(e) => setConsents({ ...consents, age18: e.target.checked })} data-testid="ob-age" />
                    <span><strong>18 yaşından büyüğüm</strong><small>Yaş sınırı müşteri kararına bağlıdır.</small></span>
                  </label>
                  <label className="consent">
                    <input type="checkbox" checked={consents.privacy} onChange={(e) => setConsents({ ...consents, privacy: e.target.checked })} data-testid="ob-privacy" />
                    <span><strong>Aydınlatma metnini okudum</strong><small>Yer tutucu. Gerçek metni hukukçu hazırlayacak.</small></span>
                  </label>
                  <div className="consent consent--switch">
                    <span><strong>Mesajlarımın üçüncü taraf yapay zekâ sağlayıcısına gönderilmesine izin veriyorum</strong><small>İsteğe bağlı. Kapatırsan koç çalışmaz, plan ve odak çalışır. Prototipte hiçbir veri gönderilmez.</small></span>
                    <Switch checked={consents.thirdPartyAi} onChange={(v) => setConsents({ ...consents, thirdPartyAi: v })} label="Üçüncü taraf yapay zekâ izni" />
                  </div>
                </div>
              </>
            )}

            {step === 'alan' && (
              <>
                <CoachSays>
                  Merhaba {name}. Ben dijital koçunum, bir yapay zekâyım. Bu sohbet şimdilik <b>simülasyon</b>. Önce şunu seçelim:
                </CoachSays>
                <h1 className="ob-title">Hangi alanda <em>düzen</em> istiyorsun?</h1>
                <div className="area-list">
                  {(Object.keys(AREAS) as GoalArea[]).map((a, i) => (
                    <button
                      key={a}
                      type="button"
                      className="area"
                      aria-pressed={areas.includes(a)}
                      onClick={() => setAreas((v) => (v.includes(a) ? v.filter((x) => x !== a) : [...v, a]))}
                      data-testid={`ob-area-${a}`}
                    >
                      <span className="area__num num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="area__text"><strong>{AREAS[a].name}</strong><small>{AREAS[a].desc}</small></span>
                      <span className="area__check">{areas.includes(a) && <Check size={15} />}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'zorluk' && (
              <>
                <h1 className="ob-title">En çok neye <em>takılıyorsun?</em></h1>
                <p className="ob-lead">Dürüst ol. Planı buna göre hafifletiriz.</p>
                <div className="stack">
                  {STRUGGLES.map((s) => (
                    <button key={s.id} type="button" className="choice" aria-pressed={struggle === s.id} onClick={() => setStruggle(s.id)} data-testid={`ob-struggle-${s.id}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'hedef' && (
              <>
                <CoachSays>{struggle === 'belirsiz' ? 'Net olmaması sorun değil. Aklındaki en yakın cümleyi yaz, birlikte netleştirelim.' : 'Şimdi tek bir hedef seçelim. Sonra başkalarını da ekleyebilirsin.'}</CoachSays>
                <h1 className="ob-title">İlk hedefin <em>ne olsun?</em></h1>
                <Field label="Hedefin">
                  <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={GOAL_SUGGESTIONS[area][0]} data-testid="ob-goal" />
                </Field>
                <div className="option-row">
                  {areas.flatMap((a) => GOAL_SUGGESTIONS[a]).slice(0, 4).map((s) => (
                    <button key={s} type="button" className="quick-sug" onClick={() => setTitle(s)}>{s}</button>
                  ))}
                </div>
              </>
            )}

            {step === 'netlestir' && (
              <>
                <CoachSays>"{title}" güzel bir başlangıç. İki soruyla netleştirelim.</CoachSays>
                <Field label="Olduğunda neyi görünce &quot;başardım&quot; diyeceksin?">
                  <input className="input" value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="Örneğin: Üst üste dört hafta tamamlamak" data-testid="ob-metric" />
                </Field>
                <Field label="Bu neden önemli?">
                  <textarea className="input" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Zorlandığında sana bunu hatırlatacağız." data-testid="ob-why" />
                </Field>
                <div className="field">
                  <span className="field__label">Ne kadar sürede? Hedef tarih: {formatDayMonth(targetDate)}</span>
                  <div className="option-row">
                    {[4, 8, 12, 24].map((w) => (
                      <button key={w} type="button" className="option-chip" aria-pressed={weeks === w} onClick={() => setWeeks(w)}>{w} hafta</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 'ritim' && (
              <>
                <h1 className="ob-title">Ritmin <em>nasıl?</em></h1>
                <p className="ob-lead">Planı gerçek gününe göre kuralım.</p>
                <div className="field">
                  <span className="field__label">En verimli olduğun zaman</span>
                  <div className="option-row">
                    {([['sabah', 'Sabah'], ['oglen', 'Öğleden sonra'], ['aksam', 'Akşam']] as const).map(([v, l]) => (
                      <button key={v} type="button" className="option-chip" aria-pressed={workWindow === v} onClick={() => setWorkWindow(v)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="field__label">Bir günde gerçekçi olarak ayırabileceğin süre</span>
                  <div className="option-row">
                    {[30, 60, 90, 120].map((m) => (
                      <button key={m} type="button" className="option-chip" aria-pressed={dailyMinutes === m} onClick={() => setDailyMinutes(m)} data-testid={`ob-min-${m}`}>{m} dakika</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 'plan' && (
              <>
                <CoachSays>Sana {weeks} haftalık bir taslak hazırladım. Sen onaylamadan hiçbir görev oluşmaz.</CoachSays>
                <div className="ob-draft-head">
                  <h1 className="ob-title">Plan <em>taslağın</em></h1>
                  <SimBadge>Örnek şablon</SimBadge>
                </div>
                <div className="draft">
                  <span className="label label--muted">Kilometre taşları</span>
                  {milestones.map((m, i) => (
                    <div key={i} className="draft__row">
                      <span className="num draft__num">{String(i + 1).padStart(2, '0')}</span>
                      <input className="input" value={m} aria-label={`Kilometre taşı ${i + 1}`} onChange={(e) => setMilestones((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
                      <button type="button" className="icon-btn icon-btn--sm" aria-label="Kaldır" onClick={() => setMilestones((a) => a.filter((_, j) => j !== i))}><X size={15} /></button>
                    </div>
                  ))}
                  <span className="label label--muted" style={{ marginTop: 8 }}>İlk görevler</span>
                  {tasks.map((t, i) => (
                    <div key={i} className="draft__row">
                      <span className="draft__date">{i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : `${i}. gün`}</span>
                      <input className="input" value={t} aria-label={`Görev ${i + 1}`} onChange={(e) => setTasks((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
                      <button type="button" className="icon-btn icon-btn--sm" aria-label="Kaldır" onClick={() => setTasks((a) => a.filter((_, j) => j !== i))}><X size={15} /></button>
                    </div>
                  ))}
                  <button type="button" className="link-add" onClick={() => setTasks((a) => [...a, ''])}><Plus size={15} /> Görev ekle</button>
                </div>
              </>
            )}

            {step === 'yoldas' && (
              <>
                <h1 className="ob-title">Yolda sana kim <em>eşlik etsin?</em></h1>
                <p className="ob-lead">Çalıştıkça gelişir. Kaçırdığın günde üzülmez, cezalandırılmaz.</p>
                <div className="pet-pick">
                  {(Object.keys(SPECIES) as PetSpecies[]).map((s) => (
                    <button key={s} type="button" className="pet-opt" aria-pressed={species === s} onClick={() => setSpecies(s)} data-testid={`ob-pet-${s}`}>
                      <PetArt species={s} stage="yetiskin" mood="sakin" size={92} />
                      <strong>{SPECIES[s].name}</strong>
                      <small>{SPECIES[s].trait}</small>
                    </button>
                  ))}
                </div>
                <Field label="Adı ne olsun?">
                  <input className="input" value={petName} maxLength={18} onChange={(e) => setPetName(e.target.value)} placeholder="Örneğin: Kıvılcım" data-testid="ob-petname" />
                </Field>
              </>
            )}

            {step === 'ilk' && (
              <div className="ob-first">
                <h1 className="ob-title">İlk <em>iki dakikan</em></h1>
                <p className="ob-lead">{firstDone ? `${petName} dünyaya geldi. İlk adımını attın.` : `Şu küçük görevi yap. ${petName} seni bekliyor.`}</p>
                <div className="ob-first__stage">
                  <motion.div key={String(firstDone)} initial={firstDone ? { scale: 0.5, rotate: -6 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 13 }}>
                    <PetArt species={species} stage={firstDone ? 'yavru' : 'yumurta'} mood="neseli" size={180} progress={firstDone ? 1 : 0.7} />
                  </motion.div>
                </div>
                <button type="button" className={`first-task ${firstDone ? 'is-done' : ''}`} onClick={() => setFirstDone(true)} disabled={firstDone} data-testid="ob-first-task">
                  <span className="first-task__check">{firstDone && <Check size={16} />}</span>
                  <span>{firstTaskTitle}</span>
                  {firstDone && <b className="num">+10</b>}
                </button>
              </div>
            )}

            {step === 'bildirim' && (
              <>
                <h1 className="ob-title">Sana ne zaman <em>hatırlatayım?</em></h1>
                <p className="ob-lead">Az ve yerinde. Her türü dilediğin an kapatabilirsin.</p>
                <div className="field-row">
                  <Field label="Sabah planı"><input className="input" type="time" value={morning} onChange={(e) => setMorning(e.target.value)} /></Field>
                  <Field label="Akşam kapanışı"><input className="input" type="time" value={evening} onChange={(e) => setEvening(e.target.value)} /></Field>
                </div>
                <div className="notif-mock">
                  <span className="notif-mock__icon"><RibbonMark size={16} color="#60a4f1" /></span>
                  <div><strong>Gün kapanıyor</strong><small>Bugünkü planını tamamladın mı?</small></div>
                </div>
                <div className="stack">
                  <Button block variant={permission === 'verildi' ? 'secondary' : 'primary'} onClick={() => { setPermission('verildi'); }} data-testid="ob-notif-allow">
                    {permission === 'verildi' ? <><Check size={16} /> İzin verildi (simülasyon)</> : <><Bell size={16} /> Bildirimlere izin ver</>}
                  </Button>
                  <Button block variant="ghost" onClick={() => { setPermission('reddedildi'); next(); }}>Şimdilik atla, uygulama yine çalışır</Button>
                </div>
              </>
            )}

            {step === 'deneme' && (
              <div className="ob-trial">
                <SimBadge>Karar bekliyor: gelir modeli</SimBadge>
                <h1 className="ob-title">Tüm özellikler <em>14 gün</em> senin</h1>
                <ul className="trial-list">
                  <li><Check size={16} /> Koçla sürekli plan güncelleme</li>
                  <li><Check size={16} /> Haftalık koç yorumu ve aylık rapor</li>
                  <li><Check size={16} /> Tüm teknikler ve kozmetikler</li>
                </ul>
                <div className="trial-free">
                  <strong>Deneme bitince verilerin silinmez.</strong> Ücretsiz planda hedef, görev, odak ve yoldaşın çalışmaya devam eder.
                </div>
                <small className="ob-fine">Ödeme bilgisi istenmez. Fiyat ve paket sınırları örnektir.</small>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step !== 'hosgeldin' && (
          <div className="ob-foot">
            {step === 'deneme' ? (
              <Button block onClick={finish} data-testid="ob-finish">Uygulamaya gir <ArrowRight size={17} /></Button>
            ) : (
              <Button block disabled={!canNext} onClick={next} data-testid="ob-next">
                {step === 'plan' ? 'Onayla ve devam et' : 'Devam'} <ArrowRight size={17} />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
