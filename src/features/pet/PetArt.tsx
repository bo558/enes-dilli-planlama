import type { PetMood, PetSpecies, StageId } from '@/domain/types';

/**
 * Özgün origami yoldaşlar. Katlanmış kâğıt dili, logodaki katlanmış şerit ve
 * üçgen ile aynı görsel aileden gelir. Bütün çizimler bu projeye özeldir.
 */

const INK = '#0c1522';

const P = {
  tilki: { base: '#e8963a', dark: '#c4701c', light: '#f4b85e', pale: '#fdf0da', ink: INK },
  baykus: { base: '#2f7fe0', dark: '#1f5fb0', light: '#60a4f1', pale: '#dce9ff', ink: INK },
  turna: { base: '#3b5070', dark: '#2a3d5c', deep: '#1e2f4a', light: '#6d84a8', pale: '#f4f7fc', ink: INK },
};

const poly = (points: string, fill: string) => <polygon points={points} fill={fill} />;

function Eye({ cx, cy, r = 5, mood }: { cx: number; cy: number; r?: number; mood: PetMood }) {
  if (mood === 'neseli') {
    return <path d={`M${cx - r} ${cy + 1}Q${cx} ${cy - r * 1.3} ${cx + r} ${cy + 1}`} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />;
  }
  if (mood === 'uykulu') {
    return <path d={`M${cx - r} ${cy}H${cx + r}`} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />;
  }
  return (
    <g style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box', animation: 'blink 5.2s infinite' }}>
      <circle cx={cx} cy={cy} r={r * 0.82} fill={INK} />
      <circle cx={cx + r * 0.28} cy={cy - r * 0.28} r={r * 0.24} fill="#fff" />
    </g>
  );
}

function Egg({ species, progress }: { species: PetSpecies; progress: number }) {
  const c = P[species];
  const a = c.light;
  const b = c.base;
  const d = c.dark;
  return (
    <g>
      <ellipse cx="100" cy="176" rx="44" ry="6" fill={INK} opacity="0.08" />
      {poly('100,36 64,78 100,100', a)}
      {poly('100,36 136,78 100,100', b)}
      {poly('64,78 54,124 100,100', b)}
      {poly('136,78 146,124 100,100', d)}
      {poly('54,124 76,172 100,100', a)}
      {poly('146,124 124,172 100,100', b)}
      {poly('76,172 124,172 100,100', d)}
      {progress > 0.5 && (
        <path d="M78 90l10 10 8-11 10 12 9-9" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" opacity="0.65" />
      )}
    </g>
  );
}

const STAGE_SCALE: Record<Exclude<StageId, 'yumurta'>, { body: number; head: number; limb: number }> = {
  yavru: { body: 0.58, head: 0.92, limb: 0.4 },
  genc: { body: 0.82, head: 0.9, limb: 0.74 },
  yetiskin: { body: 1, head: 1, limb: 1 },
  usta: { body: 1, head: 1, limb: 1.08 },
};

function Scarf({ y = 110, width = 42, warm }: { y?: number; width?: number; warm?: boolean }) {
  const x0 = 100 - width / 2;
  const x1 = 100 + width / 2;
  return (
    <g>
      <polygon points={`${x0},${y} ${x1},${y} ${x1 + 3},${y + 12} ${x0 - 3},${y + 12}`} fill={warm ? '#f4b85e' : '#2670cc'} />
      <polygon points={`${x0 + 8},${y + 10} ${x0 + 22},${y + 10} ${x0 + 18},${y + 34} ${x0 + 6},${y + 30}`} fill={warm ? '#c98a26' : '#1f5fb0'} />
    </g>
  );
}

function Medal({ cx = 100, cy = 142 }: { cx?: number; cy?: number }) {
  return (
    <g>
      <polygon points={`${cx - 7},${cy - 18} ${cx + 7},${cy - 18} ${cx + 3},${cy - 5} ${cx - 3},${cy - 5}`} fill="#2f7fe0" />
      <circle cx={cx} cy={cy} r="8" fill="#f4b85e" stroke="#c98a26" strokeWidth="1.5" />
      <polygon points={`${cx},${cy - 4} ${cx + 4},${cy + 3} ${cx - 4},${cy + 3}`} fill="#8a5d12" />
    </g>
  );
}

