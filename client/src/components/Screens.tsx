// Menu-side screens: main menu, profile & leaderboard, how-to-play, collection, settings, join, public rooms, create.
import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { call, emit, toast, useStore, type ProfileData } from '../net';
import { CHARACTERS, charById } from '../../../shared/characters';
import { ALL_KINDS, KIND_COLOR, defaultSettings, normalizeSettings, type GameSettings, type Kind } from '../../../shared/game';
import type { PublicRoom } from '../../../shared/protocol';
import { Portrait, CreatureSprite, CREATURE_INFO, CREATURE_LABEL, DIE_COLOR, ABILITY_HELP, ABILITY_ICON, ABILITY_LABEL } from './Art';
import { AbilityIcon } from './Icons';
import { play } from '../audio';
import { setSettings, useSettings } from '../settings';

export type Screen = 'menu' | 'profile' | 'howto' | 'collection' | 'settings' | 'join' | 'public' | 'create';

export function Shell({ title, onBack, children, wide }: { title: string; onBack: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
      className="relative z-10 flex h-full items-start justify-center overflow-y-auto p-4 pt-8 scroll-thin">
      <div className={`wood w-full rounded-3xl ${wide ? 'max-w-4xl' : 'max-w-xl'} p-2`}>
        <div className="flex items-center gap-3 px-2 pb-2 pt-1">
          <button className="btn-wood rounded-xl px-3" onClick={() => { play('click'); onBack(); }} aria-label="Back">←</button>
          <h2 className="title-font text-3xl text-[#ffe08a] drop-shadow">{title}</h2>
        </div>
        <div className="rounded-2xl border-2 border-[#2d1606] bg-[#0d2238]/95 p-4 text-[#e6f4ff] shadow-[inset_0_2px_12px_rgba(0,0,0,.5)] [text-shadow:none]">{children}</div>
      </div>
    </motion.div>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`select-none ${small ? '' : 'text-center md:text-left'}`} aria-label="Survive The Island">
      <div className={`logo-text ${small ? 'text-5xl' : 'text-[clamp(3.2rem,9vw,6rem)]'}`}>SURVIVE</div>
      <div className={`logo-text -mt-1 ${small ? 'text-3xl' : 'text-[clamp(2.1rem,6vw,4rem)] md:ml-[.35em]'}`}>THE ISLAND</div>
      <div className={`ribbon title-font mt-3 inline-block bg-gradient-to-b from-[#e0413a] to-[#9b1c1c] text-white shadow-lg ${small ? 'text-xs' : 'text-sm md:text-base'}`}>with the Monster Pack</div>
    </div>
  );
}

