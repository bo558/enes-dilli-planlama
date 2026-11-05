import { ArrowLeft, ArrowRight, Check, Plus, Wand2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AREAS, GOAL_SUGGESTIONS, PLAN_TEMPLATES } from '@/domain/catalog';
import { addDays, formatDayMonth } from '@/domain/dates';
import type { GoalArea, ISODate } from '@/domain/types';
import { Button, Field, SimBadge } from '@/design-system/ui';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import './goals.css';

const STEPS = ['Hedef', 'Neden', 'Tarih', 'Kilometre taşları', 'İlk görevler'];

export function GoalWizardPage() {
  const today = useToday();
  const addGoal = useApp((s) => s.addGoal);
  const pushToast = useUi((s) => s.pushToast);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [area, setArea] = useState<GoalArea>('planlama');
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [target, setTarget] = useState<ISODate>(addDays(today, 56));
  const [milestones, setMilestones] = useState<{ title: string; dueDate: ISODate | null }[]>([]);
  const [tasks, setTasks] = useState<{ title: string; date: ISODate | null; estimateMin: number }[]>([]);

  const vague = title.trim().length > 0 && title.trim().split(/\s+/).length < 3;

  const suggestMilestones = () => {
    const span = Math.max(7, Math.round((new Date(target).getTime() - new Date(today).getTime()) / 86_400_000));
    const list = PLAN_TEMPLATES[area].milestones;
    setMilestones(list.map((t, i) => ({ title: t, dueDate: addDays(today, Math.round((span / list.length) * (i + 1))) })));
  };
  const suggestTasks = () => {
    setTasks(PLAN_TEMPLATES[area].tasks.map((t, i) => ({ title: t, date: addDays(today, i), estimateMin: 25 })));
  };

  const canNext = step === 0 ? title.trim().length > 2 : step === 2 ? !!target : true;

  const finish = () => {
    const id = addGoal({
      title: title.trim(),
      why: why.trim(),
      area,
      targetDate: target,
      milestones: milestones.filter((m) => m.title.trim()),
      tasks: tasks.filter((t) => t.title.trim()),
    });
    pushToast({ text: 'Hedefin oluşturuldu', tone: 'basari' });
    navigate(`/hedefler/${id}`, { replace: true });
  };

  return (
    <div className="page page--narrow wizard">
      <Link to="/hedefler" className="back-link"><ArrowLeft size={16} /> Hedefler</Link>
      <header>
        <span className="label">Yeni hedef</span>
        <ol className="stepper" aria-label="Adımlar">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'is-current' : i < step ? 'is-done' : ''}>
              <span className="stepper__num num">{i < step ? <Check size={13} /> : String(i + 1).padStart(2, '0')}</span>
              <span className="stepper__label">{s}</span>
            </li>
          ))}
        </ol>
      </header>

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          className="card wizard__card"
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.18 }}
        >
          {step === 0 && (
            <>
              <h2>Neyi başarmak <em>istiyorsun?</em></h2>
              <div className="option-row" role="group" aria-label="Alan">
                {(Object.keys(AREAS) as GoalArea[]).map((a) => (
                  <button key={a} type="button" className="option-chip" aria-pressed={area === a} onClick={() => setArea(a)}>
                    <span className="dot" style={{ background: AREAS[a].color }} />{AREAS[a].short}
                  </button>
                ))}
              </div>
              <Field label="Hedefin" hint="Bir cümleyle, sonucu anlatacak şekilde yaz.">
                <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örneğin: Haftada 3 gün düzenli hareket etmek" data-testid="wizard-title" />
              </Field>
              {vague && <div className="wizard__tip">Biraz daha açar mısın? "Spor" yerine "Haftada 3 gün 30 dakika yürümek" gibi ölçülebilir olursa plan daha iyi çıkar.</div>}
              <div>
                <span className="field__label">Örnekler</span>
                <div className="option-row" style={{ marginTop: 6 }}>
                  {GOAL_SUGGESTIONS[area].map((s) => (
                    <button key={s} type="button" className="quick-sug" onClick={() => setTitle(s)}>{s}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2>Bu neden <em>önemli?</em></h2>
              <p className="wizard__lead">Zorlandığın günlerde bu cümleyi sana hatırlatacağız. İstersen boş bırakabilirsin.</p>
              <Field label="Nedenin">
                <textarea className="input" autoFocus value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Bu hedefe ulaşınca hayatında ne değişecek?" data-testid="wizard-why" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Ne zamana kadar <em>olsun?</em></h2>
              <div className="option-row">
                {[{ l: '4 hafta', d: 28 }, { l: '8 hafta', d: 56 }, { l: '3 ay', d: 90 }, { l: '6 ay', d: 180 }].map((o) => (
                  <button key={o.l} type="button" className="option-chip" aria-pressed={target === addDays(today, o.d)} onClick={() => setTarget(addDays(today, o.d))}>{o.l}</button>
                ))}
              </div>
              <Field label="Hedef tarih" hint={target ? formatDayMonth(target) : undefined}>
                <input className="input" type="date" min={today} value={target} onChange={(e) => setTarget(e.target.value)} data-testid="wizard-date" />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <div className="wizard__row">
                <h2>Yolu <em>parçalara</em> ayır</h2>
                <Button size="sm" variant="secondary" onClick={suggestMilestones} data-testid="wizard-suggest-ms"><Wand2 size={14} /> Koçtan öneri al</Button>
              </div>
              {milestones.length > 0 && <div className="wizard__sim"><SimBadge>Örnek şablon</SimBadge> Önerileri düzenleyebilirsin.</div>}
              <div className="wizard__items">
                {milestones.map((m, i) => (
                  <div key={i} className="wizard__item">
                    <span className="stepper__num num">{String(i + 1).padStart(2, '0')}</span>
                    <input className="input" value={m.title} aria-label={`Kilometre taşı ${i + 1}`} onChange={(e) => setMilestones((a) => a.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                    <input className="input wizard__date" type="date" value={m.dueDate ?? ''} aria-label="Tarih" onChange={(e) => setMilestones((a) => a.map((x, j) => (j === i ? { ...x, dueDate: e.target.value || null } : x)))} />
                    <button type="button" className="icon-btn icon-btn--sm" aria-label="Kaldır" onClick={() => setMilestones((a) => a.filter((_, j) => j !== i))}><X size={15} /></button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setMilestones((a) => [...a, { title: '', dueDate: null }])}><Plus size={16} /> Kilometre taşı ekle</Button>
            </>
          )}

          {step === 4 && (
            <>
              <div className="wizard__row">
                <h2>İlk <em>adımlar</em></h2>
                <Button size="sm" variant="secondary" onClick={suggestTasks} data-testid="wizard-suggest-tasks"><Wand2 size={14} /> Koçtan öneri al</Button>
              </div>
              <p className="wizard__lead">Tarih verdiğin görevler takvime ve Bugün ekranına düşer.</p>
              <div className="wizard__items">
                {tasks.map((t, i) => (
                  <div key={i} className="wizard__item">
                    <span className="stepper__num num">{String(i + 1).padStart(2, '0')}</span>
                    <input className="input" value={t.title} aria-label={`Görev ${i + 1}`} onChange={(e) => setTasks((a) => a.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                    <input className="input wizard__date" type="date" value={t.date ?? ''} aria-label="Tarih" onChange={(e) => setTasks((a) => a.map((x, j) => (j === i ? { ...x, date: e.target.value || null } : x)))} />
                    <button type="button" className="icon-btn icon-btn--sm" aria-label="Kaldır" onClick={() => setTasks((a) => a.filter((_, j) => j !== i))}><X size={15} /></button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setTasks((a) => [...a, { title: '', date: today, estimateMin: 25 }])}><Plus size={16} /> Görev ekle</Button>
            </>
          )}
        </motion.section>
      </AnimatePresence>

      <div className="wizard__nav">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft size={16} /> Geri</Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)} data-testid="wizard-next">Devam <ArrowRight size={16} /></Button>
        ) : (
          <Button onClick={finish} data-testid="wizard-finish"><Check size={16} /> Hedefi oluştur</Button>
        )}
      </div>
    </div>
  );
}
