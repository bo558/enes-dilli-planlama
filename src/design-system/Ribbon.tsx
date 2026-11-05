/**
 * Ürünün imza öğesi. Enes Dilli Akademi logosundaki katlanmış "e" formunun
 * tek çizgilik karşılığıdır. İlerleme, şeridin içe doğru dolmasıyla gösterilir.
 */
export const RIBBON_PATH = 'M58 20H130A50 50 0 0 1 130 120H60A25 25 0 0 1 60 70H122A12 12 0 0 1 122 94H72';

export function Ribbon({
  value,
  size = 160,
  stroke = 17,
  track = 'var(--surface-3)',
  fill = 'var(--blue)',
  triangle = 'var(--amber)',
  duration = 0.8,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  track?: string;
  fill?: string;
  triangle?: string;
  duration?: number;
  label?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 200 140"
      role="img"
      aria-label={label ?? `İlerleme yüzde ${Math.round(v * 100)}`}
      style={{ overflow: 'visible' }}
    >
      <path d={RIBBON_PATH} className="ribbon__track" stroke={track} strokeWidth={stroke} />
      <path
        d={RIBBON_PATH}
        className="ribbon__fill"
        stroke={fill}
        strokeWidth={stroke}
        pathLength={100}
        strokeDasharray={`${v * 100} 200`}
        opacity={v > 0 ? 1 : 0}
        style={{ transition: `stroke-dasharray ${duration}s cubic-bezier(0.2, 0.7, 0.2, 1), opacity 0.2s` }}
      />
      <path d="M22 28 38 8 54 28Z" fill={triangle} strokeLinejoin="round" />
    </svg>
  );
}

/** Logo işareti: gezinti ve yükleme için statik form */
export function RibbonMark({ size = 26, color = 'var(--blue)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 200 140" aria-hidden="true">
      <path d={RIBBON_PATH} fill="none" stroke={color} strokeWidth={20} />
      <path d="M18 30 36 8 54 30Z" fill="var(--amber)" />
    </svg>
  );
}
