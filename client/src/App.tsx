import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { call, toast, useStore } from './net';
import { Ocean, Weather } from './components/Ocean';
import { KeyArt } from './components/KeyArt';
import { Loading } from './components/Loading';
import { Collection, CreateRoom, HowTo, JoinRoom, MainMenu, ProfileScreen, PublicRooms, SettingsScreen, type Screen } from './components/Screens';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { unlock } from './audio';
import { setSettings, useSettings } from './settings';

export function App() {
  const { room, ready, toasts, connected } = useStore();
  const settings = useSettings();
  const [screen, setScreen] = useState<Screen>('menu');
  const [booted, setBooted] = useState(false);
  const invite = useRef(new URLSearchParams(location.search).get('room')?.toUpperCase() ?? null);

  // unlock audio on the first user gesture (never autoplay before interaction)
  useEffect(() => {
    const f = () => unlock();
    window.addEventListener('pointerdown', f, { once: true });
    window.addEventListener('keydown', f, { once: true });
    return () => { window.removeEventListener('pointerdown', f); window.removeEventListener('keydown', f); };
  }, []);
  // invitation link: ?room=CODE
  useEffect(() => {
    if (!ready || !invite.current || room) return;
    const code = invite.current;
    invite.current = null;
    history.replaceState(null, '', location.pathname);
    call<{ error?: string }>('room:join', { code }).then(r => { if (r.error) { toast(r.error, 'error'); setScreen('join'); } });
  }, [ready, room]);
  useEffect(() => { if (!room) setScreen(s => (s === 'create' || s === 'join' || s === 'public' ? 'menu' : s)); }, [room]);

  const back = () => setScreen('menu');
  const inGame = !!room?.game;
  return (
    <div className={`relative h-full w-full overflow-hidden ${settings.reducedMotion ? 'reduced-motion' : ''}`}>
      {inGame ? <Ocean island={false} monsters={false} /> : <><KeyArt still={settings.reducedMotion || settings.lowFx} dim={!booted ? 0.15 : screen === 'menu' && !room ? 0 : 0.45} /><Weather /></>}
      {inGame && <div className="pointer-events-none absolute inset-0 bg-[#2a1608]/80" />}
      <AnimatePresence initial={false}>
        {!booted ? (
          <Loading key="boot" connected={connected} ready={ready} onDone={() => setBooted(true)} />
        ) : room ? (room.game ? <motion.div key="game" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Game /></motion.div>
          : <motion.div key="lobby" className="absolute inset-0"><Lobby /></motion.div>) : (
          <motion.div key={screen} className="absolute inset-0">
            {screen === 'menu' && <MainMenu go={setScreen} onQuick={async () => { const r = await call<{ error?: string }>('room:quick'); if (r.error) toast(r.error, 'error'); }} />}
            {screen === 'profile' && <ProfileScreen onBack={back} />}
            {screen === 'howto' && <HowTo onBack={back} />}
            {screen === 'collection' && <Collection onBack={back} />}
            {screen === 'settings' && <SettingsScreen onBack={back} />}
            {screen === 'join' && <JoinRoom onBack={back} />}
            {screen === 'public' && <PublicRooms onBack={back} />}
            {screen === 'create' && <CreateRoom onBack={back} />}
          </motion.div>
        )}
      </AnimatePresence>
      {/* audio quick control */}
      {!inGame && <button className="btn-ghost absolute bottom-2 left-2 z-[60] h-9 w-9 p-0" onClick={() => { unlock(); setSettings({ muted: !settings.muted }); }} aria-label="Toggle sound">{settings.muted ? '🔇' : '🔊'}</button>}
      {!connected && ready && <div className="absolute left-1/2 top-2 z-[70] -translate-x-1/2 rounded-full bg-red-600 px-3 py-1 text-sm font-bold">Reconnecting…</div>}
      <div className="pointer-events-none absolute inset-x-0 top-14 z-[70] flex flex-col items-center gap-1">
        <AnimatePresence>{toasts.map(t => (
          <motion.div key={t.id} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            className={`rounded-xl px-4 py-2 text-sm font-bold shadow-lg ${t.kind === 'error' ? 'bg-red-600' : 'bg-[#13315c]'}`}>{t.text}</motion.div>
        ))}</AnimatePresence>
      </div>
    </div>
  );
}
