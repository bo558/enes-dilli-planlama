import { Check, Lock, Pencil } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/app/AppShell';
import { formatDayMonthShort, relativeDay, startOfWeek } from '@/domain/dates';
import {
  achievementsFor,
  COSMETICS,
  isCosmeticUnlocked,
  levelFor,
  levelProgress,
  MOOD_LINE,
  nextStage,
  SPECIES,
  stageFor,
  stageProgress,
  STAGES,
  XP_RULES,
} from '@/domain/gamification';
import { activeDaysInWeek } from '@/domain/stats';
import type { PetSpecies } from '@/domain/types';
import { Button, Field, Progress, Segmented, Sheet, Switch, Triangle } from '@/design-system/ui';
import { useApp, useToday } from '@/store/app';
import { useUi } from '@/store/ui';
import { PetArt } from './PetArt';
import { PetStage, usePetMood } from './PetStage';
import './pet.css';

type Tab = 'gelisim' | 'oduller' | 'basarilar' | 'puan';

const RULES = [
  { label: XP_RULES.gorev.label, value: `+${XP_RULES.gorev.amount}`, cap: 'Günde en fazla 5 görev' },
  { label: XP_RULES.odak.label, value: `+${XP_RULES.odak.amount}`, cap: `Günde en fazla ${XP_RULES.odak.dailyCap}` },
  { label: XP_RULES.kapanis.label, value: `+${XP_RULES.kapanis.amount}`, cap: 'Günde 1 kez' },
  { label: XP_RULES.yenidenPlan.label, value: `+${XP_RULES.yenidenPlan.amount}`, cap: 'Görev başına 1 kez' },
  { label: XP_RULES.haftalik.label, value: `+${XP_RULES.haftalik.amount}`, cap: 'Haftada 1 kez' },
  { label: XP_RULES.kilometre.label, value: `+${XP_RULES.kilometre.amount}`, cap: 'Taş başına 1 kez' },
];

