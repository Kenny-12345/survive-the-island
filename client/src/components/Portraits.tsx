// Leader portraits: original cartoon "medallions" in the same painted-miniature style as the creatures
// (dark ink outline, shaded body, rim light, glossy eyes) with a themed backdrop and a few idle animations.
// Drawn in a 100x100 box and clipped to a circle so they sit well inside round frames.
import type { ReactNode } from 'react';
import { charById } from '../../../shared/characters';

const INK = '#1a0f0a';

function Lin({ id, stops, x2 = 0, y2 = 1 }: { id: string; stops: string[]; x2?: number; y2?: number }) {
  return <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>{stops.map((c, i) => <stop key={i} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={c} />)}</linearGradient>;
}
function Rad({ id, stops, cx = '50%', cy = '50%' }: { id: string; stops: string[]; cx?: string; cy?: string }) {
  return <radialGradient id={id} cx={cx} cy={cy} r="60%">{stops.map((c, i) => <stop key={i} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={c} />)}</radialGradient>;
}

/** Eye with sclera, iris, pupil and highlight; blinks when animated. */
function Eye({ x, y, r = 6.5, iris = '#3b2412', slit = false, lid, anim, delay = 0, glow }: {
  x: number; y: number; r?: number; iris?: string; slit?: boolean; lid?: string; anim: boolean; delay?: number; glow?: boolean;
}) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g>
        {anim && <animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 .08;1 1" keyTimes="0;.93;.965;1" dur="4.6s" begin={`${delay}s`} repeatCount="indefinite" />}
        {glow && <circle r={r * 1.5} fill={iris} opacity=".35" />}
        <ellipse rx={r} ry={r * 1.1} fill="#fff" stroke={INK} strokeWidth="1.6" />
        <circle cx=".6" cy=".8" r={r * 0.62} fill={iris} />
        {slit ? <ellipse cx=".6" cy=".8" rx={r * 0.16} ry={r * 0.55} fill={INK} /> : <circle cx=".8" cy="1" r={r * 0.32} fill={INK} />}
        <circle cx={-r * 0.3} cy={-r * 0.35} r={r * 0.24} fill="#fff" />
        {lid && <path d={`M${-r - 0.6} 0 A${r + 0.6} ${r * 1.1 + 0.6} 0 0 1 ${r + 0.6} 0 Z`} fill={lid} stroke={INK} strokeWidth="1.4" />}
      </g>
    </g>
  );
}
/** Soft rim light along the upper-left edge of a shape. */
const Rim = ({ d }: { d: string }) => <path d={d} fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="2.6" strokeLinecap="round" />;
const Bob = ({ anim, children, dur = 2.8 }: { anim: boolean; children: ReactNode; dur?: number }) => (
  <g>{anim && <animateTransform attributeName="transform" type="translate" values="0 0;0 -1.6;0 0" dur={`${dur}s`} repeatCount="indefinite" />}{children}</g>
);

type Art = (anim: boolean) => { bg: ReactNode; fig: ReactNode; defs?: ReactNode };