function Glasses({ lx, rx, y, r = 10 }: { lx: number; rx: number; y: number; r?: number }) {
  return (
    <g fill="none" stroke={INK} strokeWidth="2.2">
      <circle cx={lx} cy={y} r={r} />
      <circle cx={rx} cy={y} r={r} />
      <path d={`M${lx + r} ${y}H${rx - r}`} />
    </g>
  );
}

const Crest = () => (
  <g>
    <polygon points="100,0 108,16 92,16" fill="#f4b85e" />
    <polygon points="78,10 84,24 70,22" fill="#f4b85e" opacity="0.85" />
    <polygon points="122,10 130,22 116,24" fill="#f4b85e" opacity="0.85" />
  </g>
);

function Fox({ stage, mood, equipped }: { stage: Exclude<StageId, 'yumurta'>; mood: PetMood; equipped: string[] }) {
  const c = P.tilki;
  const s = STAGE_SCALE[stage];
  const neckY = 178 - 70 * s.body;
  return (
    <g>
      <ellipse cx="102" cy="178" rx={46 + s.limb * 18} ry="6" fill={INK} opacity="0.09" />
      {/* Kuyruk */}
      <g transform={`translate(130 174) scale(${s.limb}) translate(-130 -174)`}>
        {poly('128,174 188,108 168,154', c.base)}
        {poly('128,174 168,154 176,182', c.dark)}
        {poly('188,108 168,154 180,128', c.pale)}
      </g>
      {/* Gövde */}
      <g transform={`translate(100 178) scale(${s.body}) translate(-100 -178)`}>
        {poly('66,178 100,178 100,104 80,104', c.dark)}
        {poly('134,178 100,178 100,104 120,104', c.base)}
        {poly('84,106 116,106 110,138 100,152 90,138', c.pale)}
        {poly('74,178 97,178 95,167 77,167', c.pale)}
        {poly('126,178 103,178 105,167 123,167', '#fff8ec')}
        {equipped.includes('madalya') && <Medal cy={140} />}
        {equipped.includes('atki') && <Scarf y={102} width={48} />}
      </g>
      {/* Baş */}
      <g transform={`translate(100 ${neckY}) scale(${s.head}) translate(-100 -112)`}>
        {stage === 'usta' && <g transform="translate(0 -6)"><Crest /></g>}
        {poly('64,58 58,18 92,56', c.dark)}
        {poly('136,58 142,18 108,56', c.base)}
        {poly('68,54 64,32 82,54', c.pale)}
        {poly('132,54 136,32 118,54', c.pale)}
        {poly('64,56 100,52 100,120 52,80', c.base)}
        {poly('136,56 100,52 100,120 148,80', c.light)}
        {poly('60,84 100,120 100,92', c.pale)}
        {poly('140,84 100,120 100,92', '#fff8ec')}
        {poly('93,106 107,106 100,116', INK)}
        <Eye cx={80} cy={80} r={6} mood={mood} />
        <Eye cx={120} cy={80} r={6} mood={mood} />
        {equipped.includes('gozluk') && <Glasses lx={80} rx={120} y={80} r={12} />}
      </g>
    </g>
  );
}

function Owl({ stage, mood, equipped }: { stage: Exclude<StageId, 'yumurta'>; mood: PetMood; equipped: string[] }) {
  const c = P.baykus;
  const s = STAGE_SCALE[stage];
  const neckY = 178 - 84 * s.body;
  return (
    <g>
      <ellipse cx="100" cy="178" rx={42 + s.limb * 16} ry="6" fill={INK} opacity="0.09" />
      <g transform={`translate(100 178) scale(${s.body}) translate(-100 -178)`}>
        {/* Kanatlar */}
        <g transform={`translate(58 110) scale(${s.limb}) translate(-58 -110)`}>
          {poly('62,96 36,146 62,164', c.dark)}
        </g>
        <g transform={`translate(142 110) scale(${s.limb}) translate(-142 -110)`}>
          {poly('138,96 164,146 138,164', c.base)}
        </g>
        {poly('60,92 100,92 100,178 74,178 54,136', c.base)}
        {poly('140,92 100,92 100,178 126,178 146,136', c.light)}
        {poly('76,108 124,108 112,166 88,166', c.pale)}
        {/* Göğüs kıvrımları */}
        <path d="M84 122l8 7 8-7 8 7 8-7M88 138l6 6 6-6 6 6 6-6" fill="none" stroke={c.dark} strokeWidth="2" opacity="0.55" />
        {poly('84,178 92,170 100,178', '#f4b85e')}
        {poly('116,178 108,170 100,178', '#f4b85e')}
        {equipped.includes('madalya') && <Medal cy={146} />}
        {equipped.includes('atki') && <Scarf y={92} width={62} warm />}
      </g>
      <g transform={`translate(100 ${neckY}) scale(${s.head}) translate(-100 -98)`}>
        {stage === 'usta' && <g transform="translate(0 -14)"><Crest /></g>}
        {poly('60,40 50,10 88,38', c.dark)}
        {poly('140,40 150,10 112,38', c.base)}
        {poly('60,38 100,34 100,104 44,74', c.base)}
        {poly('140,38 100,34 100,104 156,74', c.light)}
        <circle cx="77" cy="68" r="18" fill={c.pale} />
        <circle cx="123" cy="68" r="18" fill="#fff" />
        {poly('92,76 108,76 100,92', '#f4b85e')}
        <Eye cx={77} cy={68} r={7.5} mood={mood} />
        <Eye cx={123} cy={68} r={7.5} mood={mood} />
        {equipped.includes('gozluk') && <Glasses lx={77} rx={123} y={68} r={19} />}
      </g>
    </g>
  );
}

