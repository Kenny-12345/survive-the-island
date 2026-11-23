// Full-screen original key art for the menus and loading screen: a sunset sea, a smoking volcano island,
// a sea serpent rising in the foreground, a shark fin and a raft of adventurers fleeing to a rescue island.
// The important subjects sit near the centre so a portrait phone (which crops the sides) still shows them.
import { memo } from 'react';

const INK = '#1a0b14';

export const KeyArt = memo(function KeyArt({ still = false, dim = 0 }: { still?: boolean; dim?: number }) {
  const anim = !still;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id="ka-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#140f3d" /><stop offset="35%" stopColor="#4a2368" /><stop offset="62%" stopColor="#d9506a" /><stop offset="78%" stopColor="#ff9a55" /><stop offset="100%" stopColor="#ffd27a" />
          </linearGradient>
          <linearGradient id="ka-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2885f" /><stop offset="12%" stopColor="#8a4a7a" /><stop offset="45%" stopColor="#2b2c66" /><stop offset="100%" stopColor="#0b1638" />
          </linearGradient>
          <radialGradient id="ka-sun"><stop offset="0%" stopColor="#fffbe0" /><stop offset="55%" stopColor="#ffd36b" /><stop offset="100%" stopColor="#ff8a3d" /></radialGradient>
          <radialGradient id="ka-glow"><stop offset="0%" stopColor="#ffcf7a" stopOpacity=".75" /><stop offset="100%" stopColor="#ff8a3d" stopOpacity="0" /></radialGradient>
          <radialGradient id="ka-lava"><stop offset="0%" stopColor="#fff3a0" /><stop offset="40%" stopColor="#ff8a1f" /><stop offset="100%" stopColor="#ff3d1f" stopOpacity="0" /></radialGradient>
          <linearGradient id="ka-rock" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4b2f4a" /><stop offset="55%" stopColor="#2d1b33" /><stop offset="100%" stopColor="#1c1024" /></linearGradient>
          <linearGradient id="ka-jungle" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#2f6b4a" /><stop offset="60%" stopColor="#1b4436" /><stop offset="100%" stopColor="#112b28" /></linearGradient>
          <linearGradient id="ka-serp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6b5b" /><stop offset="100%" stopColor="#7a1028" /></linearGradient>
          <filter id="ka-soft"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>

        {/* sky */}
        <rect width="1600" height="900" fill="url(#ka-sky)" />
        {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 397) % 1600} cy={(i * 131) % 260} r={i % 5 === 0 ? 1.8 : 1} fill="#fff" opacity={0.25 + (i % 4) * 0.12} />)}
        <circle cx="1150" cy="555" r="260" fill="url(#ka-glow)" />
        <circle cx="1150" cy="560" r="120" fill="url(#ka-sun)" />
        {/* clouds lit from below */}
        {[[180, 210, 1], [640, 150, 0.8], [1330, 250, 1.1], [980, 330, 0.7]].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x},${y}) scale(${s})`} opacity=".9">
            <g className={anim ? 'ka-drift' : ''} style={{ animationDelay: `${-i * 9}s` }}>
              <path d="M-140 20 Q-120 -20 -70 -10 Q-50 -50 0 -36 Q40 -60 80 -26 Q130 -30 150 14 Q160 30 120 32 L-120 32 Q-150 32 -140 20 Z" fill="#7b3a78" />
              <path d="M-130 26 Q-60 12 0 22 Q70 12 140 24 L140 32 L-130 32 Z" fill="#ff9f7a" opacity=".75" />
            </g>
          </g>
        ))}
        {/* birds */}
        {[[520, 250], [560, 270], [600, 242]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} q8 -8 16 0 q8 -8 16 0`} stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" className={anim ? 'ka-bird' : ''} style={{ animationDelay: `${i * 0.25}s` }} />
        ))}

        {/* sea */}
        <rect y="560" width="1600" height="340" fill="url(#ka-sea)" />
        {/* sun reflection */}
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={1150 - (90 - i * 6)} y={572 + i * 13} width={180 - i * 12} height="3.5" rx="2" fill="#ffd98a" opacity={0.75 - i * 0.05}
            className={anim ? 'ka-glimmer' : ''} style={{ animationDelay: `${i * 0.17}s` }} />
        ))}
        {/* distant rescue island */}
        <g transform="translate(250,560)">
          <path d="M-90 2 Q-50 -30 0 -26 Q50 -32 95 2 Z" fill="#3a2350" />
          <path d="M-20 -26 V-60" stroke="#3a2350" strokeWidth="3" />
          <path d="M-20 -60 l22 7 l-22 7 Z" fill="#59f0a0" className={anim ? 'ka-flag' : ''} />
          <path d="M30 -28 q4 -20 2 -32" stroke="#3a2350" strokeWidth="3" fill="none" />
          <path d="M32 -60 q12 -6 22 2 M32 -60 q-12 -6 -20 4 M32 -60 q4 -12 14 -14" stroke="#3a2350" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>

        {/* the volcano island */}
        <g>
          {/* lava glow behind the peak */}
          <circle cx="870" cy="250" r="90" fill="url(#ka-lava)" opacity=".8" className={anim ? 'ka-pulse' : ''} />
          {/* smoke plume */}
          {Array.from({ length: 7 }, (_, i) => (
            <circle key={i} cx={870 + i * 12} cy={230 - i * 26} r={22 + i * 9} fill={i < 2 ? '#5b3a55' : '#4a3150'} opacity={0.85 - i * 0.08}
              className={anim ? 'ka-smoke' : ''} style={{ animationDelay: `${i * 0.6}s` }} filter="url(#ka-soft)" />
          ))}
          <path d="M610 565 Q700 420 800 300 L840 245 L900 245 L950 310 Q1050 430 1160 565 Z" fill="url(#ka-rock)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          {/* rim light from the sunset */}
          <path d="M900 245 L950 310 Q1050 430 1160 565" stroke="#ff9a6a" strokeWidth="4" fill="none" opacity=".7" />
          {/* crater + lava rivers */}
          <path d="M840 245 Q870 232 900 245 Q870 256 840 245 Z" fill="#ffb02e" />
          <path d="M858 250 Q850 300 820 340 Q800 380 810 420 M884 252 Q900 300 930 360" stroke="#ff7a1f" strokeWidth="6" fill="none" strokeLinecap="round" className={anim ? 'ka-pulse' : ''} />
          <path d="M858 250 Q850 300 820 340 Q800 380 810 420 M884 252 Q900 300 930 360" stroke="#ffe08a" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* jungle slopes */}
          <path d="M560 575 Q620 470 720 450 Q790 440 830 470 Q900 430 990 452 Q1110 470 1220 575 Z" fill="url(#ka-jungle)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          {Array.from({ length: 16 }, (_, i) => {
            const x = 600 + i * 38, y = 520 - Math.sin((i / 15) * Math.PI) * 60;
            return <circle key={i} cx={x} cy={y} r={20 + (i % 3) * 6} fill={i % 2 ? '#24573f' : '#2f6b4a'} stroke={INK} strokeWidth="2" />;
          })}
          {/* beach */}
          <path d="M520 585 Q640 548 900 552 Q1150 548 1280 585 Q900 600 520 585 Z" fill="#e7b77a" stroke={INK} strokeWidth="3" />
          <path d="M560 583 Q900 566 1240 583" stroke="#fff3d6" strokeWidth="2" fill="none" opacity=".7" />
          {/* palms */}
          {[[640, 560, -6], [700, 556, 4], [1110, 556, -3], [1180, 562, 7]].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x},${y}) rotate(${r})`}>
              <path d="M0 0 Q6 -40 2 -84" stroke={INK} strokeWidth="9" fill="none" strokeLinecap="round" />
              <path d="M0 0 Q6 -40 2 -84" stroke="#6b3f2a" strokeWidth="5" fill="none" strokeLinecap="round" />
              <g transform="translate(2,-84)" className={anim ? 'anim-sway' : ''} style={{ animationDelay: `${i * 0.7}s` }}>
                {[-70, -30, 10, 50, 170, 210].map(a => (
                  <path key={a} d="M0 0 Q22 -14 46 6" stroke={INK} strokeWidth="11" fill="none" strokeLinecap="round" transform={`rotate(${a})`} />
                ))}
                {[-70, -30, 10, 50, 170, 210].map(a => (
                  <path key={`l${a}`} d="M0 0 Q22 -14 46 6" stroke="#2c7a4b" strokeWidth="7" fill="none" strokeLinecap="round" transform={`rotate(${a})`} />
                ))}
              </g>
            </g>
          ))}
        </g>

        {/* raft of adventurers fleeing */}
        <g transform="translate(980,628) scale(.85)">
          <g className={anim ? 'ka-raft' : ''}>
            <path d="M-60 -2 Q-56 16 0 18 Q56 16 60 -2 Q0 -10 -60 -2 Z" fill="#6e3f17" stroke={INK} strokeWidth="3" />
            <path d="M-52 0 Q0 -6 52 0" stroke="#d99b5c" strokeWidth="3" fill="none" />
            {[['#ef4444', -30], ['#3b82f6', 0], ['#facc15', 28]].map(([c, x]) => (
              <g key={x as number} transform={`translate(${x},-4)`}>
                <path d="M-9 0 C-10 -12 -6 -16 0 -16 C6 -16 10 -12 9 0 Z" fill={c as string} stroke={INK} strokeWidth="2.4" />
                <circle cy="-22" r="7" fill={c as string} stroke={INK} strokeWidth="2.4" />
              </g>
            ))}
            <path d="M40 -6 L52 -40" stroke={INK} strokeWidth="4" strokeLinecap="round" />
            <path d="M52 -40 Q66 -20 50 -6" fill="#f5ead0" stroke={INK} strokeWidth="2.4" />
          </g>
          <path d="M-70 20 q12 -6 24 0 M50 22 q12 -6 24 0" stroke="#ffd2a0" strokeWidth="3" fill="none" opacity=".6" />
        </g>

        {/* shark fin circling */}
        <g transform="translate(760,700)">
          <g className={anim ? 'ka-fin' : ''}>
            <path d="M-20 6 Q-14 -30 8 -46 Q12 -48 12 -42 Q8 -18 20 6 Z" fill="#2b6b58" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <path d="M-12 2 Q-8 -24 6 -38" stroke="#8fe3c2" strokeWidth="3" fill="none" opacity=".7" />
            <path d="M-34 8 Q0 0 34 8" stroke="#ffd2a0" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".8" />
          </g>
        </g>

        {/* sea serpent rising in the foreground */}
        <g transform="translate(1420,780) scale(-.9,.9)">
          <g className={anim ? 'ka-serpent' : ''}>
            {[0, 120].map((x, i) => (
              <g key={i} transform={`translate(${x},0)`}>
                <path d="M-40 30 Q-38 -60 0 -62 Q38 -60 40 30" fill="none" stroke={INK} strokeWidth="44" strokeLinecap="round" />
                <path d="M-40 30 Q-38 -60 0 -62 Q38 -60 40 30" fill="none" stroke="url(#ka-serp)" strokeWidth="36" strokeLinecap="round" />
                <path d="M-26 10 Q-24 -44 0 -48" fill="none" stroke="#ffb4a0" strokeWidth="6" strokeLinecap="round" opacity=".55" />
                {[-24, -8, 8, 24].map(d => <path key={d} d={`M${d - 6} ${-74 + Math.abs(d) * 0.6} l6 -20 l6 20 Z`} fill="#ffc94a" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />)}
              </g>
            ))}
            {/* neck + head */}
            <path d="M230 30 Q236 -110 300 -150" fill="none" stroke={INK} strokeWidth="46" strokeLinecap="round" />
            <path d="M230 30 Q236 -110 300 -150" fill="none" stroke="url(#ka-serp)" strokeWidth="38" strokeLinecap="round" />
            <path d="M244 0 Q246 -90 290 -130" fill="none" stroke="#ffb4a0" strokeWidth="7" strokeLinecap="round" opacity=".55" />
            <g transform="translate(300,-160)">
              <path d="M-30 -18 L-48 -62 L-16 -30 L-10 -72 L6 -30 Z" fill="#ffc94a" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d="M-36 10 Q-40 -32 0 -36 Q50 -38 74 -14 L44 -6 L70 10 Q30 30 -10 24 Q-30 22 -36 10 Z" fill="url(#ka-serp)" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
              <path d="M44 -6 L74 -14 L70 10 Z" fill="#3a0612" />
              {[50, 58, 66].map(x => <path key={x} d={`M${x} -11 l3 7 l3 -7`} fill="#fff" />)}
              {[52, 60].map(x => <path key={x} d={`M${x} 9 l3 -7 l3 7`} fill="#fff" />)}
              <circle cx="12" cy="-16" r="10" fill="#ffe066" stroke={INK} strokeWidth="3" />
              <ellipse cx="14" cy="-16" rx="3" ry="8" fill={INK} />
              <circle cx="8" cy="-20" r="3" fill="#fff" />
              <path d="M-20 -6 Q0 -2 20 -4" stroke="#ffb4a0" strokeWidth="4" fill="none" opacity=".5" strokeLinecap="round" />
            </g>
          </g>
          {/* foam where the coils meet the water */}
          {[-40, 40, 80, 160, 230].map(x => <ellipse key={x} cx={x} cy="34" rx="28" ry="7" fill="#ffe9d6" opacity=".75" />)}
        </g>

        {/* foreground swell */}
        <g className={anim ? 'ka-swell' : ''}>
          <path d="M-100 820 Q100 780 300 815 T700 815 T1100 815 T1500 815 T1900 815 V900 H-100 Z" fill="#0a1433" />
          <path d="M-100 820 Q100 780 300 815 T700 815 T1100 815 T1500 815 T1900 815" stroke="#6c7bd6" strokeWidth="3" fill="none" opacity=".5" />
        </g>
        {dim > 0 && <rect width="1600" height="900" fill="#05061a" opacity={dim} />}
      </svg>
    </div>
  );
});
