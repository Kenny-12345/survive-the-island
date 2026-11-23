// Living backdrop: sky, sun, clouds, distant island with swaying palms, layered waves, lurking monster
// silhouettes, birds, bubbles and optional cosmetic weather.
import { memo } from 'react';
import { useSettings } from '../settings';

function Waves({ color, top, dur, opacity = 1, amp = 14 }: { color: string; top: string; dur: number; opacity?: number; amp?: number }) {
  const d = `M0 ${amp} Q 150 0 300 ${amp} T 600 ${amp} T 900 ${amp} T 1200 ${amp} T 1500 ${amp} T 1800 ${amp} T 2100 ${amp} T 2400 ${amp} V 400 H 0 Z`;
  return (
    <div className="absolute left-0 w-[200%]" style={{ top, bottom: 0, opacity, animation: `waveX ${dur}s linear infinite` }}>
      <svg viewBox="0 0 2400 400" preserveAspectRatio="none" className="h-full w-full"><path d={d} fill={color} /></svg>
    </div>
  );
}

export const Ocean = memo(function Ocean({ island = true, monsters = true }: { island?: boolean; monsters?: boolean }) {
  const st = useSettings();
  const low = st.lowFx;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#123d73] via-[#3a8fc6] to-[#9fd8ef]" />
      <div className="absolute left-[72%] top-[10%] h-28 w-28 rounded-full bg-[#fff3c4] shadow-[0_0_120px_60px_rgba(255,220,140,0.45)]" />
      {!low && [0, 1, 2, 3].map(i => (
        <div key={i} className="absolute" style={{ top: `${6 + i * 7}%`, animation: `cloud ${70 + i * 25}s linear infinite`, animationDelay: `${-i * 22}s` }}>
          <div className="relative h-10 w-44 rounded-full bg-white/80 blur-[1px]"><div className="absolute -top-6 left-8 h-14 w-20 rounded-full bg-white/80" /><div className="absolute -top-3 left-24 h-10 w-14 rounded-full bg-white/80" /></div>
        </div>
      ))}
      {!low && [0, 1, 2].map(i => (
        <svg key={i} className="absolute" width="26" height="12" viewBox="0 0 26 12" style={{ top: `${18 + i * 4}%`, animation: `bird ${28 + i * 6}s linear infinite`, animationDelay: `${-i * 9}s` }}>
          <path d="M1 6 Q7 0 13 6 Q19 0 25 6" stroke="#1e293b" strokeWidth="2" fill="none" style={{ animation: 'flap .6s ease-in-out infinite', transformOrigin: 'center' }} />
        </svg>
      ))}
      {island && (
        <svg className="absolute left-1/2 top-[40%] w-[min(70vw,640px)] -translate-x-1/2" viewBox="0 0 600 160">
          <path d="M30 140 Q140 60 250 80 Q300 20 360 40 Q420 70 470 80 Q540 90 580 140 Z" fill="#1f6f3f" />
          <path d="M280 70 L330 10 L370 55 Z" fill="#5b4636" />
          <path d="M318 22 L330 10 L342 22 Z" fill="#f8fafc" />
          <path d="M10 145 Q300 110 590 145 L590 160 L10 160 Z" fill="#f4d9a6" />
          {[120, 170, 440, 500].map((x, i) => (
            <g key={x} transform={`translate(${x},${118 - (i % 2) * 8})`}>
              <path d="M0 0 Q4 -30 2 -50" stroke="#6b4423" strokeWidth="5" fill="none" />
              <g className="anim-sway" style={{ animationDelay: `${i * 0.6}s` }} transform="translate(2,-50)">
                {[-60, -20, 20, 60, 180].map(a => <path key={a} d="M0 0 Q18 -10 34 6" stroke="#2f9e44" strokeWidth="6" fill="none" strokeLinecap="round" transform={`rotate(${a})`} />)}
              </g>
            </g>
          ))}
        </svg>
      )}
      <Waves color="#2a86b8" top="52%" dur={26} opacity={0.9} />
      {monsters && !low && (
        <>
          <svg className="absolute top-[64%] w-64 opacity-30" viewBox="0 0 200 40" style={{ animation: 'lurk 48s linear infinite' }}><path d="M0 30 Q30 0 60 30 Q90 0 120 30 Q150 0 180 25 L200 20" stroke="#04213f" strokeWidth="12" fill="none" strokeLinecap="round" /></svg>
          <svg className="absolute top-[78%] w-40 opacity-25" viewBox="0 0 120 40" style={{ animation: 'lurk 30s linear infinite', animationDelay: '-14s' }}><path d="M0 22 Q60 -6 110 18 L120 8 L118 30 L110 24 Q60 44 0 22Z" fill="#04213f" /></svg>
        </>
      )}
      <Waves color="#1b6b9a" top="60%" dur={18} />
      <Waves color="#135582" top="70%" dur={13} amp={18} />
      <Waves color="#0b3d66" top="82%" dur={9} amp={10} />
      {!low && Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="absolute h-2 w-2 rounded-full border border-white/50" style={{ left: `${(i * 37) % 100}%`, bottom: `${(i * 13) % 20}%`, animation: `rise ${3 + (i % 4)}s ease-out infinite`, animationDelay: `${i * 0.7}s` }} />
      ))}
      <Weather />
    </div>
  );
});

export function Weather() {
  const { weather, lowFx } = useSettings();
  if (weather === 'clear' || lowFx) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#0b1220]/30" />
      {Array.from({ length: weather === 'storm' ? 90 : 50 }, (_, i) => (
        <span key={i} className="absolute top-0 h-6 w-px bg-white/40" style={{ left: `${(i * 53) % 100}%`, animation: `rain ${0.5 + (i % 5) * 0.1}s linear infinite`, animationDelay: `${(i % 10) * -0.13}s`, transform: 'rotate(10deg)' }} />
      ))}
      {weather === 'storm' && <div className="absolute inset-0 bg-white" style={{ animation: 'flash 9s linear infinite' }} />}
    </div>
  );
}
