// Original creature figures, drawn like painted plastic miniatures: dark outline, a shaded body,
// a lighter belly or rim light, glossy eyes, and a ring in the creature's die colour so the
// colour rule stays readable at a glance. All fit roughly in x -30..30, y -26..14.
import type { ReactNode } from 'react';

const INK = '#1a0f0a';

/** Water ring under swimming creatures; tinted with the die colour. */
function WaterBase({ color, rx = 20 }: { color: string; rx?: number }) {
  return (
    <g>
      <ellipse cx="0" cy="8" rx={rx + 2} ry="5.5" fill="#001a33" opacity=".45" />
      <ellipse cx="0" cy="7" rx={rx} ry="4.5" fill="none" stroke={color} strokeWidth="2.2" opacity=".85" />
      <ellipse cx="0" cy="7" rx={rx - 4} ry="3" fill="none" stroke="#e0f7ff" strokeWidth="1.2" opacity=".7">
        <animate attributeName="rx" values={`${rx - 6};${rx + 1};${rx - 6}`} dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values=".8;0;.8" dur="2.4s" repeatCount="indefinite" />
      </ellipse>
    </g>
  );
}
function Eye({ x, y, r = 2.6, slit = false, color = '#fde047' }: { x: number; y: number; r?: number; slit?: boolean; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} stroke={INK} strokeWidth=".9" />
      {slit ? <ellipse cx={x + 0.3} cy={y} rx={r * 0.28} ry={r * 0.8} fill={INK} /> : <circle cx={x + 0.4} cy={y + 0.3} r={r * 0.5} fill={INK} />}
      <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.3} fill="#fff" />
    </g>
  );
}
const Grad = ({ id, a, b, children }: { id: string; a: string; b: string; children?: ReactNode }) => (
  <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={a} /><stop offset="100%" stopColor={b} />{children}</linearGradient></defs>
);

