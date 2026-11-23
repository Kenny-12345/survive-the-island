import { motion } from 'framer-motion';
import { emit } from '../net';
import { scores, type GameState } from '../../../shared/game';
import type { RoomView } from '../../../shared/protocol';
import { Portrait } from './Art';
import { useSettings } from '../settings';

export function Results({ g, room, onClose }: { g: GameState; room: RoomView; onClose: () => void }) {
  const { lowFx, reducedMotion } = useSettings();
  const sc = scores(g).sort((a, b) => b.score - a.score || b.rescued - a.rescued);
  const winners = new Set(g.winners ?? []);
  const won = winners.has(room.you);
  const isHost = room.hostId === room.you;
  const mins = Math.max(1, Math.round(((g.endedAt ?? Date.now()) - g.startedAt) / 60000));
  const champ = g.players[g.winners?.[0] ?? sc[0].id];
  const nobody = winners.size === 0;
  return (
    <motion.div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#020b18]/80 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {!lowFx && !reducedMotion && won && Array.from({ length: 60 }, (_, i) => (
        <span key={i} className="pointer-events-none absolute top-0 h-3 w-2" style={{ left: `${(i * 17) % 100}%`, background: ['#ffd55c', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'][i % 5], animation: `confetti ${2.5 + (i % 5) * 0.4}s linear ${(i % 10) * 0.2}s infinite` }} />
      ))}
      <motion.div initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 14 }} className="panel relative w-full max-w-2xl p-5 text-center">
        <div className="title-font text-[clamp(2rem,7vw,3.5rem)] leading-none" style={{ color: won ? '#ffd55c' : '#fca5a5' }}>{won ? 'YOU SURVIVED!' : nobody ? 'NO SURVIVORS' : 'THE ISLAND IS GONE'}</div>
        <div className="mt-1 text-sm text-white/70">{g.endReason}</div>
        <div className="relative mx-auto mt-4 w-fit">
          <div className="absolute inset-0 -z-10 rounded-full bg-amber-300/40 blur-2xl" />
          <motion.div animate={reducedMotion ? undefined : { y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}><Portrait id={champ.character} size={110} /></motion.div>
          <div className="title-font text-2xl" style={{ color: champ.color }}>{nobody ? 'The sea claimed every adventurer…' : `👑 ${[...winners].map(w => g.players[w].name).join(' & ')}`}</div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-white/50"><tr><th className="text-left">Player</th><th>Score</th><th>Rescued</th><th>Lost</th><th>Values saved</th></tr></thead>
            <tbody>
              {sc.map((s, i) => {
                const p = g.players[s.id];
                const vals = g.explorers.filter(e => e.owner === s.id && e.status === 'rescued').map(e => e.value).join(', ');
                return (
                  <motion.tr key={s.id} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.12 }} className={`border-t border-white/10 ${winners.has(s.id) ? 'bg-amber-400/10' : ''}`}>
                    <td className="py-1.5 text-left"><span className="mr-1 inline-block h-3 w-3 rounded-full" style={{ background: p.color }} />{p.name}</td>
                    <td className="font-black text-amber-300">{s.score}</td><td>{s.rescued}</td><td>{s.lost}</td><td className="text-white/70">{vals || '—'}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl bg-black/25 p-2"><b className="block text-lg">{g.turn}</b>rounds</div>
          <div className="rounded-xl bg-black/25 p-2"><b className="block text-lg">{Object.values(g.tiles).filter(t => t.sunk).length}/40</b>tiles sunk</div>
          <div className="rounded-xl bg-black/25 p-2"><b className="block text-lg">{mins} min</b>duration</div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {isHost ? <button className="btn-primary title-font px-6 py-2 text-lg" onClick={() => emit('room:rematch')}>PLAY AGAIN</button>
            : <span className="panel px-3 py-2 text-sm text-white/70">Waiting for the host to start another round…</span>}
          <button className="btn-sea" onClick={onClose}>View final board</button>
          <button className="btn-ghost" onClick={() => emit('room:leave')}>Main menu</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