const ART: Record<string, Art> = {
  gojirex: anim => ({
    defs: <><Lin id="gx-b" stops={['#6fa86f', '#3f6b4a', '#24402c']} /><Rad id="gx-bg" stops={['#5ee7ff', '#1d6f8f', '#0b2440']} cy="40%" /></>,
    bg: <>
      <rect width="100" height="100" fill="url(#gx-bg)" />
      {[0, 1, 2, 3, 4, 5].map(i => <path key={i} d={`M50 40 L${50 + Math.cos(i) * 70} ${40 + Math.sin(i) * 70}`} stroke="#bff7ff" strokeOpacity=".12" strokeWidth="6" />)}
    </>,
    fig: <>
      {/* glowing dorsal plates */}
      {[[26, 34, -30], [36, 22, -14], [50, 16, 0], [64, 22, 14], [74, 34, 30]].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x},${y}) rotate(${r})`}>
          <path d="M-7 8 L-4 -6 L0 -14 L4 -6 L7 8 Z" fill="#a7f3d0" stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
            {anim && <animate attributeName="fill" values="#a7f3d0;#e0fffa;#a7f3d0" dur="1.8s" begin={`${i * 0.18}s`} repeatCount="indefinite" />}
          </path>
          <path d="M-2 4 L0 -9" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" />
        </g>
      ))}
      <path d="M6 104 Q10 76 32 70 L68 70 Q90 76 94 104 Z" fill="url(#gx-b)" stroke={INK} strokeWidth="2.4" />
      <path d="M34 104 Q36 80 50 78 Q64 80 66 104 Z" fill="#cfe8b0" stroke={INK} strokeWidth="1.6" />
      {[84, 91, 98].map(y => <path key={y} d={`M38 ${y} Q50 ${y + 2} 62 ${y}`} stroke="#8fae6a" strokeWidth="1.2" fill="none" />)}
      <Bob anim={anim}>
        <path d="M21 52 Q19 25 50 24 Q81 25 79 52 Q79 76 50 79 Q21 76 21 52 Z" fill="url(#gx-b)" stroke={INK} strokeWidth="2.6" />
        <Rim d="M26 44 Q28 30 44 27" />
        {[[30, 36], [70, 38], [26, 58], [74, 60], [42, 30], [60, 29]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" fill="#2a4a33" />)}
        <path d="M30 58 Q50 50 70 58 Q70 74 50 76 Q30 74 30 58 Z" fill="#9ccc86" stroke={INK} strokeWidth="1.6" />
        <path d="M28 40 Q38 34 46 41 M54 41 Q62 34 72 40" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <Eye x={38} y={46} r={6} iris="#facc15" slit anim={anim} />
        <Eye x={62} y={46} r={6} iris="#facc15" slit anim={anim} delay={0.05} />
        <ellipse cx="45" cy="58" rx="1.8" ry="1.2" fill={INK} /><ellipse cx="55" cy="58" rx="1.8" ry="1.2" fill={INK} />
        <path d="M33 64 Q50 75 67 64 Q63 72 50 73 Q37 72 33 64 Z" fill="#5b1a1a" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        {[37, 43, 49, 55, 61].map(x => <path key={x} d={`M${x} ${65.5 + (Math.abs(x - 50) < 8 ? 2 : 0)} l2.4 4 l2.4 -4 Z`} fill="#fff" />)}
      </Bob>
    </>,
  }),

  megafin: anim => ({
    defs: <><Lin id="mf-b" stops={['#a3b3c7', '#64748b', '#3b4757']} /><Rad id="mf-bg" stops={['#5fb3ff', '#1d4e89', '#0a1f3d']} cy="35%" /></>,
    bg: <>
      <rect width="100" height="100" fill="url(#mf-bg)" />
      {[[16, 70, 3], [12, 50, 2], [86, 60, 3.5], [82, 30, 2], [22, 26, 2.5]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="none" stroke="#dbeafe" strokeOpacity=".6" strokeWidth="1">
          {anim && <animate attributeName="cy" values={`${y};${y - 14};${y}`} dur={`${4 + i}s`} repeatCount="indefinite" />}
        </circle>
      ))}
    </>,
    fig: <>
      {/* captain's coat */}
      <path d="M6 104 Q10 78 32 72 L68 72 Q90 78 94 104 Z" fill="#1e3a8a" stroke={INK} strokeWidth="2.4" />
      <path d="M40 72 L50 90 L60 72" fill="#e2e8f0" stroke={INK} strokeWidth="1.6" />
      <path d="M14 82 Q22 74 30 76 L28 84 Q20 84 14 82 Z M86 82 Q78 74 70 76 L72 84 Q80 84 86 82 Z" fill="#fbbf24" stroke={INK} strokeWidth="1.4" />
      {[92, 99].map(y => <circle key={y} cx="50" cy={y} r="2" fill="#fbbf24" stroke={INK} strokeWidth="1" />)}
      <Bob anim={anim}>
        {/* dorsal fin behind the cap */}
        <path d="M58 26 Q66 8 80 6 Q72 16 72 30 Z" fill="url(#mf-b)" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M50 18 Q78 26 79 54 Q79 78 50 80 Q21 78 21 54 Q22 26 50 18 Z" fill="url(#mf-b)" stroke={INK} strokeWidth="2.6" />
        <Rim d="M27 44 Q30 28 46 22" />
        <path d="M27 58 Q50 52 73 58 Q71 77 50 79 Q29 77 27 58 Z" fill="#eef2f7" stroke={INK} strokeWidth="1.4" />
        {[0, 1, 2].map(i => <path key={i} d={`M${23 + i * 3} ${54 + i * 2} q-3 4 0 8 M${77 - i * 3} ${54 + i * 2} q3 4 0 8`} stroke="#3b4757" strokeWidth="1.3" fill="none" />)}
        <Eye x={37} y={46} r={5.5} iris="#1e293b" anim={anim} />
        <Eye x={63} y={46} r={5.5} iris="#1e293b" anim={anim} delay={0.05} />
        <path d="M30 38 L43 41 M70 38 L57 41" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M30 60 Q50 66 70 60 Q67 75 50 76 Q33 75 30 60 Z" fill="#7f1d1d" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        {[32, 37, 42, 47, 52, 57, 62].map(x => <path key={x} d={`M${x} 61.4 l2.5 4.4 l2.5 -4.4 Z`} fill="#fff" stroke={INK} strokeWidth=".5" />)}
        {[38, 45, 52, 59].map(x => <path key={x} d={`M${x} 75 l2.4 -3.6 l2.4 3.6 Z`} fill="#fff" />)}
        {/* captain's cap */}
        <g transform="rotate(-8 40 18)">
          <path d="M20 22 Q22 8 42 8 Q60 8 62 20 Z" fill="#1e3a8a" stroke={INK} strokeWidth="2" />
          <path d="M16 24 Q40 16 66 22 Q62 27 40 26 Q22 27 16 24 Z" fill="#0f172a" stroke={INK} strokeWidth="1.8" />
          <rect x="22" y="18" width="38" height="3.5" fill="#fbbf24" />
          <path d="M41 10 v7 M37.5 13 h7 M37 16 q4 3 8 0" stroke="#fbbf24" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      </Bob>
    </>,
  }),

  coilvra: anim => ({
    defs: <><Lin id="cv-b" stops={['#34b8a6', '#0f766e', '#064e47']} /><Rad id="cv-bg" stops={['#1e3a8a', '#0f1d4a', '#070b24']} cy="30%" /></>,
    bg: <>
      <rect width="100" height="100" fill="url(#cv-bg)" />
      {[[14, 18], [28, 10], [80, 14], [88, 34], [10, 44], [70, 8], [92, 56]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 ? 0.9 : 1.5} fill="#fff">{anim && <animate attributeName="opacity" values=".3;1;.3" dur={`${2 + (i % 3)}s`} repeatCount="indefinite" />}</circle>
      ))}
      <path d="M78 22 a6 6 0 1 0 6 8 a5 5 0 1 1 -6 -8 Z" fill="#fde68a" />
    </>,
    fig: <>
      {/* coils */}
      <path d="M-4 96 Q16 72 36 86 Q56 100 76 82 Q92 70 106 88" stroke={INK} strokeWidth="22" fill="none" strokeLinecap="round" />
      <path d="M-4 96 Q16 72 36 86 Q56 100 76 82 Q92 70 106 88" stroke="url(#cv-b)" strokeWidth="17" fill="none" strokeLinecap="round" />
      <path d="M2 90 Q16 78 32 86" stroke="#fde68a" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
      <Bob anim={anim} dur={3.4}>
        {/* hood */}
        <path d="M50 18 Q88 22 84 58 Q78 78 50 76 Q22 78 16 58 Q12 22 50 18 Z" fill="url(#cv-b)" stroke={INK} strokeWidth="2.6" />
        {/* cobra-hood eyespots and scale chevrons */}
        {[-1, 1].map(sd => [40, 50, 60].map(y => <path key={`${sd}${y}`} d={`M${50 + sd * 22} ${y - 6} l${-sd * 5} 5 l${sd * 5} 5`} stroke="#fde68a" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />))}
        {[30, 38].map(y => <path key={y} d={`M${30 - (y - 30) / 3} ${y} q3 -3 6 0 M${64 + (y - 30) / 3} ${y} q3 -3 6 0`} stroke="#5eead4" strokeWidth="1.4" fill="none" opacity=".7" />)}
        <path d="M22 62 q4 4 8 4 M78 62 q-4 4 -8 4" stroke="#fde68a" strokeWidth="1.6" fill="none" opacity=".8" />
        <Rim d="M22 40 Q24 26 42 21" />
        {/* head */}
        <path d="M50 28 Q67 30 67 48 Q67 68 50 72 Q33 68 33 48 Q33 30 50 28 Z" fill="#14a093" stroke={INK} strokeWidth="2.2" />
        <path d="M40 56 Q50 54 60 56 Q58 68 50 70 Q42 68 40 56 Z" fill="#fde68a" opacity=".85" />
        <Eye x={42} y={45} r={5} iris="#f59e0b" slit lid="#0f766e" anim={anim} />
        <Eye x={58} y={45} r={5} iris="#f59e0b" slit lid="#0f766e" anim={anim} delay={0.05} />
        {/* star gem */}
        <path d="M50 30 L52 35 L57 36 L52 38 L50 43 L48 38 L43 36 L48 35 Z" fill="#fde68a" stroke={INK} strokeWidth="1">
          {anim && <animate attributeName="fill" values="#fde68a;#fff;#fde68a" dur="2s" repeatCount="indefinite" />}
        </path>
        <path d="M44 61 Q50 64 56 61" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M50 63 L50 70 L48 73 M50 70 L52 73" stroke="#ef4444" strokeWidth="1.6" fill="none" strokeLinecap="round">
          {anim && <animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.7;.8;1" dur="3s" repeatCount="indefinite" />}
        </path>
      </Bob>
    </>,
  }),

  pyrovern: anim => ({
    defs: <><Lin id="pv-b" stops={['#f05252', '#b91c1c', '#6b0f0f']} /><Rad id="pv-bg" stops={['#ffb347', '#d9480f', '#3a0d06']} cy="65%" /></>,
    bg: <>
      <rect width="100" height="100" fill="url(#pv-bg)" />
      {[[18, 80], [80, 74], [30, 30], [72, 20], [88, 46]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#ffe08a">{anim && <animate attributeName="cy" values={`${y};${y - 20};${y}`} dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />}</circle>
      ))}
    </>,
    fig: <>
      {/* wings */}
      {[-1, 1].map(s => (
        <g key={s} transform={`translate(50,0) scale(${s},1)`}>
          <path d="M18 66 Q34 30 50 16 Q46 34 50 44 Q42 46 44 56 Q36 56 36 66 Z" fill="#7f1d1d" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M20 64 L48 18 M28 62 L49 43 M34 64 L43 56" stroke="#4c0d0d" strokeWidth="1.4" />
        </g>
      ))}
      <path d="M6 104 Q10 76 32 70 L68 70 Q90 76 94 104 Z" fill="url(#pv-b)" stroke={INK} strokeWidth="2.4" />
      <path d="M36 104 Q38 80 50 78 Q62 80 64 104 Z" fill="#fbbf24" stroke={INK} strokeWidth="1.6" />
      {[85, 92, 99].map(y => <path key={y} d={`M39 ${y} Q50 ${y + 2} 61 ${y}`} stroke="#b45309" strokeWidth="1.3" fill="none" />)}
      <Bob anim={anim}>
        {/* horns */}
        <path d="M30 34 Q18 22 20 6 Q26 20 38 28 Z M70 34 Q82 22 80 6 Q74 20 62 28 Z" fill="#f3d39b" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M24 18 l4 1 M22 12 l4 1 M76 18 l-4 1 M78 12 l-4 1" stroke="#b08850" strokeWidth="1.3" />
        <path d="M22 52 Q20 26 50 24 Q80 26 78 52 Q78 76 50 79 Q22 76 22 52 Z" fill="url(#pv-b)" stroke={INK} strokeWidth="2.6" />
        <Rim d="M27 44 Q29 30 45 27" />
        <path d="M22 56 l-7 3 l7 3 M78 56 l7 3 l-7 3" fill="#f3d39b" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M31 58 Q50 50 69 58 Q69 74 50 76 Q31 74 31 58 Z" fill="#e05252" stroke={INK} strokeWidth="1.6" />
        <path d="M28 41 Q38 36 46 42 M54 42 Q62 36 72 41" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <Eye x={38} y={47} r={5.8} iris="#f59e0b" slit anim={anim} />
        <Eye x={62} y={47} r={5.8} iris="#f59e0b" slit anim={anim} delay={0.05} />
        <ellipse cx="45" cy="59" rx="2" ry="1.3" fill={INK} /><ellipse cx="55" cy="59" rx="2" ry="1.3" fill={INK} />
        {/* smoke from the nostrils */}
        {anim && [0, 1].map(i => (
          <circle key={i} cx={45 + i * 10} cy="56" r="2" fill="#d6d3d1" opacity="0">
            <animate attributeName="cy" values="56;40" dur="2.4s" begin={`${i * 1.2}s`} repeatCount="indefinite" />
            <animate attributeName="r" values="1.5;5" dur="2.4s" begin={`${i * 1.2}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values=".8;0" dur="2.4s" begin={`${i * 1.2}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <path d="M36 67 Q50 73 64 66" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M40 68 l2 5 l2 -4.4 Z M56 68.2 l2 4.6 l2 -5 Z" fill="#fff" stroke={INK} strokeWidth=".8" />
      </Bob>
    </>,
  }),

  kongaru: anim => ({
    defs: <><Lin id="kg-b" stops={['#78716c', '#4a4440', '#26221f']} /><Rad id="kg-bg" stops={['#a3e635', '#3f7a1f', '#12300f']} cy="35%" /></>,
    bg: <>
      <rect width="100" height="100" fill="url(#kg-bg)" />
      {[[0, 10, 30], [100, 20, 150], [-4, 60, 10], [104, 64, 170]].map(([x, y, r], i) => (
        <path key={i} d="M0 0 Q20 -12 40 0 Q20 10 0 0 Z" transform={`translate(${x},${y}) rotate(${r})`} fill={i % 2 ? '#2f7a2f' : '#4caf50'} stroke="#12300f" strokeWidth="1" />
      ))}
    </>,
    fig: <>
      {/* oar over the shoulder */}
      <path d="M14 98 L84 18" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M14 98 L84 18" stroke="#b07a3c" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M80 22 Q86 6 96 4 Q96 16 86 26 Z" fill="#d99b5c" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 104 Q6 72 30 66 L70 66 Q94 72 96 104 Z" fill="url(#kg-b)" stroke={INK} strokeWidth="2.4" />
      <path d="M30 104 Q32 80 50 78 Q68 80 70 104 Z" fill="#6b625b" />
      <Bob anim={anim} dur={3.2}>
        <path d="M21 54 Q17 22 50 20 Q83 22 79 54 Q81 80 50 82 Q19 80 21 54 Z" fill="url(#kg-b)" stroke={INK} strokeWidth="2.6" />
        <Rim d="M25 44 Q27 28 44 23" />
        {/* bandana */}
        <path d="M22 36 Q50 24 78 36 L77 42 Q50 32 23 42 Z" fill="#dc2626" stroke={INK} strokeWidth="1.8" />
        {[30, 40, 50, 60, 70].map(x => <circle key={x} cx={x} cy={34 - (x === 50 ? 2 : 0)} r="1" fill="#fff" />)}
        <path d="M77 38 L88 34 L86 42 Z M78 40 L88 46 L82 48 Z" fill="#dc2626" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M31 48 Q50 38 69 48 Q73 66 62 75 Q50 80 38 75 Q27 66 31 48 Z" fill="#d6b38a" stroke={INK} strokeWidth="1.8" />
        <path d="M30 46 Q40 40 50 45 Q60 40 70 46" stroke="#3a3430" strokeWidth="4" fill="none" strokeLinecap="round" />
        <Eye x={40} y={51} r={4.6} iris="#7c4a1e" anim={anim} />
        <Eye x={60} y={51} r={4.6} iris="#7c4a1e" anim={anim} delay={0.05} />
        <path d="M43 61 Q50 57 57 61 Q56 66 50 66 Q44 66 43 61 Z" fill="#a8835e" stroke={INK} strokeWidth="1.2" />
        <ellipse cx="46.5" cy="62.5" rx="1.8" ry="1.3" fill={INK} /><ellipse cx="53.5" cy="62.5" rx="1.8" ry="1.3" fill={INK} />
        <path d="M40 70 Q50 76 60 70" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <circle cx="34" cy="64" r="3" fill="#f0a3a3" opacity=".45" /><circle cx="66" cy="64" r="3" fill="#f0a3a3" opacity=".45" />
      </Bob>
    </>,
  }),

  frostmaw: anim => ({
    defs: <><Lin id="fm-b" stops={['#ffffff', '#dbeafe', '#93c5fd']} /><Rad id="fm-bg" stops={['#e0f2fe', '#5aa9d6', '#123a5c']} cy="30%" /></>,
    bg: <>
      <rect width="100" height="100" fill="url(#fm-bg)" />
      {[[14, 20], [30, 8], [84, 14], [90, 40], [8, 50], [70, 6]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          {anim && <animateTransform attributeName="transform" type="translate" values={`${x} ${y};${x + 3} ${y + 30};${x} ${y + 60}`} dur={`${5 + i}s`} repeatCount="indefinite" />}
          <path d="M-3 0 h6 M0 -3 v6 M-2 -2 l4 4 M2 -2 l-4 4" stroke="#fff" strokeWidth="1" opacity=".85" />
        </g>
      ))}
    </>,
    fig: <>
      {/* shaggy shoulders */}
      <path d="M4 104 L6 84 L12 88 L16 76 L22 82 L28 70 L36 76 L44 70 L50 76 L56 70 L64 76 L72 70 L78 82 L84 76 L88 88 L94 84 L96 104 Z" fill="url(#fm-b)" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <Bob anim={anim}>
        {/* icicle horns */}
        <path d="M28 30 L18 6 L36 24 Z M72 30 L82 6 L64 24 Z" fill="#bae6fd" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M22 12 L30 26 M78 12 L70 26" stroke="#fff" strokeWidth="1.4" />
        {/* shaggy head */}
        <path d="M50 18 L56 24 L64 20 L68 28 L76 28 L76 36 L84 42 L78 48 L84 56 L76 60 L80 70 L70 70 L66 80 L58 76 L50 84 L42 76 L34 80 L30 70 L20 70 L24 60 L16 56 L22 48 L16 42 L24 36 L24 28 L32 28 L36 20 L44 24 Z" fill="url(#fm-b)" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M32 46 Q50 36 68 46 Q72 66 50 72 Q28 66 32 46 Z" fill="#7dd3fc" stroke={INK} strokeWidth="1.8" />
        <path d="M34 48 Q42 42 50 44" stroke="#e0f2fe" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".8" />
        <Eye x={42} y={51} r={4.8} iris="#0284c7" anim={anim} glow />
        <Eye x={58} y={51} r={4.8} iris="#0284c7" anim={anim} delay={0.05} glow />
        <ellipse cx="50" cy="59" rx="3.4" ry="2.2" fill="#1e3a5f" />
        <path d="M40 63 Q50 70 60 63" stroke={INK} strokeWidth="2.2" fill="#1e3a5f" strokeLinecap="round" />
        <path d="M43 64.5 l1.6 3.6 l1.6 -3 Z M53.8 65.1 l1.6 3 l1.6 -3.6 Z" fill="#fff" />
        {/* frosty breath */}
        {anim && <circle cx="62" cy="68" r="2" fill="#fff" opacity="0">
          <animate attributeName="cx" values="62;78" dur="3s" repeatCount="indefinite" />
          <animate attributeName="r" values="1.5;6" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".8;0" dur="3s" repeatCount="indefinite" />
        </circle>}
      </Bob>
    </>,
  }),

  mechatron: anim => ({
    defs: <><Lin id="mt-b" stops={['#f2c46b', '#c48a2c', '#7a5218']} /><Rad id="mt-bg" stops={['#6b7280', '#374151', '#111827']} cy="35%" /></>,
    bg: <>
      <rect width="100" height="100" fill="url(#mt-bg)" />
      {[[14, 22, 10], [88, 70, 13]].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x},${y})`} opacity=".35">
          <g>
            {anim && <animateTransform attributeName="transform" type="rotate" values={i ? '0;-360' : '0;360'} dur="12s" repeatCount="indefinite" />}
            <circle r={r} fill="none" stroke="#d1d5db" strokeWidth="3" strokeDasharray="3 3" />
            <circle r={r * 0.45} fill="none" stroke="#d1d5db" strokeWidth="2" />
          </g>
        </g>
      ))}
    </>,
    fig: <>
      <path d="M6 104 Q8 78 28 72 L72 72 Q92 78 94 104 Z" fill="url(#mt-b)" stroke={INK} strokeWidth="2.4" />
      {[[16, 88], [84, 88], [40, 82], [60, 82]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" fill="#5b3c10" />)}
      <rect x="40" y="86" width="20" height="14" rx="3" fill="#374151" stroke={INK} strokeWidth="1.6" />
      <circle cx="50" cy="93" r="4" fill="#ef4444">{anim && <animate attributeName="fill" values="#ef4444;#fca5a5;#ef4444" dur="1.4s" repeatCount="indefinite" />}</circle>
      {/* rescue winch */}
      <path d="M84 72 L84 60" stroke="#9ca3af" strokeWidth="2" />
      <path d="M84 60 q-6 0 -6 6 q0 6 6 6" stroke="#d1d5db" strokeWidth="2.4" fill="none" strokeLinecap="round" transform="translate(4,-14)" />
      <Bob anim={anim} dur={2.2}>
        <path d="M50 22 V10" stroke={INK} strokeWidth="3" /><path d="M50 22 V10" stroke="#9ca3af" strokeWidth="1.6" />
        <circle cx="50" cy="8" r="4" fill="#ef4444" stroke={INK} strokeWidth="1.4">{anim && <animate attributeName="fill" values="#ef4444;#fecaca;#ef4444" dur="1s" repeatCount="indefinite" />}</circle>
        <rect x="20" y="22" width="60" height="54" rx="12" fill="url(#mt-b)" stroke={INK} strokeWidth="2.6" />
        <Rim d="M26 34 Q26 27 34 26" />
        {[[26, 28], [74, 28], [26, 70], [74, 70]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="2" fill="#7a5218" /><circle cx={x - 0.5} cy={y - 0.5} r=".7" fill="#ffe7a8" /></g>)}
        <rect x="27" y="35" width="46" height="22" rx="10" fill="#1f2937" stroke={INK} strokeWidth="1.8" />
        {[38, 62].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy="46" r="7" fill="#422006" />
            <circle cx={x} cy="46" r="5.4" fill="#facc15">{anim && <animate attributeName="r" values="5.4;4.2;5.4" dur="3s" begin={`${i * 0.1}s`} repeatCount="indefinite" />}</circle>
            <circle cx={x} cy="46" r="2.2" fill="#fff7cc" />
            <circle cx={x - 2} cy="44" r="1" fill="#fff" />
          </g>
        ))}
        <rect x="36" y="62" width="28" height="9" rx="2.5" fill="#374151" stroke={INK} strokeWidth="1.4" />
        {[40, 45, 50, 55, 60].map(x => <rect key={x} x={x - 0.8} y="63.5" width="1.6" height="6" fill="#9ca3af" />)}
        <rect x="14" y="40" width="7" height="14" rx="2" fill="#9ca3af" stroke={INK} strokeWidth="1.4" />
        <rect x="79" y="40" width="7" height="14" rx="2" fill="#9ca3af" stroke={INK} strokeWidth="1.4" />
      </Bob>
    </>,
  }),

  xenoid: anim => ({
    defs: <><Lin id="xn-b" stops={['#a78bfa', '#7c3aed', '#4c1d95']} /><Rad id="xn-bg" stops={['#f0abfc', '#7e22ce', '#1e0b3d']} cy="30%" /></>,
    bg: <>
      <rect width="100" height="100" fill="url(#xn-bg)" />
      <g transform="translate(82,20)"><circle r="7" fill="#fbbf24" /><ellipse rx="13" ry="3.4" fill="none" stroke="#fde68a" strokeWidth="1.6" transform="rotate(-20)" /></g>
      {[[12, 16], [24, 34], [10, 70], [92, 52]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill="#fff" opacity=".8" />)}
    </>,
    fig: <>
      {/* beach shirt + lei */}
      <path d="M6 104 Q10 78 32 72 L68 72 Q90 78 94 104 Z" fill="#14b8a6" stroke={INK} strokeWidth="2.4" />
      {[[20, 90], [34, 98], [70, 92], [82, 100], [58, 102]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>{[0, 72, 144, 216, 288].map(a => <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 2.6} cy={Math.sin((a * Math.PI) / 180) * 2.6} r="1.9" fill="#fde047" />)}<circle r="1.2" fill="#f97316" /></g>
      ))}
      {Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI * (0.15 + (i / 8) * 0.7);
        return <circle key={i} cx={50 - Math.cos(a) * 22} cy={74 + Math.sin(a) * 9} r="3.6" fill={i % 2 ? '#f472b6' : '#fde047'} stroke={INK} strokeWidth="1" />;
      })}
      <Bob anim={anim} dur={2.6}>
        {/* antennae */}
        {[-1, 1].map(s => (
          <g key={s}>
            {anim && <animateTransform attributeName="transform" type="rotate" values={`0 50 20;${s * 6} 50 20;0 50 20`} dur="1.8s" repeatCount="indefinite" />}
            <path d={`M${50 + s * 10} 20 Q${50 + s * 15} 11 ${50 + s * 22} 11`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d={`M${50 + s * 10} 20 Q${50 + s * 15} 11 ${50 + s * 22} 11`} stroke="#a78bfa" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <circle cx={50 + s * 22} cy="11" r="4" fill="#a3e635" stroke={INK} strokeWidth="1.4" />
            <circle cx={50 + s * 21} cy="10" r="1.2" fill="#fff" />
          </g>
        ))}
        <path d="M50 14 Q85 15 83 46 Q81 70 50 78 Q19 70 17 46 Q15 15 50 14 Z" fill="url(#xn-b)" stroke={INK} strokeWidth="2.6" />
        <Rim d="M23 36 Q26 20 44 17" />
        {[[26, 52], [74, 50], [64, 24]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2 + (i % 2)} fill="#6d28d9" opacity=".6" />)}
        {/* three almond eyes */}
        {[[34, 46, -18, 0], [66, 46, 18, 0.05], [50, 31, 0, 0.1]].map(([x, y, r, d]) => (
          <g key={x} transform={`translate(${x},${y}) rotate(${r})`}>
            <g>
              {anim && <animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 .1;1 1" keyTimes="0;.93;.965;1" dur="4.6s" begin={`${d}s`} repeatCount="indefinite" />}
              <ellipse rx="7" ry="5" fill="#0b0b12" stroke={INK} strokeWidth="1.4" />
              <ellipse cx="-2" cy="-1.6" rx="2.4" ry="1.5" fill="#a3e635" opacity=".9" />
              <circle cx="2.6" cy="1.6" r=".9" fill="#fff" opacity=".7" />
            </g>
          </g>
        ))}
        <path d="M42 62 Q50 69 58 62" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <circle cx="33" cy="58" r="3" fill="#f0abfc" opacity=".5" /><circle cx="67" cy="58" r="3" fill="#f0abfc" opacity=".5" />
      </Bob>
    </>,
  }),
};

export function Portrait({ id, size = 96, animate = true }: { id: string; size?: number; animate?: boolean }) {
  const c = charById(id);
  const art = (ART[c.id] ?? ART.gojirex)(animate);
  const clip = `pc-${c.id}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${c.name}, ${c.title}`}>
      <defs>
        <clipPath id={clip}><circle cx="50" cy="50" r="50" /></clipPath>
        {art.defs}
      </defs>
      <g clipPath={`url(#${clip})`}>
        {art.bg}
        {art.fig}
        <circle cx="50" cy="50" r="49" fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="2" />
      </g>
    </svg>
  );
}