export function SerpentSprite() {
  return (
    <g>
      <Grad id="g-serp" a="#f87171" b="#991b1b" />
      <WaterBase color="#ef4444" rx={22} />
      {/* rear coils arching out of the water */}
      {[[-20, -6], [-7, -6]].map(([x], i) => (
        <g key={i}>
          <path d={`M${x - 5} 7 Q${x - 4} -${11 - i} ${x} -${11 - i} Q${x + 4} -${11 - i} ${x + 5} 7`} fill="none" stroke={INK} strokeWidth="8.5" strokeLinecap="round" />
          <path d={`M${x - 5} 7 Q${x - 4} -${11 - i} ${x} -${11 - i} Q${x + 4} -${11 - i} ${x + 5} 7`} fill="none" stroke="url(#g-serp)" strokeWidth="6" strokeLinecap="round" />
          <path d={`M${x - 3} 2 Q${x - 2.5} -${8 - i} ${x} -${8 - i}`} fill="none" stroke="#fecaca" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
          {[-2, 0, 2].map(d => <path key={d} d={`M${x + d - 1} -${10 - i} l1 -3 l1 3`} fill="#fbbf24" stroke={INK} strokeWidth=".5" />)}
          <ellipse cx={x - 5} cy="7" rx="3.5" ry="1.2" fill="#e0f7ff" opacity=".8" /><ellipse cx={x + 5} cy="7" rx="3.5" ry="1.2" fill="#e0f7ff" opacity=".8" />
        </g>
      ))}
      {/* neck and head */}
      <path d="M3 7 Q4 -16 15 -15" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M3 7 Q4 -16 15 -15" fill="none" stroke="url(#g-serp)" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M5 4 Q6 -11 12 -13" fill="none" stroke="#fecaca" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
      <path d="M8 -20 L4 -27 L12 -21 L14 -28 L17 -20 Z" fill="#fbbf24" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M9 -12 Q10 -22 19 -21 Q27 -20 28 -14 L22 -12 L26 -9 Q20 -6 13 -8 Z" fill="url(#g-serp)" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M22 -12 L28 -14 L26 -9 Z" fill="#450a0a" />
      <path d="M23 -12.5 l1 2 l1 -2.3 M25.5 -13 l.8 2 l.9 -2.3" fill="#fff" />
      <Eye x={17} y={-16.5} r={2.3} slit />
      <ellipse cx={3} cy="7" rx="4" ry="1.3" fill="#e0f7ff" opacity=".8" />
    </g>
  );
}

export function SharkSprite() {
  return (
    <g>
      <Grad id="g-shark" a="#4ade80" b="#14532d" />
      {/* body gliding just under the surface */}
      <path d="M-24 3 Q-10 -4 12 -1 Q22 1 25 4 Q20 8 8 8 Q-10 9 -24 5 L-30 -1 L-28 8 Z" fill="#0b3d2a" opacity=".55" />
      <WaterBase color="#22c55e" rx={21} />
      <g className="anim-fin">
        <path d="M-9 6 Q-6 -10 2 -19 Q5 -21 6 -18 Q5 -6 11 6 Z" fill="url(#g-shark)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M-5 3 Q-2 -9 3 -16" stroke="#bbf7d0" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".8" />
        <path d="M4 -10 l3 1 M3 -6 l3.5 1" stroke={INK} strokeWidth=".9" opacity=".6" />
        <path d="M-10 6 Q0 3 12 6" stroke="#f0fdff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      {/* tail fin breaking the surface */}
      <path d="M-21 4 L-27 -6 L-24 5 Z" fill="url(#g-shark)" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M14 7 q4 -2 8 0 M-17 8 q3 -1.5 6 0" stroke="#e0f7ff" strokeWidth="1.2" fill="none" />
    </g>
  );
}

export function WhaleSprite() {
  return (
    <g>
      <Grad id="g-whale" a="#60a5fa" b="#1e3a8a" />
      <WaterBase color="#3b82f6" rx={24} />
      {/* tail flukes */}
      <path d="M-20 2 Q-25 -2 -26 -11 Q-22 -7 -19 -8 Q-17 -12 -12 -12 Q-15 -5 -14 2 Z" fill="url(#g-whale)" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      {/* back */}
      <path d="M-16 6 Q-14 -12 4 -14 Q20 -14 24 2 Q24 7 18 7 L-16 7 Z" fill="url(#g-whale)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-10 -3 Q2 -12 16 -8" stroke="#bfdbfe" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".7" />
      <path d="M6 2 Q14 6 23 2 L22 6 Q14 8 6 6 Z" fill="#dbeafe" opacity=".85" />
      {[[-4, -6], [-1, -9], [-7, -2]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.1 + (i % 2) * 0.5} fill="#e2e8f0" stroke="#64748b" strokeWidth=".4" />)}
      <Eye x={15} y={-3} r={1.9} color="#fff" />
      <path d="M17 1 q3 1.5 6 0" stroke={INK} strokeWidth=".9" fill="none" />
      {/* spout */}
      <g>
        <path d="M5 -15 Q2 -24 -4 -25 M5 -15 Q8 -24 14 -25 M5 -15 L5 -26" stroke="#e0f7ff" strokeWidth="2.2" fill="none" strokeLinecap="round">
          <animate attributeName="opacity" values="0;1;1;0" dur="2.8s" repeatCount="indefinite" />
        </path>
        <circle cx="-4" cy="-25" r="1.6" fill="#e0f7ff"><animate attributeName="opacity" values="0;1;0" dur="2.8s" repeatCount="indefinite" /></circle>
        <circle cx="14" cy="-25" r="1.6" fill="#e0f7ff"><animate attributeName="opacity" values="0;1;0" dur="2.8s" repeatCount="indefinite" /></circle>
      </g>
    </g>
  );
}

export function KaijuSprite() {
  return (
    <g>
      <Grad id="g-kaiju" a="#3b82f6" b="#172554" />
      <ellipse cx="0" cy="12" rx="19" ry="4.5" fill="#000" opacity=".45" />
      <ellipse cx="0" cy="11" rx="17" ry="3.6" fill="none" stroke="#3b82f6" strokeWidth="2" opacity=".85" />
      {/* tail */}
      <path d="M-8 9 Q-22 10 -27 2 Q-20 6 -10 3 Z" fill="url(#g-kaiju)" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      {/* legs */}
      <path d="M-9 4 L-11 12 L-4 12 L-4 5 Z M4 5 L4 12 L11 12 L9 4 Z" fill="#1e3a8a" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      {/* body */}
      <path d="M-11 8 Q-14 -10 -3 -15 Q8 -18 12 -9 Q15 0 11 8 Z" fill="url(#g-kaiju)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-5 7 Q-7 -4 0 -8 Q6 -6 5 7 Z" fill="#93c5fd" opacity=".75" />
      {[-2, 1, 4].map(y => <path key={y} d={`M-5 ${y} Q0 ${y + 1.5} 5 ${y}`} stroke="#1e3a8a" strokeWidth=".7" fill="none" opacity=".6" />)}
      {/* glowing dorsal spikes */}
      {[[-11, -6], [-9, -12], [-4, -16], [2, -18]].map(([x, y], i) => (
        <path key={i} d={`M${x - 2.5} ${y + 2} L${x - 1} ${y - 6} L${x + 2.5} ${y + 1} Z`} fill="#7dd3fc" stroke={INK} strokeWidth=".9" strokeLinejoin="round">
          <animate attributeName="fill" values="#7dd3fc;#e0f2fe;#7dd3fc" dur="1.6s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
        </path>
      ))}
      {/* head with roaring jaw */}
      <path d="M2 -13 Q8 -20 16 -16 Q20 -13 19 -9 L13 -9 L18 -5 Q12 -2 6 -5 Z" fill="url(#g-kaiju)" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M13 -9 L19 -9 L18 -5 Z" fill="#450a0a" />
      <path d="M14 -9 l.8 1.6 l.8 -1.6 M16.5 -9 l.7 1.5 l.7 -1.5" fill="#fff" />
      <Eye x={11} y={-14} r={2} color="#fde047" slit />
      {/* arms */}
      <path d="M9 -3 Q15 -2 15 2" stroke={INK} strokeWidth="3.6" fill="none" strokeLinecap="round" />
      <path d="M9 -3 Q15 -2 15 2" stroke="#2563eb" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

export function KrakenSprite() {
  return (
    <g>
      <Grad id="g-kraken" a="#f87171" b="#7f1d1d" />
      <WaterBase color="#ef4444" rx={22} />
      {/* curling tentacles with suckers */}
      {[[-1, -20], [-1, -9], [1, 9], [1, 20]].map(([dir, x], i) => (
        <g key={i}>
          <path d={`M${x * 0.35} 2 Q${x * 0.8} 10 ${x} 2 Q${x + dir * 3} -6 ${x + dir * 6} -3`} stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round">
            <animate attributeName="d" values={`M${x * 0.35} 2 Q${x * 0.8} 10 ${x} 2 Q${x + dir * 3} -6 ${x + dir * 6} -3;M${x * 0.35} 2 Q${x * 0.9} 11 ${x * 1.05} 1 Q${x + dir * 2} -9 ${x + dir * 7} -7;M${x * 0.35} 2 Q${x * 0.8} 10 ${x} 2 Q${x + dir * 3} -6 ${x + dir * 6} -3`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </path>
          <path d={`M${x * 0.35} 2 Q${x * 0.8} 10 ${x} 2 Q${x + dir * 3} -6 ${x + dir * 6} -3`} stroke="url(#g-kraken)" strokeWidth="3" fill="none" strokeLinecap="round">
            <animate attributeName="d" values={`M${x * 0.35} 2 Q${x * 0.8} 10 ${x} 2 Q${x + dir * 3} -6 ${x + dir * 6} -3;M${x * 0.35} 2 Q${x * 0.9} 11 ${x * 1.05} 1 Q${x + dir * 2} -9 ${x + dir * 7} -7;M${x * 0.35} 2 Q${x * 0.8} 10 ${x} 2 Q${x + dir * 3} -6 ${x + dir * 6} -3`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </path>
          <circle cx={x * 0.75} cy="6" r=".9" fill="#fecaca" />
        </g>
      ))}
      {/* mantle */}
      <path d="M-11 5 Q-14 -10 -6 -19 Q0 -24 6 -19 Q14 -10 11 5 Q0 8 -11 5 Z" fill="url(#g-kraken)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-6 -15 Q-3 -20 2 -20" stroke="#fecaca" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".8" />
      {[[-6, -9, 1.6], [6, -13, 1.2], [4, -2, 1.4], [-3, -16, 1]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fca5a5" opacity=".7" />)}
      <Eye x={-4.5} y={-4} r={2.8} slit />
      <Eye x={4.5} y={-4} r={2.8} slit />
      <path d="M-4 -8 l3 1.2 M4 -8 l-3 1.2" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

export function PteroSprite() {
  return (
    <g>
      <Grad id="g-ptero" a="#4ade80" b="#14532d" />
      <ellipse cx="0" cy="12" rx="13" ry="3" fill="#000" opacity=".35" />
      <ellipse cx="0" cy="11" rx="11" ry="2.6" fill="none" stroke="#22c55e" strokeWidth="1.8" opacity=".85" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur=".9s" repeatCount="indefinite" />
        {[-1, 1].map(s => (
          <g key={s}>
            <animateTransform attributeName="transform" type="rotate" values={`0 0 -6;${s * -16} 0 -6;0 0 -6`} dur=".9s" repeatCount="indefinite" />
            <path d={`M${s * 2} -7 L${s * 29} -15 Q${s * 24} -8 ${s * 22} -4 Q${s * 16} -5 ${s * 13} -1 Q${s * 9} -3 ${s * 4} 1 Z`} fill="url(#g-ptero)" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
            <path d={`M${s * 4} -6 L${s * 22} -4 M${s * 4} -6 L${s * 13} -1`} stroke="#14532d" strokeWidth=".8" fill="none" />
            <path d={`M${s * 3} -8 L${s * 27} -15`} stroke="#bbf7d0" strokeWidth="1" fill="none" opacity=".8" />
          </g>
        ))}
        <ellipse cx="0" cy="-3" rx="4.5" ry="7.5" fill="url(#g-ptero)" stroke={INK} strokeWidth="1.3" />
        <ellipse cx="0" cy="-1" rx="2.2" ry="4.5" fill="#bbf7d0" opacity=".6" />
        <path d="M-1 -10 Q-7 -19 -11 -21 Q-5 -14 -3 -9 Z" fill="#facc15" stroke={INK} strokeWidth=".9" strokeLinejoin="round" />
        <path d="M1 -11 Q8 -13 16 -10 L2 -8 Z" fill="#fbbf24" stroke={INK} strokeWidth=".9" strokeLinejoin="round" />
        <circle cx="0" cy="-10" r="3.4" fill="url(#g-ptero)" stroke={INK} strokeWidth="1.1" />
        <Eye x={1} y={-10.5} r={1.4} color="#fde047" />
      </g>
    </g>
  );
}
