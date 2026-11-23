// Original drawn icons for the ability tiles (the "equipment"), replacing emoji so they match the board art.
const INK = '#1a0f0a';

export function AbilityIcon({ kind, size = 34 }: { kind: string; size?: number }) {
  return (
    <svg viewBox="-20 -20 40 40" width={size} height={size} aria-hidden="true">
      {ICON[kind] ?? <text textAnchor="middle" dy="7" fontSize="20" fill="#fff">?</text>}
    </svg>
  );
}

export const ICON: Record<string, JSX.Element> = {
  paddles: (
    <g strokeLinejoin="round">
      {[-1, 1].map(s => (
        <g key={s} transform={`rotate(${s * 35})`}>
          <rect x="-1.8" y="-17" width="3.6" height="22" rx="1.5" fill="#a16207" stroke={INK} strokeWidth="1.2" />
          <path d="M-5 5 Q-6 14 0 17 Q6 14 5 5 Z" fill="#f59e0b" stroke={INK} strokeWidth="1.2" />
          <path d="M-2.5 7 Q-3 12 0 14" stroke="#fde68a" strokeWidth="1.2" fill="none" />
          <rect x="-2.4" y="-17" width="4.8" height="4" rx="1" fill="#57534e" stroke={INK} strokeWidth=".8" />
        </g>
      ))}
    </g>
  ),
  dolphin: (
    <g strokeLinejoin="round">
      <path d="M-16 8 Q-10 -12 8 -12 Q16 -12 18 -6 L13 -5 Q12 -2 8 -2 Q2 -1 -4 6 L-2 13 L-8 8 L-14 12 Z" fill="#38bdf8" stroke={INK} strokeWidth="1.3" />
      <path d="M-2 -12 L1 -18 L5 -12 Z" fill="#0ea5e9" stroke={INK} strokeWidth="1.1" />
      <path d="M-8 2 Q-2 -6 8 -6" stroke="#e0f2fe" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="10" cy="-8" r="1.4" fill={INK} /><circle cx="9.6" cy="-8.5" r=".5" fill="#fff" />
      <path d="M-18 15 q4 -3 8 0 t8 0" stroke="#e0f7ff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  ),
  dive: (
    <g strokeLinejoin="round">
      <path d="M-17 -2 Q-12 -10 -6 -2 T5 -2 T16 -2 L16 16 L-17 16 Z" fill="#0369a1" stroke={INK} strokeWidth="1.2" />
      <path d="M-17 -2 Q-12 -10 -6 -2 T5 -2 T16 -2" stroke="#e0f7ff" strokeWidth="2" fill="none" />
      <path d="M0 -17 V8 M-5 3 L0 9 L5 3" stroke="#fde68a" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[[-10, 8], [9, 5], [-6, 12]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.4 + i * 0.4} fill="none" stroke="#bae6fd" strokeWidth="1" />)}
    </g>
  ),
  die: (
    <g strokeLinejoin="round">
      <path d="M0 -16 L14 -8 L14 8 L0 16 L-14 8 L-14 -8 Z" fill="#f8fafc" stroke={INK} strokeWidth="1.3" />
      <path d="M0 -16 L14 -8 L0 0 L-14 -8 Z" fill="#ef4444" stroke={INK} strokeWidth="1" />
      <path d="M0 0 L14 -8 L14 8 L0 16 Z" fill="#2563eb" stroke={INK} strokeWidth="1" />
      <path d="M0 0 L-14 -8 L-14 8 L0 16 Z" fill="#16a34a" stroke={INK} strokeWidth="1" />
      <path d="M-11 -7 L-2 -12" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  ),
  repellent: (
    <g strokeLinejoin="round">
      <rect x="-4" y="-17" width="8" height="5" rx="1.2" fill="#dc2626" stroke={INK} strokeWidth="1.1" />
      <path d="M-3 -12 L3 -12 L4 -8 Q11 -6 11 2 L11 13 Q11 16 8 16 L-8 16 Q-11 16 -11 13 L-11 2 Q-11 -6 -4 -8 Z" fill="#fde047" stroke={INK} strokeWidth="1.3" />
      <rect x="-8" y="0" width="16" height="10" rx="2" fill="#fff" stroke={INK} strokeWidth=".8" />
      <path d="M-4 7 L0 1 L4 7 Z M-2 5 l4 0" fill="#ef4444" stroke="#7f1d1d" strokeWidth=".6" />
      <path d="M-8 -2 Q-9 6 -8 12" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  ),
  piranha: (
    <g strokeLinejoin="round">
      <path d="M-11 0 Q0 -14 12 -2 Q14 0 12 2 Q0 14 -11 0 Z" fill="#ef4444" stroke={INK} strokeWidth="1.3" />
      <path d="M-11 0 L-18 -7 L-17 0 L-18 7 Z" fill="#b91c1c" stroke={INK} strokeWidth="1.1" />
      <path d="M4 1 l2 2.5 l2 -2.5 l2 2.5" stroke="#fff" strokeWidth="1.2" fill="none" />
      <circle cx="5" cy="-4" r="2" fill="#fde047" stroke={INK} strokeWidth=".7" /><circle cx="5.4" cy="-4" r=".8" fill={INK} />
      <path d="M-4 -8 L-1 -13 L2 -8" fill="#b91c1c" stroke={INK} strokeWidth=".9" />
    </g>
  ),
};