export function PetPage() {
  const data = useApp();
  const { pet, setPetName, setPetSpecies, togglePlainMode, toggleEquip, setBackdrop } = data;
  const today = useToday();
  const mood = usePetMood();
  const pushToast = useUi((s) => s.pushToast);
  const [tab, setTab] = useState<Tab>('gelisim');
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(pet.name);
  const stage = stageFor(pet.xp);
  const next = nextStage(pet.xp);
  const weekActive = activeDaysInWeek(data, startOfWeek(today)).length;
  const achievements = achievementsFor(data, weekActive);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Yoldaşın"
        title={<>{pet.name || 'Yoldaşın'} <em>seninle büyüyor</em></>}
        sub="Ceza yok. Bir günü kaçırmak gelişimi silmez; geri dönmek ve yeniden planlamak da sayılır."
      />

      <section className="pet-hero" data-testid="pet-hero">
        <div className="pet-hero__stage">
          <PetStage size={230} height={300} />
        </div>
        <div className="pet-hero__info">
          <div className="pet-hero__name">
            <h2>{pet.name || 'Yoldaşın'}</h2>
            <button type="button" className="icon-btn icon-btn--sm" aria-label="Düzenle" onClick={() => { setName(pet.name); setEditOpen(true); }}>
              <Pencil size={15} />
            </button>
          </div>
          <p className="pet-hero__line">{SPECIES[pet.species].name} · {stage.name} · {MOOD_LINE[mood]}</p>

          <div className="pet-meter">
            <div className="pet-meter__top">
              <span className="pet-level num">{levelFor(pet.xp)}. seviye</span>
              <span className="num" data-testid="pet-page-xp">{pet.xp} puan</span>
            </div>
            <Progress value={levelProgress(pet.xp)} tone="warm" label="Seviye ilerlemesi" />
            <small className="num">Sonraki seviyeye {100 - pet.xp % 100} puan</small>
          </div>

          {next && (
            <div className="pet-next">
              <span className="pet-next__art"><PetArt species={pet.species} stage={next.id} size={56} /></span>
              <div>
                <strong>Sıradaki aşama: {next.name}</strong>
                <Progress value={stageProgress(pet.xp)} thin label="Sonraki aşama" />
                <small className="num">{next.xp - pet.xp} puan kaldı. Hedef süre: {next.targetDay}</small>
              </div>
            </div>
          )}

          <div className="setting-row" style={{ borderBottom: 0, paddingBottom: 0 }}>
            <div>
              <div className="setting-row__title">Sade görünüm</div>
              <div className="setting-row__desc">Yoldaş yerine yalnızca ilerleme şeridini göster.</div>
            </div>
            <Switch checked={pet.plainMode} onChange={togglePlainMode} label="Sade görünüm" />
          </div>
        </div>
      </section>

      <Segmented<Tab>
        block
        ariaLabel="Yoldaş bölümleri"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'gelisim', label: 'Gelişim' },
          { value: 'oduller', label: 'Ödüller' },
          { value: 'basarilar', label: 'Başarılar' },
          { value: 'puan', label: 'Puan' },
        ]}
      />

      {tab === 'gelisim' && (
        <section className="stages" data-testid="stages">
          {STAGES.map((s) => {
            const reached = pet.xp >= s.xp;
            const current = stage.id === s.id;
            return (
              <div key={s.id} className={`stage-node ${reached ? 'is-reached' : ''} ${current ? 'is-current' : ''}`}>
                <div className="stage-node__art">
                  <PetArt species={pet.species} stage={s.id} size={92} equipped={reached ? pet.equipped : []} mood="sakin" />
                </div>
                <strong>{s.name}</strong>
                <small className="num">{s.xp} puan · {s.targetDay}</small>
                <span className="stage-node__reward">{reached ? <Check size={13} /> : <Lock size={12} />} {s.reward}</span>
                {s.v11 && <span className="chip chip--outline" style={{ marginTop: 4 }}>v1.1</span>}
              </div>
            );
          })}
        </section>
      )}

      {tab === 'oduller' && (
        <section className="cosmetics" data-testid="cosmetics">
          {COSMETICS.map((c) => {
            const unlocked = isCosmeticUnlocked(c, data, achievements);
            const on = c.kind === 'zemin' ? pet.backdrop === c.id : pet.equipped.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`cosmetic ${on ? 'is-on' : ''}`}
                disabled={!unlocked}
                aria-pressed={on}
                onClick={() => (c.kind === 'zemin' ? setBackdrop(c.id) : toggleEquip(c.id))}
                data-testid={`cosmetic-${c.id}`}
              >
                <span className={`cosmetic__preview ${c.kind === 'zemin' ? `pet-stage--${c.id}` : ''}`}>
                  {c.kind === 'aksesuar' ? (
                    <PetArt species={pet.species} stage={stage.id === 'yumurta' ? 'genc' : stage.id} equipped={[c.id]} size={74} />
                  ) : (
                    <Triangle size={18} />
                  )}
                </span>
                <strong>{c.name}</strong>
                <small>{unlocked ? (on ? 'Kullanılıyor' : 'Kullan') : c.hint}</small>
                {!unlocked && <Lock size={14} className="cosmetic__lock" />}
              </button>
            );
          })}
        </section>
      )}

      {tab === 'basarilar' && (
        <section className="achv" data-testid="achievements">
          {achievements.map((a) => (
            <div key={a.id} className={`achv__item ${a.done ? 'is-done' : ''}`}>
              <span className="achv__icon"><Triangle size={18} color={a.done ? 'var(--amber)' : 'var(--line-strong)'} filled={a.done} /></span>
              <div>
                <strong>{a.name}</strong>
                <small>{a.desc}</small>
              </div>
              {a.progress && !a.done && <span className="chip num">{a.progress}</span>}
              {a.done && <Check size={17} style={{ color: 'var(--good)' }} />}
            </div>
          ))}
        </section>
      )}

      {tab === 'puan' && (
        <div className="xp-grid">
          <section className="card">
            <div className="card__title" style={{ marginBottom: 10 }}>Puan nasıl kazanılır?</div>
            <ul className="rules">
              {RULES.map((r) => (
                <li key={r.label}>
                  <span>
                    <strong>{r.label}</strong>
                    <small>{r.cap}</small>
                  </span>
                  <b className="num">{r.value}</b>
                </li>
              ))}
            </ul>
            <p className="rules-note">Günlük sınırlar puanı anlamlı tutar. Sıralama olmadığı için kimseyle yarışmazsın.</p>
          </section>
          <section className="card">
            <div className="card__title" style={{ marginBottom: 10 }}>Son kazanımlar</div>
            <ul className="xp-log" data-testid="xp-log">
              {data.xpEvents.slice(0, 12).map((e) => (
                <li key={e.id}>
                  <span>
                    <strong>{e.label}</strong>
                    <small>{relativeDay(e.date, today)} · {formatDayMonthShort(e.date)}</small>
                  </span>
                  <b className="num">+{e.amount}</b>
                </li>
              ))}
              {data.xpEvents.length === 0 && <li style={{ color: 'var(--muted)' }}>Henüz puan yok.</li>}
            </ul>
          </section>
        </div>
      )}

      <Sheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Yoldaşını düzenle"
        footer={
          <Button
            onClick={() => {
              if (name.trim()) setPetName(name.trim());
              setEditOpen(false);
              pushToast({ text: 'Kaydedildi', tone: 'basari' });
            }}
          >
            Kaydet
          </Button>
        }
      >
        <Field label="İsim"><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={18} /></Field>
        <div className="field">
          <span className="field__label">Tür</span>
          <div className="species-row">
            {(Object.keys(SPECIES) as PetSpecies[]).map((s) => (
              <button key={s} type="button" className="species" aria-pressed={pet.species === s} onClick={() => setPetSpecies(s)}>
                <PetArt species={s} stage={stage.id === 'yumurta' ? 'yavru' : stage.id} size={68} equipped={[]} />
                <strong>{SPECIES[s].name}</strong>
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
