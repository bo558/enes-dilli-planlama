import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, PlanTabs } from '@/app/AppShell';
import { AREAS } from '@/domain/catalog';
import { diffDays, formatDayMonth } from '@/domain/dates';
import { goalProgress, nextMilestone } from '@/domain/stats';
import { Ribbon } from '@/design-system/Ribbon';
import { Button, EmptyState } from '@/design-system/ui';
import { useApp, useToday } from '@/store/app';
import './goals.css';

export function GoalsPage() {
  const goals = useApp((s) => s.goals);
  const tasks = useApp((s) => s.tasks);
  const today = useToday();
  const navigate = useNavigate();
  const active = goals.filter((g) => !g.doneOn);
  const done = goals.filter((g) => g.doneOn);

  return (
    <div className="page">
      <PlanTabs />
      <PageHeader
        eyebrow="Hedefler"
        title={<><em>{active.length} hedef</em> üzerinde çalışıyorsun</>}
        sub="Her hedef kilometre taşlarına, her kilometre taşı günlük görevlere bölünür."
        actions={<Button onClick={() => navigate('/hedefler/yeni')} data-testid="goal-new"><Plus size={17} /> Yeni hedef</Button>}
      />

      <div className="goal-grid" data-testid="goal-grid">
        {active.map((g, i) => {
          const pct = goalProgress(g, tasks);
          const nm = nextMilestone(g);
          const left = diffDays(g.targetDate, today);
          const openCount = tasks.filter((t) => t.goalId === g.id && !t.doneOn).length;
          return (
            <Link key={g.id} to={`/hedefler/${g.id}`} className="goal-card" data-testid="goal-card" style={{ '--area': AREAS[g.area].color } as React.CSSProperties}>
              <div className="goal-card__top">
                <span className="goal-card__num num">{String(i + 1).padStart(2, '0')}</span>
                <span className="chip"><span className="dot" style={{ background: AREAS[g.area].color }} />{AREAS[g.area].short}</span>
              </div>
              <h3>{g.title}</h3>
              <div className="goal-card__ribbon">
                <Ribbon value={pct} size={92} stroke={20} fill={AREAS[g.area].color} label={`İlerleme yüzde ${Math.round(pct * 100)}`} />
                <div>
                  <strong className="num">%{Math.round(pct * 100)}</strong>
                  <span>{openCount} açık görev</span>
                </div>
              </div>
              <div className="goal-card__foot">
                <span>{nm ? <>Sıradaki: <b>{nm.title}</b></> : 'Tüm kilometre taşları bitti'}</span>
                <span className={left < 7 ? 'goal-card__soon' : ''}>
                  {left >= 0 ? `${left} gün kaldı · ${formatDayMonth(g.targetDate)}` : `Tarih ${-left} gün geçti`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {active.length === 0 && (
        <div className="card">
          <EmptyState title="Henüz aktif hedefin yok" action={<Button onClick={() => navigate('/hedefler/yeni')}>İlk hedefini oluştur</Button>}>
            Küçük de olsa net bir hedefle başla.
          </EmptyState>
        </div>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="section-title" style={{ marginBottom: 10 }}>Tamamlananlar</h2>
          <div className="goal-done">
            {done.map((g) => (
              <Link key={g.id} to={`/hedefler/${g.id}`} className="goal-done__item">
                <span>{g.title}</span>
                <small>{formatDayMonth(g.doneOn!)}</small>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