function Crane({ stage, mood, equipped }: { stage: Exclude<StageId, 'yumurta'>; mood: PetMood; equipped: string[] }) {
  const c = P.turna;
  const s = STAGE_SCALE[stage];
  const scale = 0.64 + (s.body - 0.58) * 0.86;
  return (
    <g transform={`translate(104 178) scale(${scale}) translate(-104 -178)`}>
      <ellipse cx="108" cy="178" rx="56" ry="6" fill={INK} opacity="0.1" />
      {/* Arka kanat */}
      <g transform={`translate(108 122) scale(${s.limb}) translate(-108 -122)`}>
        {poly('96,122 122,118 74,26', c.deep)}
        {poly('96,122 74,26 82,92', c.dark)}
      </g>
      {/* Kuyruk */}
      {poly('124,128 140,140 192,62 184,54', c.deep)}
      {poly('184,54 192,62 196,48', c.pale)}
      {/* Gövde */}
      {poly('66,142 108,112 108,176', c.base)}
      {poly('150,142 108,112 108,176', c.deep)}
      {poly('84,150 108,176 132,150 108,160', c.light)}
      {/* Boyun ve baş */}
      {poly('80,138 94,126 44,58 30,64', c.light)}
      {poly('44,58 32,42 20,50 30,64', c.pale)}
      {poly('20,50 30,64 2,62', '#f4b85e')}
      {poly('32,42 44,58 48,42', '#f4b85e')}
      {/* Ön kanat */}
      <g transform={`translate(112 126) scale(${s.limb}) translate(-112 -126)`}>
        {poly('104,126 148,126 142,20', c.base)}
        {poly('104,126 142,20 124,92', c.light)}
      </g>
      {stage === 'usta' && <g transform="translate(-66 8)"><Crest /></g>}
      <Eye cx={31} cy={52} r={3.6} mood={mood} />
      {equipped.includes('gozluk') && <circle cx={31} cy={52} r={7.5} fill="none" stroke={INK} strokeWidth="1.8" />}
      {equipped.includes('atki') && (
        <g>
          <polygon points="72,116 90,104 98,118 80,132" fill="#f4b85e" />
          <polygon points="76,126 86,120 80,146 72,142" fill="#c98a26" />
        </g>
      )}
      {equipped.includes('madalya') && <Medal cx={108} cy={150} />}
    </g>
  );
}

export function PetArt({
  species,
  stage,
  mood = 'sakin',
  equipped = [],
  size = 160,
  progress = 0,
  title,
}: {
  species: PetSpecies;
  stage: StageId;
  mood?: PetMood;
  equipped?: string[];
  size?: number;
  progress?: number;
  title?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 190" role="img" aria-label={title ?? `${species}, ${stage}`} style={{ overflow: 'visible' }}>
      {stage === 'yumurta' ? (
        <Egg species={species} progress={progress} />
      ) : species === 'tilki' ? (
        <Fox stage={stage} mood={mood} equipped={equipped} />
      ) : species === 'baykus' ? (
        <Owl stage={stage} mood={mood} equipped={equipped} />
      ) : (
        <Crane stage={stage} mood={mood} equipped={equipped} />
      )}
    </svg>
  );
}
