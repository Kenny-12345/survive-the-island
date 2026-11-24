// Loading screen: the logo drops in over the key art while a raft sails along a rope progress line.
// Progress reflects real steps (fonts, server connection, profile/room restore), not a fake timer.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Logo } from './Screens';

const TIPS = [
  'Sharks only eat swimmers. A raft with someone aboard keeps you safe from them.',
  'Sea serpents sink whole rafts. Steer around them.',
  'Beaches sink first, then forests, then mountains.',
  'Three volcanoes and the game is over. Anyone still on the island scores nothing.',
  'Your treasure values are secret. Watch which adventurers your rivals protect.',
  'A raft goes to whoever has at least as many adventurers aboard as each rival.',
  'Keep an ability tile for the right moment. Most can be played on your turn.',
];

export function Loading({ connected, ready, onDone }: { connected: boolean; ready: boolean; onDone: () => void }) {
  const [fonts, setFonts] = useState(false);
  const [minShown, setMinShown] = useState(false);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  useEffect(() => { (document.fonts?.ready ?? Promise.resolve()).then(() => setFonts(true)); }, []);
  // a short floor so the intro reads as one moment instead of a flash
  useEffect(() => { const t = setTimeout(() => setMinShown(true), 1100); return () => clearTimeout(t); }, []);
  const steps = [fonts, connected, ready];
  const done = steps.filter(Boolean).length;
  const pct = Math.round((done / steps.length) * 100);
  // Hosted server sleeps when nobody plays. If it doesn't answer quickly, ask the site's wake function to
  // start it (keeps asking every 15s until the socket connects; socket.io keeps retrying on its own).
  const [waking, setWaking] = useState(false);
  const [wakeSecs, setWakeSecs] = useState(0);
  useEffect(() => {
    if (connected) return;
    const poke = () => fetch('/api/wake', { method: 'POST' }).then(r => (r.ok ? setWaking(true) : null)).catch(() => {});
    const first = setTimeout(poke, 2500);
    const again = setInterval(poke, 15000);
    const clock = setInterval(() => setWakeSecs(x => x + 1), 1000);
    return () => { clearTimeout(first); clearInterval(again); clearInterval(clock); };
  }, [connected]);
  const label = !fonts ? 'Unpacking the box…' : !connected ? (waking ? `Waking the island server… ${wakeSecs}s (up to a minute)` : 'Rowing to the server…') : !ready ? 'Finding your crew…' : 'Land ho!';
  useEffect(() => { if (done === steps.length && minShown) { const t = setTimeout(onDone, 350); return () => clearTimeout(t); } }, [done, minShown]); // eslint-disable-line

  return (
    <motion.div className="absolute inset-0 z-[80] flex flex-col items-center justify-center gap-10 bg-[#05061a]/45 p-6" exit={{ opacity: 0, transition: { duration: 0.45 } }}>
      <motion.div initial={{ y: -160, opacity: 0, rotate: -10, scale: 0.8 }} animate={{ y: 0, opacity: 1, rotate: -2, scale: 1 }} exit={{ y: -40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 10 }}>
        <Logo />
      </motion.div>
      <div className="w-[min(420px,86vw)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Loading">
        <div className="relative h-10">
          {/* rope */}
          <div className="absolute inset-x-0 top-[26px] h-[6px] rounded-full bg-[repeating-linear-gradient(60deg,#c69a5a_0_6px,#8a6230_6px_10px)] shadow-[0_2px_0_#2d1606]" />
          <motion.div className="absolute left-0 top-[26px] h-[6px] rounded-full bg-[repeating-linear-gradient(60deg,#ffe08a_0_6px,#f59e0b_6px_10px)]" animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
          {/* raft riding the rope */}
          <motion.div className="absolute top-0 -ml-6" animate={{ left: `${pct}%` }} transition={{ duration: 0.5 }}>
            <svg viewBox="-26 -22 52 34" className="anim-bob h-8 w-12" aria-hidden="true">
              <path d="M-22 0 Q-20 9 0 10 Q20 9 22 0 Q0 -5 -22 0 Z" fill="#6e3f17" stroke="#1a0f0a" strokeWidth="1.8" />
              <path d="M-19 1 Q0 -3 19 1" stroke="#d99b5c" strokeWidth="1.6" fill="none" />
              <path d="M8 -1 L12 -20" stroke="#1a0f0a" strokeWidth="2" /><path d="M12 -20 Q20 -10 10 -2" fill="#f5ead0" stroke="#1a0f0a" strokeWidth="1.4" />
              <circle cx="-6" cy="-6" r="3.4" fill="#ef4444" stroke="#1a0f0a" strokeWidth="1.2" /><path d="M-10 0 Q-10 -3 -6 -3 Q-2 -3 -2 0 Z" fill="#ef4444" stroke="#1a0f0a" strokeWidth="1.2" />
            </svg>
          </motion.div>
        </div>
        <div className="mt-2 flex justify-between text-sm font-bold text-[#ffe9c2] [text-shadow:0_2px_0_#0008]"><span>{label}</span><span>{pct}%</span></div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="parch mt-5 rounded-xl px-4 py-2 text-center text-sm font-semibold">
          <b>Tip:</b> {tip}
        </motion.p>
      </div>
    </motion.div>
  );
}
