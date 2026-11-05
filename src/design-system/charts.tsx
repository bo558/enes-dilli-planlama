import { useEffect, useState } from 'react';

/** Rapor grafikleri. Bağımlılık eklememek ve marka diline tam uymak için elle çizildi. */

/** Telefonda yazılar okunur kalsın diye grafik daha dar bir koordinat sistemiyle çizilir. */
function useChartWidth() {
  const query = '(max-width: 640px)';
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow ? 340 : 640;
}

export function AdherenceLine({
  points,
  target = 0.7,
  height = 190,
}: {
  points: { label: string; value: number; sub: string }[];
  target?: number;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = useChartWidth();
  const labelEvery = W < 400 && points.length > 5 ? 2 : 1;
  const pad = { l: 36, r: 16, t: 18, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length > 1 ? (i / (points.length - 1)) * iw : iw / 2);
  const y = (v: number) => pad.t + (1 - v) * ih;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.value)}`).join('');
  const area = `${path}L${x(points.length - 1)} ${pad.t + ih}L${x(0)} ${pad.t + ih}Z`;
  const active = hover ?? points.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label="Plana uyum grafiği" onMouseLeave={() => setHover(null)}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--faint)" fontWeight="600">
            %{t * 100}
          </text>
        </g>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke="var(--amber)" strokeDasharray="4 4" strokeWidth="1.5" />
      <text x={W - pad.r} y={y(target) - 6} textAnchor="end" fontSize="11" fill="var(--warm-ink)" fontWeight="700">
        Hedef %{target * 100}
      </text>
      <path d={area} fill="var(--blue)" opacity="0.08" />
      <path d={path} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.label}>
          <rect
            x={x(i) - iw / points.length / 2}
            y={pad.t}
            width={iw / points.length}
            height={ih + pad.b}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
          />
          <circle cx={x(i)} cy={y(p.value)} r={i === active ? 5.5 : 3.5} fill={i === active ? 'var(--blue)' : 'var(--surface)'} stroke="var(--blue)" strokeWidth="2" pointerEvents="none" />
          {(i === active || (points.length - 1 - i) % labelEvery === 0) && (
            <text x={x(i)} y={height - 8} textAnchor={i === points.length - 1 ? 'end' : 'middle'} fontSize="11" fill={i === active ? 'var(--heading)' : 'var(--faint)'} fontWeight={i === active ? 800 : 600} pointerEvents="none">
              {p.label}
            </text>
          )}
        </g>
      ))}
      <g pointerEvents="none" transform={`translate(${Math.min(Math.max(x(active), pad.l + 56), W - pad.r - 56)} ${Math.max(y(points[active]?.value ?? 0) - 16, 14)})`}>
        <text textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--heading)">
          %{Math.round((points[active]?.value ?? 0) * 100)}
        </text>
      </g>
    </svg>
  );
}

export function DayBars({
  days,
  height = 170,
}: {
  days: { label: string; planned: number; done: number; isToday?: boolean }[];
  height?: number;
}) {
  const W = useChartWidth();
  const pad = { t: 22, b: 26, x: 12 };
  const ih = height - pad.t - pad.b;
  const max = Math.max(4, ...days.map((d) => d.planned));
  const band = (W - pad.x * 2) / days.length;
  const bw = Math.min(44, band * 0.56);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label="Günlere göre planlanan ve tamamlanan görevler">
      <line x1={pad.x} x2={W - pad.x} y1={pad.t + ih} y2={pad.t + ih} stroke="var(--line-strong)" />
      {days.map((d, i) => {
        const cx = pad.x + band * i + band / 2;
        const ph = (d.planned / max) * ih;
        const dh = (d.done / max) * ih;
        return (
          <g key={`${d.label}-${i}`}>
            <title>{`${d.label}: ${d.done}/${d.planned} görev`}</title>
            <rect x={cx - bw / 2} y={pad.t + ih - ph} width={bw} height={ph} rx="6" fill="var(--surface-3)" />
            <rect x={cx - bw / 2} y={pad.t + ih - dh} width={bw} height={dh} rx="6" fill={d.isToday ? 'var(--amber)' : 'var(--blue)'} style={{ transition: 'all .5s var(--ease)' }} />
            {d.planned > 0 && (
              <text x={cx} y={pad.t + ih - ph - 6} textAnchor="middle" fontSize="11.5" fontWeight="800" fill="var(--heading)">
                {d.done}/{d.planned}
              </text>
            )}
            <text x={cx} y={height - 8} textAnchor="middle" fontSize="12" fontWeight={d.isToday ? 800 : 600} fill={d.isToday ? 'var(--heading)' : 'var(--muted)'}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Heatmap({
  grid,
  max,
  rowLabels,
  colLabels,
}: {
  grid: number[][];
  max: number;
  rowLabels: string[];
  colLabels: string[];
}) {
  return (
    <div className="heat" role="img" aria-label="Gün ve saat dilimine göre verimlilik">
      <div />
      {colLabels.map((c) => (
        <div key={c} className="heat__col">{c}</div>
      ))}
      {grid.map((row, r) => (
        <div key={rowLabels[r]} style={{ display: 'contents' }}>
          <div className="heat__row">{rowLabels[r]}</div>
          {row.map((v, c) => (
            <div
              key={c}
              className="heat__cell"
              title={`${colLabels[c]} ${rowLabels[r]}: ${v.toFixed(1)} birim`}
              style={{
                background: v === 0 ? 'var(--surface-2)' : `color-mix(in srgb, var(--blue) ${Math.round(16 + (v / max) * 84)}%, var(--surface))`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