export function MainMenu({ go, onQuick }: { go: (s: Screen) => void; onQuick: () => void }) {
  const { profile, connected } = useStore();
  const items: [string, string, () => void, boolean][] = [
    ['⚓', 'Play now', onQuick, true],
    ['🧭', 'Create room', () => go('create'), true],
    ['🔑', 'Join with code', () => go('join'), true],
    ['🌍', 'Public rooms', () => go('public'), true],
    ['📖', 'How to play', () => go('howto'), false],
    ['🐉', 'Creatures & heroes', () => go('collection'), false],
    ['⚙️', 'Settings', () => go('settings'), false],
  ];
  return (
    <motion.div className="relative z-10 flex h-full flex-col items-center justify-between gap-4 overflow-y-auto p-4 pb-14 md:items-start md:pb-6 md:justify-center md:px-[6vw] scroll-thin"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -40 }}>
      <motion.div initial={{ y: -120, opacity: 0, rotate: -8 }} animate={{ y: 0, opacity: 1, rotate: -2 }} transition={{ type: 'spring', stiffness: 140, damping: 11, delay: 0.05 }}>
        <Logo />
      </motion.div>
      <nav className="grid w-full max-w-[22rem] gap-2.5" aria-label="Main menu">
        {items.map(([icon, label, fn, online], i) => (
          <motion.button key={label} className={`plank ${i === 0 ? 'plank-gold sheen' : ''}`} disabled={!connected && online}
            initial={{ x: -80, opacity: 0, rotate: -3 }} animate={{ x: 0, opacity: 1, rotate: i % 2 ? 0.6 : -0.6 }} transition={{ delay: 0.35 + i * 0.07, type: 'spring', stiffness: 200, damping: 18 }}
            onMouseEnter={() => play('click')} onClick={() => { play('whoosh'); fn(); }}>
            <span className="w-7 text-center">{icon}</span>{label}
          </motion.button>
        ))}
        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }}
          className="wood mt-2 flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:brightness-110" onClick={() => go('profile')}>
          {profile && <div className="rounded-full bg-[#fde68a] p-[3px] shadow-[0_0_0_2px_#2d1606]"><div className="overflow-hidden rounded-full bg-[#14304f]"><Portrait id={profile.avatar} size={42} animate={false} /></div></div>}
          <div><div className="font-black">{profile?.name ?? '…'}</div><div className="text-xs text-[#ffe9c2]/75">Your profile · {profile?.wins ?? 0} {profile?.wins === 1 ? 'win' : 'wins'}</div></div>
          <span className="ml-auto text-[#ffe9c2]/60">✎</span>
        </motion.button>
        {!connected && <div className="chip mx-auto bg-red-600/90">Connecting to the server…</div>}
      </nav>
    </motion.div>
  );
}

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { profile } = useStore();
  const [name, setName] = useState(profile?.name ?? '');
  const [board, setBoard] = useState<ProfileData[]>([]);
  useEffect(() => { fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/api/leaderboard`).then(r => r.json()).then(setBoard).catch(() => setBoard([])); }, []);
  useEffect(() => { if (profile) setName(profile.name); }, [profile?.name]);
  if (!profile) return null;
  const fav = Object.entries(profile.charCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const save = (p: Partial<{ name: string; avatar: string }>) => {
    emit('profile:update', p);
    if (p.name) try { localStorage.setItem('sti-name', p.name); } catch { /* ignore */ }
    toast('Profile saved');
  };
  const stat = (l: string, v: ReactNode) => <div className="rounded-xl bg-black/25 p-3 text-center"><div className="title-font text-2xl text-[#ffe08a]">{v}</div><div className="text-xs text-white/60">{l}</div></div>;
  return (
    <Shell title="Player Profile" onBack={onBack} wide>
      <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
        <div>
          <div className="flex items-center gap-4">
            <Portrait id={profile.avatar} size={96} />
            <div className="flex-1">
              <label className="text-xs text-white/60">Username</label>
              <div className="flex gap-2"><input className="input" value={name} maxLength={16} onChange={e => setName(e.target.value)} />
                <button className="btn-primary" disabled={name.trim().length < 2} onClick={() => save({ name: name.trim() })}>Save</button></div>
            </div>
          </div>
          <div className="mt-3 text-xs text-white/60">Avatar</div>
          <div className="mt-1 grid grid-cols-8 gap-1">
            {CHARACTERS.map(c => (
              <button key={c.id} title={c.name} onClick={() => save({ avatar: c.id })} className={`rounded-lg p-0.5 ${profile.avatar === c.id ? 'bg-[#ffc93c]' : 'bg-white/5 hover:bg-white/15'}`}><Portrait id={c.id} size={36} animate={false} /></button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {stat('Games', profile.games)}{stat('Wins', profile.wins)}{stat('Losses', profile.losses)}
            {stat('Rescued', profile.rescued)}{stat('Lost', profile.lost)}{stat('Best score', profile.bestScore)}
          </div>
          <div className="mt-3 text-sm">Favorite character: <b>{fav ? charById(fav).name : '—'}</b></div>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.badges.length ? profile.badges.map(b => <span key={b} className="chip bg-gradient-to-r from-amber-400 to-orange-500 text-black">🏅 {b}</span>) : <span className="text-sm text-white/50">Play games to earn achievement badges.</span>}
          </div>
        </div>
        <div>
          <h3 className="title-font mb-2 text-xl">🏆 Leaderboard</h3>
          <div className="max-h-80 overflow-y-auto rounded-xl bg-black/25 scroll-thin">
            {board.length === 0 && <div className="p-4 text-sm text-white/50">No finished games yet.</div>}
            {board.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-2 border-b border-white/5 px-3 py-2 ${p.id === profile.id ? 'bg-amber-400/15' : ''}`}>
                <span className="w-6 text-center font-black text-white/70">{i + 1}</span>
                <Portrait id={p.avatar} size={28} animate={false} />
                <span className="flex-1 truncate font-bold">{p.name}</span>
                <span className="text-sm">{p.wins}W</span><span className="text-xs text-white/50">{p.rescued} saved</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function HowTo({ onBack }: { onBack: () => void }) {
  const sec = (t: string, body: ReactNode) => <div className="mb-4"><h3 className="title-font text-xl text-[#7dd3fc]">{t}</h3><div className="text-sm leading-relaxed text-white/85">{body}</div></div>;
  return (
    <Shell title="How to Play" onBack={onBack} wide>
      <div className="max-h-[70vh] overflow-y-auto pr-2 scroll-thin">
        {sec('Goal', <>The island is sinking! Lead your 10 adventurers to the <b>Rescue Islands</b> in the corners. Each one carries a secret treasure worth 1–5. When no adventurers are left to rescue, or when the <b>3rd of 4 volcanoes</b> erupts, the player whose rescued adventurers carry the most treasure wins. Ties share the victory.</>)}
        {sec('Setup', <>Take turns placing one adventurer at a time on an empty island tile (you choose which treasure value — nobody else can see it). Then each player places 2 rafts on empty water spaces next to the island. Sea serpents start on the board. With 2 players each player runs two colours (20 adventurers, 4 rafts).</>)}
        {sec('Your turn', <ol className="list-decimal pl-5">
          <li><b>Action:</b> make up to 3 one-space moves, split between your adventurers and rafts. <i>On foot</i>: island tile, raft or Rescue Island to another of those. <i>Swimming</i>: any move that starts or ends in the water — each adventurer may swim only once per turn, and swimmers <b>can</b> climb back onto land or aboard a raft. Move an empty raft, or one where you have at least as many adventurers as anyone else. You may also play any number of ability tiles.</li>
          <li><b>Rising Waters:</b> remove one tile — all beaches first, then forests, then mountains. Adventurers on it start swimming. Look at the back: <b>effects</b> happen at once (a creature, a raft, a whirlpool or a volcano); <b>abilities</b> go secretly into your hand for a later turn. If you have no adventurers left, remove 2 tiles.</li>
          <li><b>Creatures:</b> roll the creature die (red, green or blue). You <b>must</b> move a creature of that colour if one can move.</li>
        </ol>)}
        {sec('Creatures', <div className="grid gap-1">{ALL_KINDS.map(k => <div key={k} className="flex items-center gap-2"><svg viewBox="-34 -28 68 50" className="h-8 w-11 shrink-0"><CreatureSprite kind={k} /></svg><span><b style={{ color: DIE_COLOR[KIND_COLOR[k]] }}>{CREATURE_LABEL[k]}</b>{['kraken', 'ptero', 'whale'].includes(k) && <span className="text-amber-300"> (Monster Pack)</span>} — {CREATURE_INFO[k]}</span></div>)}
          <p className="mt-1 text-white/60">A creature stops as soon as it enters a space holding something it interacts with. Nothing can enter a Kaiju’s space except another Kaiju, which shoves the first one away.</p></div>)}
        {sec('Ability tiles', <ul className="grid gap-1">{(['paddles', 'dolphin', 'dive', 'die', 'repellent', 'piranha'] as const).map(a => <li key={a} className="flex items-start gap-2"><AbilityIcon kind={a} size={24} /><span><b>{ABILITY_LABEL[a]}</b> — {ABILITY_HELP[a]}</span></li>)}</ul>)}
        {sec('Monster Pack', <>Pick the creatures you want to face — at least one of each colour. When both creatures of a colour are in play, the die lets you move either one, and you choose which one a creature tile brings in. <b>Piranhas</b> replace a beach tile; when it is revealed, everyone is dealt piranha tiles to grow the swarm. <b>Eggs</b> replace two beach tiles; you place the egg in the sea and it hatches into a random creature at the start of your next turn.</>)}
        {sec('Controls', <>Tap one of your adventurers or a raft to see its legal moves (glowing spaces). Tap an ability card to use it. Drag to pan, scroll or pinch to zoom. Only you can see your own treasure values and ability tiles.</>)}
        {sec('Rules source', <>These rules follow the official Survive The Island and Monster Pack rulebooks. A few details the rulebooks only show in pictures (die faces, treasure split, island outline) and a few online adaptations (automatic Repellent, where a Kaiju shoves pieces) are listed in RULES.md.</>)}
      </div>
    </Shell>
  );
}

export function Collection({ onBack }: { onBack: () => void }) {
  const [sel, setSel] = useState(CHARACTERS[0].id);
  const c = charById(sel);
  return (
    <Shell title="Collection" onBack={onBack} wide>
      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="grid grid-cols-4 gap-2">
          {CHARACTERS.map(ch => (
            <motion.button whileHover={{ scale: 1.08, rotate: -2 }} key={ch.id} onClick={() => { play('click'); setSel(ch.id); }}
              className={`rounded-xl p-1 ${sel === ch.id ? 'bg-[#ffc93c]/90' : 'bg-white/5'}`}><Portrait id={ch.id} size={64} animate={sel === ch.id} /><div className="truncate text-[10px] font-bold">{ch.name}</div></motion.button>
          ))}
        </div>
        <motion.div key={sel} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl bg-black/25 p-4 text-center">
          <Portrait id={sel} size={150} />
          <div className="title-font text-3xl" style={{ color: c.aura }}>{c.name}</div>
          <div className="text-sm uppercase tracking-widest text-white/60">{c.title}</div>
          <p className="mt-2 text-sm">{c.description}</p>
          <p className="mt-2 text-xs text-white/50">Playable avatars are cosmetic expedition leaders — no rule changes in Classic mode.</p>
        </motion.div>
      </div>
      <h3 className="title-font mt-5 text-xl">Island threats (not playable)</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
        {ALL_KINDS.map(k => (
          <div key={k} className="rounded-xl border-2 bg-[#0b3d66] p-2 text-center" style={{ borderColor: DIE_COLOR[KIND_COLOR[k]] + '99' }}>
            <svg viewBox="-35 -30 70 50" className="mx-auto h-24 w-32"><CreatureSprite kind={k} /></svg>
            <div className="font-black">{CREATURE_LABEL[k]}{['kraken', 'ptero', 'whale'].includes(k) && <span className="ml-1 text-[10px] text-amber-300">MONSTER PACK</span>}</div><div className="text-xs text-white/70">{CREATURE_INFO[k]}</div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const s = useSettings();
  const slider = (label: string, k: 'music' | 'sfx' | 'ambient') => (
    <label className="flex items-center gap-3"><span className="w-28 text-sm">{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={s[k]} onChange={e => setSettings({ [k]: Number(e.target.value) })} className="flex-1 accent-amber-400" /></label>
  );
  const toggle = (label: string, k: 'muted' | 'reducedMotion' | 'lowFx' | 'cinematic', hint?: string) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2">
      <span><span className="text-sm font-bold">{label}</span>{hint && <span className="block text-xs text-white/50">{hint}</span>}</span>
      <input type="checkbox" checked={s[k]} onChange={e => setSettings({ [k]: e.target.checked })} className="h-5 w-5 accent-amber-400" /></label>
  );
  return (
    <Shell title="Settings" onBack={onBack}>
      <div className="grid gap-3">
        {slider('Music', 'music')}{slider('Sound effects', 'sfx')}{slider('Ambient', 'ambient')}
        {toggle('Mute all', 'muted')}
        {toggle('Reduced motion', 'reducedMotion', 'Disables camera moves, shakes and most animation')}
        {toggle('Low visual effects', 'lowFx', 'Fewer particles, clouds and bubbles (faster on old phones)')}
        {toggle('Cinematic camera', 'cinematic', 'Camera glides to sinking tiles and monster attacks')}
        <label className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-sm font-bold">Weather (cosmetic)
          <select className="input w-32" value={s.weather} onChange={e => setSettings({ weather: e.target.value as 'clear' })}><option value="clear">Clear</option><option value="rain">Rain</option><option value="storm">Storm</option></select></label>
      </div>
    </Shell>
  );
}

export function JoinRoom({ onBack, initial }: { onBack: () => void; initial?: string }) {
  const [code, setCode] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const join = async () => {
    setBusy(true);
    const r = await call<{ error?: string }>('room:join', { code: code.trim().toUpperCase() });
    setBusy(false);
    if (r.error) toast(r.error, 'error');
  };
  return (
    <Shell title="Join Room" onBack={onBack}>
      <div className="flex gap-2">
        <input className="input title-font text-center text-3xl tracking-[0.4em] uppercase" maxLength={5} placeholder="CODE" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && join()} autoFocus />
        <button className="btn-primary px-6" disabled={code.length < 5 || busy} onClick={join}>Join</button>
      </div>
      <p className="mt-3 text-sm text-white/60">Ask your host for the 5-letter room code, or open their invite link.</p>
    </Shell>
  );
}

export function PublicRooms({ onBack }: { onBack: () => void }) {
  const [rooms, setRooms] = useState<PublicRoom[] | null>(null);
  const load = () => call<PublicRoom[]>('room:list').then(r => setRooms(Array.isArray(r) ? r : []));
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, []);
  return (
    <Shell title="Public Rooms" onBack={onBack}>
      <div className="grid gap-2">
        {rooms === null && <div className="text-white/50">Searching the seas…</div>}
        {rooms?.length === 0 && <div className="rounded-xl bg-black/20 p-4 text-sm text-white/60">No public rooms right now. Create one and set it to Public!</div>}
        {rooms?.map(r => (
          <div key={r.code} className="flex items-center gap-3 rounded-xl bg-black/25 p-3">
            <div className="title-font text-2xl tracking-widest text-[#ffe08a]">{r.code}</div>
            <div className="flex-1 text-sm"><div className="font-bold">{r.host}'s room</div><div className="text-white/60">{r.mode}{r.monsterPack ? ' · Monster Pack' : ''} · {r.players}/{r.max}</div></div>
            <button className="btn-sea" disabled={r.inGame || r.players >= r.max} onClick={async () => { const x = await call<{ error?: string }>('room:join', { code: r.code }); if (x.error) toast(x.error, 'error'); }}>{r.inGame ? 'Playing' : 'Join'}</button>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function SettingsForm({ value, onChange, disabled }: { value: GameSettings; onChange: (s: GameSettings) => void; disabled?: boolean }) {
  const v = value;
  const set = (p: Partial<GameSettings>) => onChange(normalizeSettings({ ...v, ...p, creatures: { ...v.creatures, ...(p.creatures ?? {}) }, house: { ...v.house, ...(p.house ?? {}) } }));
  const row = (label: string, el: ReactNode) => <label className="flex items-center justify-between gap-2 text-sm"><span className="font-bold">{label}</span>{el}</label>;
  const toggleKind = (k: Kind) => {
    const next = { ...v.creatures, [k]: !v.creatures[k] };
    if (!ALL_KINDS.some(x => KIND_COLOR[x] === KIND_COLOR[k] && next[x])) return; // keep at least one per colour
    set({ creatures: next });
  };
  return (
    <fieldset disabled={disabled} className="grid gap-2 disabled:opacity-70">
      {row('Game mode', <select className="input w-44" value={v.mode} onChange={e => {
        const mode = e.target.value as GameSettings['mode'];
        // switching to Monster Pack from classic turns on the whole expansion; tweak below
        set(mode !== 'classic' && v.mode === 'classic' ? { mode, creatures: { ...v.creatures, kraken: true, ptero: true, whale: true }, piranhas: true, eggs: true } : { mode });
      }}>
        <option value="classic">Classic (base game)</option><option value="monster">Monster Pack</option><option value="custom">Custom (house rules)</option></select>)}
      {row('Max players', <select className="input w-44" value={v.maxPlayers} onChange={e => set({ maxPlayers: Number(e.target.value) })}>{[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select>)}
      {row('Room visibility', <select className="input w-44" value={v.isPublic ? 'pub' : 'priv'} onChange={e => set({ isPublic: e.target.value === 'pub' })}><option value="priv">Private (invite)</option><option value="pub">Public</option></select>)}
      {row('Turn timer', <select className="input w-44" value={v.turnTimer} onChange={e => set({ turnTimer: Number(e.target.value) })}>{[0, 30, 60, 90, 120].map(n => <option key={n} value={n}>{n ? `${n}s per step` : 'Off'}</option>)}</select>)}
      {row('Quick setup (auto-place)', <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={v.quickSetup} onChange={e => set({ quickSetup: e.target.checked })} />)}
      {v.mode !== 'classic' && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-2">
          <div className="mb-1 text-xs font-black uppercase text-emerald-300">Monster Pack: creatures (at least one per colour)</div>
          <div className="mb-1 grid grid-cols-3 gap-1">
            {(['serpent', 'shark', 'kaiju', 'kraken', 'ptero', 'whale'] as Kind[]).map(k => (
              <button type="button" key={k} onClick={() => toggleKind(k)} title={CREATURE_INFO[k]} aria-pressed={v.creatures[k]}
                className={`flex flex-col items-center rounded-lg border-2 p-1 text-[11px] font-bold transition ${v.creatures[k] ? 'bg-white/10' : 'opacity-40 grayscale'}`}
                style={{ borderColor: v.creatures[k] ? DIE_COLOR[KIND_COLOR[k]] : 'transparent' }}>
                <svg viewBox="-34 -28 68 50" className="h-8 w-12"><CreatureSprite kind={k} /></svg>{CREATURE_LABEL[k]}
              </button>
            ))}
          </div>
          {row('🐟 Piranha tiles', <input type="checkbox" className="h-5 w-5 accent-emerald-400" checked={v.piranhas} onChange={e => set({ piranhas: e.target.checked })} />)}
          {row('🥚 Egg tiles', <input type="checkbox" className="h-5 w-5 accent-emerald-400" checked={v.eggs} onChange={e => set({ eggs: e.target.checked })} />)}
        </div>
      )}
      {v.mode === 'custom' && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-2">
          <div className="mb-1 text-xs font-black uppercase text-amber-300">House rules (custom, not official)</div>
          {row('Strong swimmers (swim twice a turn)', <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={v.house.fastSwimmers} onChange={e => set({ house: { ...v.house, fastSwimmers: e.target.checked } })} />)}
          {row('Extra raft per player', <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={v.house.extraBoats} onChange={e => set({ house: { ...v.house, extraBoats: e.target.checked } })} />)}
          {row('Sudden eruption (1st volcano ends it)', <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={v.house.suddenVolcano} onChange={e => set({ house: { ...v.house, suddenVolcano: e.target.checked } })} />)}
        </div>
      )}
    </fieldset>
  );
}

export function CreateRoom({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState<GameSettings>(defaultSettings());
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Create Room" onBack={onBack}>
      <SettingsForm value={s} onChange={setS} />
      <button className="btn-primary title-font mt-4 w-full py-3 text-xl" disabled={busy} onClick={async () => { setBusy(true); const r = await call<{ error?: string }>('room:create', { settings: s }); setBusy(false); if (r.error) toast(r.error, 'error'); }}>CREATE ROOM</button>
    </Shell>
  );
}
