import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { emit, inviteLink, toast, useStore } from '../net';
import { CHARACTERS, charById } from '../../../shared/characters';
import { PLAYER_COLORS } from '../../../shared/protocol';
import { Portrait } from './Art';
import { SettingsForm } from './Screens';
import { play } from '../audio';

const muted = new Set<string>();
export const isMuted = (id: string) => muted.has(id);

export function Chat({ compact }: { compact?: boolean }) {
  const { chat, room } = useStore();
  const [text, setText] = useState('');
  const [, force] = useState(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [chat.length]);
  const send = () => { if (text.trim()) { emit('chat', { text }); setText(''); } };
  const msgs = chat.filter(m => !muted.has(m.from));
  return (
    <div className={`flex min-h-0 flex-col ${compact ? 'h-full' : 'h-72'}`}>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-xl bg-black/25 p-2 text-sm scroll-thin">
        {msgs.map(m => (
          <div key={m.id} className={m.system ? 'text-xs italic text-white/50' : ''}>
            {!m.system && <b style={{ color: m.color }}>{m.name}: </b>}<span className="break-words">{m.text}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="mt-2 flex gap-1">
        <input className="input py-1.5 text-sm" maxLength={200} placeholder="Say something…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
        <button className="btn-sea px-3 py-1.5" onClick={send}>Send</button>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {['👍', '😂', '😱', '🦈', '🆘', '🎉', 'GG'].map(r => (
          <button key={r} className="rounded-lg bg-white/10 px-2 py-0.5 text-sm hover:bg-white/20" onClick={() => emit('chat', { text: r, reaction: true })}>{r}</button>
        ))}
      </div>
      {room && room.players.length > 1 && (
        <details className="mt-1 text-xs text-white/60"><summary className="cursor-pointer">Mute / report players</summary>
          {room.players.filter(p => p.id !== room.you).map(p => (
            <div key={p.id} className="flex items-center gap-2 py-0.5"><span className="flex-1">{p.name}</span>
              <button className="underline" onClick={() => { muted.has(p.id) ? muted.delete(p.id) : muted.add(p.id); force(x => x + 1); }}>{muted.has(p.id) ? 'Unmute' : 'Mute'}</button>
              <button className="underline" onClick={() => { const reason = prompt(`Report ${p.name} — reason?`); if (reason) emit('report', { id: p.id, reason }); }}>Report</button>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

export function Lobby() {
  const { room, connected } = useStore();
  if (!room) return null;
  const me = room.players.find(p => p.id === room.you)!;
  const isHost = room.hostId === room.you;
  const others = room.players.filter(p => !p.isHost);
  const canStart = room.players.length >= 2 && others.every(p => p.ready) && room.players.every(p => p.connected);
  const startHint = room.players.length < 2 ? 'Need at least 2 players' : !others.every(p => p.ready) ? 'Waiting for everyone to be ready' : !room.players.every(p => p.connected) ? 'A player is disconnected' : '';
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast('Copied!'); } catch { prompt('Copy this:', t); } };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 h-full overflow-y-auto p-3 md:p-6 scroll-thin">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="panel p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/60">Room code</div>
              <button onClick={() => copy(room.code)} className="title-font text-5xl tracking-[0.25em] text-[#ffe08a] drop-shadow hover:brightness-110" title="Copy code">{room.code}</button>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <button className="btn-sea" onClick={() => copy(inviteLink(room.code))}>🔗 Invite link</button>
              <button className="btn-ghost" onClick={() => emit('room:leave')}>Leave room</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <AnimatePresence>
              {room.players.map(p => (
                <motion.div layout key={p.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-3 rounded-xl border-2 bg-black/25 p-2" style={{ borderColor: p.color }}>
                  <Portrait id={p.character} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 truncate font-black">{p.isHost && <span title="Host">👑</span>}{p.name}{p.id === room.you && <span className="text-xs text-white/50">(you)</span>}</div>
                    <div className="text-xs text-white/60">{charById(p.character).name}</div>
                    <div className="mt-0.5 flex gap-1">
                      <span className={`chip ${p.connected ? 'bg-emerald-500/80' : 'bg-red-500/80'}`}>{p.connected ? 'online' : 'offline'}</span>
                      <span className={`chip ${p.ready || p.isHost ? 'bg-amber-400 text-black' : 'bg-white/15'}`}>{p.isHost ? 'host' : p.ready ? 'ready' : 'not ready'}</span>
                    </div>
                  </div>
                  {isHost && p.id !== room.you && (
                    <div className="flex flex-col gap-1">
                      <button className="rounded bg-white/10 px-2 text-xs hover:bg-white/20" onClick={() => emit('lobby:transfer', { id: p.id })}>Make host</button>
                      <button className="rounded bg-red-500/60 px-2 text-xs hover:bg-red-500" onClick={() => emit('lobby:kick', { id: p.id })}>Kick</button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {Array.from({ length: room.settings.maxPlayers - room.players.length }, (_, i) => (
              <div key={i} className="flex h-[76px] items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-sm text-white/40">Waiting for adventurer…</div>
            ))}
          </div>

          <h3 className="title-font mt-5 text-xl">Choose your leader</h3>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {CHARACTERS.map(c => (
              <motion.button key={c.id} whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }} onClick={() => { play('click'); emit('lobby:update', { character: c.id }); }}
                className={`rounded-xl p-1 ${me.character === c.id ? 'bg-[#ffc93c] shadow-[0_0_20px_rgba(255,201,60,.6)]' : 'bg-white/5 hover:bg-white/15'}`}>
                <Portrait id={c.id} size={56} animate={me.character === c.id} /><div className="truncate text-[10px] font-bold">{c.name}</div>
              </motion.button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-bold">Explorer color</span>
            {PLAYER_COLORS.map(c => {
              const taken = room.players.some(p => p.color === c && p.id !== room.you);
              return <button key={c} disabled={taken} onClick={() => emit('lobby:update', { color: c })} className={`h-7 w-7 rounded-full border-2 ${me.color === c ? 'border-white scale-110' : 'border-transparent'} disabled:opacity-20`} style={{ background: c }} aria-label={`color ${c}`} />;
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!isHost && <button className={me.ready ? 'btn-ghost title-font px-6 py-3 text-lg' : 'btn-primary title-font px-6 py-3 text-lg'} onClick={() => { play('place'); emit('lobby:ready', { ready: !me.ready }); }}>{me.ready ? 'NOT READY' : 'READY!'}</button>}
            {isHost && <button className="btn-primary title-font px-8 py-3 text-xl" disabled={!canStart || !connected} onClick={() => emit('lobby:start')}>START GAME</button>}
            {isHost && startHint && <span className="text-sm text-white/60">{startHint}</span>}
            {!isHost && <span className="text-sm text-white/60">Only the host can start the game.</span>}
          </div>
        </div>
        <div className="grid content-start gap-4">
          <div className="panel p-4">
            <h3 className="title-font mb-2 text-xl">Game settings {!isHost && <span className="text-sm text-white/50">(host only)</span>}</h3>
            <SettingsForm value={room.settings} disabled={!isHost} onChange={s => emit('lobby:settings', s)} />
          </div>
          <div className="panel p-4"><h3 className="title-font mb-2 text-xl">Room chat</h3><Chat /></div>
        </div>
      </div>
    </motion.div>
  );
}
