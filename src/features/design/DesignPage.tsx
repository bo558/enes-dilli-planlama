import { useState } from 'react';
import { PageHeader } from '@/app/AppShell';
import { STAGES, SPECIES } from '@/domain/gamification';
import type { PetMood, PetSpecies } from '@/domain/types';
import { Ribbon, RibbonMark } from '@/design-system/Ribbon';
import { Button, Field, Label, Progress, Segmented, SimBadge, Switch, Triangle } from '@/design-system/ui';
import { PetArt } from '@/features/pet/PetArt';
import { TaskCheck } from '@/features/tasks/TaskRow';
import './design.css';

const COLORS = [
  { name: 'Ink', hex: '#0C1522', use: 'Başlık, gezinti, güçlü yüzey' },
  { name: 'Marka mavisi', hex: '#2F7FE0', use: 'İlerleme, şerit' },
  { name: 'Eylem mavisi', hex: '#2670CC', use: 'Ana buton, odak' },
  { name: 'Amber', hex: '#F4B85E', use: 'Üçgen, puan, kutlama' },
  { name: 'Kâğıt', hex: '#F6F9FD', use: 'Zemin' },
  { name: 'Çizgi', hex: '#E3ECF8', use: 'Ayraç, kart kenarı' },
];

const MOODS: { value: PetMood; label: string }[] = [
  { value: 'neseli', label: 'Neşeli' },
  { value: 'sakin', label: 'Sakin' },
  { value: 'uykulu', label: 'Uykulu' },
];

export function DesignPage() {
  const [mood, setMood] = useState<PetMood>('sakin');
  const [on, setOn] = useState(true);
  const [done, setDone] = useState(false);
  const [ribbon, setRibbon] = useState(0.6);

  return (
    <div className="page ds">
      <PageHeader
        eyebrow="Tasarım sistemi"
        title={<>Düzen'in <em>görsel dili</em></>}
        sub="Renkler ve Manrope fontu enesdilliakademi.com sitesindeki değişkenlerden alındı. Şerit, logodaki katlanmış formdan türetildi."
      />

      <section className="card">
        <Label>Yoldaşlar: özgün origami çizimleri</Label>
        <div style={{ margin: '12px 0' }}>
          <Segmented<PetMood> value={mood} onChange={setMood} options={MOODS} ariaLabel="Ruh hali" />
        </div>
        <div className="ds-pets" data-testid="ds-pets">
          {(Object.keys(SPECIES) as PetSpecies[]).map((s) => (
            <div key={s} className="ds-pets__row">
              <strong>{SPECIES[s].name}</strong>
              <div className="ds-pets__stages">
                {STAGES.map((st) => (
                  <figure key={st.id}>
                    <PetArt species={s} stage={st.id} mood={mood} size={124} progress={0.8} />
                    <figcaption>{st.name}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="ds-grid">
        <section className="card">
          <Label>İlerleme şeridi</Label>
          <div className="ds-ribbon">
            <Ribbon value={ribbon} size={220} />
            <input type="range" className="range" min={0} max={100} value={ribbon * 100} onChange={(e) => setRibbon(Number(e.target.value) / 100)} aria-label="Şerit değeri" />
          </div>
        </section>
        <section className="card">
          <Label>Renkler</Label>
          <ul className="ds-colors">
            {COLORS.map((c) => (
              <li key={c.hex}>
                <span style={{ background: c.hex }} />
                <div><strong>{c.name}</strong><small>{c.hex} · {c.use}</small></div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card ds-type">
          <Label>Tipografi: Manrope</Label>
          <h1 className="page-title">Başlık <em>iki tonlu</em></h1>
          <h3>Bölüm başlığı</h3>
          <p>Gövde metni sakin, somut ve "sen" diliyle yazılır. Motivasyon konuşması değil, sistem kuran bir danışman tonu.</p>
          <small style={{ color: 'var(--muted)' }}>İkincil metin ve açıklamalar</small>
        </section>
        <section className="card ds-comp">
          <Label>Bileşenler</Label>
          <div className="option-row">
            <Button>Ana eylem</Button>
            <Button variant="dark">Koyu</Button>
            <Button variant="warm">Kazanım</Button>
            <Button variant="secondary">İkincil</Button>
            <Button variant="ghost">Sessiz</Button>
          </div>
          <div className="option-row" style={{ alignItems: 'center' }}>
            <TaskCheck done={done} onToggle={() => setDone(!done)} label="Örnek görev" />
            <Switch checked={on} onChange={setOn} label="Örnek anahtar" />
            <span className="chip chip--accent">Etiket</span>
            <span className="chip chip--warm">Puan</span>
            <SimBadge />
            <Triangle size={14} />
            <RibbonMark size={28} />
          </div>
          <Progress value={0.6} label="Örnek" />
          <Field label="Alan"><input className="input" placeholder="Örnek giriş" /></Field>
        </section>
      </div>
    </div>
  );
}
