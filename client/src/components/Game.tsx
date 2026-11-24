import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { act, emit, onGameEvents, useStore } from '../net';
import { abilityPieces, abilityTargets, abilityUsable, boatTargets, creaturePaths, currentPlayer, explorerTargets, KIND_COLOR, movableOfColor,
  placeBoatTargets, placeExplorerTargets, RANGE, scores, sinkableTiles, VOLCANOES_TO_END,
  type Ability, type CColor, type GameEvent, type GameState, type Kind } from '../../../shared/game';
import { toPixel } from '../../../shared/hex';
import { Board, liftOf, type Camera, type Fx } from './Board';
import { ABILITY_HELP, ABILITY_ICON, ABILITY_LABEL, CREATURE_ICON, CREATURE_LABEL, CreatureSprite, DIE_COLOR, EFFECT_LABEL, Portrait } from './Art';
import { Chat } from './Lobby';
import { play, type Sfx } from '../audio';
import { setSettings, useSettings } from '../settings';
import { Results } from './Results';
import { AbilityIcon } from './Icons';

interface Banner { id: number; text: string; icon: string; color: string; sfx?: Sfx }
type Sel = { kind: 'explorer' | 'boat' | 'creature'; id: string } | null;
type AbilityMode = { tile: string; ability: Ability; target?: string } | null;
let uid = 0;
const PHASE_LABEL: Record<string, string> = {
  placeExplorers: 'Place adventurers', placeBoats: 'Place rafts', action: 'Action', sink: 'Rising Waters', roll: 'Creatures — roll',
  creature: 'Creatures — move', choose: 'Make a choice', ended: 'Game over',
};
const COLOR_NAME: Record<CColor, string> = { red: 'RED', green: 'GREEN', blue: 'BLUE' };

export function Game() {
  // the screen keeps rendering during its exit animation after the room returns to the lobby
  const { room } = useStore();
  return room?.game ? <GameView /> : null;
}

function GameView() {
  const { room, reactions } = useStore();
  const settings = useSettings();
  const reduced = settings.reducedMotion;
  const g = room!.game!;
  const me = room!.you;
  const colors = useMemo(() => Object.fromEntries(Object.values(g.players).map(p => [p.id, p.color])), [g.players]);
  const myTurn = currentPlayer(g) === me && g.phase !== 'ended';
  const [selected, setSelected] = useState<Sel>(null);
  const boardedFrom = useRef<string | null>(null); // selected adventurer's status before the latest update
  const [ability, setAbility] = useState<AbilityMode>(null);
  const [placeValue, setPlaceValue] = useState<number | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dice, setDice] = useState<{ face: CColor; key: number } | null>(null);
  const fitZoom = () => (window.innerWidth < window.innerHeight ? 1.4 : 0.92);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: fitZoom() });
  const [cPaths, setCPaths] = useState<Record<string, { xs: number[]; ys: number[]; n: number }>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [showResults, setShowResults] = useState(g.phase === 'ended');
  const [busy, setBusy] = useState(false);
  const shake = useAnimationControls();
  const gRef = useRef(g);
  gRef.current = g;
  const seenSink = useRef(new Set<string>());
  const focusTimer = useRef<number | undefined>(undefined);
  const [feed, setFeed] = useState<{ id: number; text: string; color: string }[]>([]);
  const [feedOpen, setFeedOpen] = useState(() => window.innerWidth >= 768);
  const log = useCallback((text: string, color = '#e2e8f0') => setFeed(f => [...f, { id: ++uid, text, color }].slice(-40)), []);

  /* ---------- reacting to server events (pure presentation; never affects rules) ---------- */
  const addFx = useCallback((f: Omit<Fx, 'id'>, ms = 2600) => {
    const x = { ...f, id: ++uid } as Fx;
    setFx(a => [...a, x].slice(-24));
    setTimeout(() => setFx(a => a.filter(y => y !== x)), ms);
  }, []);
  const banner = useCallback((text: string, icon: string, color: string, sfx?: Sfx) => {
    const b = { id: ++uid, text, icon, color, sfx };
    setBanners(a => (a.some(x => x.text === text) ? a : [...a, b].slice(-2)));
    if (sfx) play(sfx);
    setTimeout(() => setBanners(a => a.filter(x => x !== b)), 2200);
  }, []);
  // First game on this device: sample the frame rate for a few seconds and switch to low visual effects
  // if the board can't keep up (old laptops / school computers). Runs once; the player can undo it in Settings.
  useEffect(() => {
    if (settings.lowFx || settings.fxChecked) return;
    let frames = 0, raf = 0, start = 0;
    const tick = (t: number) => { if (!start) start = t; frames++; if (t - start < 4000) raf = requestAnimationFrame(tick); else done(t - start); };
    const done = (ms: number) => {
      if (document.hidden) return; // background tabs are throttled; try again next game
      const fps = (frames / ms) * 1000;
      setSettings({ fxChecked: true, ...(fps < 40 ? { lowFx: true } : {}) });
      if (fps < 40) banner('Low effects on for smoother play', '⚡', '#0ea5e9');
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(tick); }, 1500); // skip the opening animations
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const focus = useCallback((hex: string) => {
    if (!settings.cinematic || reduced) return;
    const p = toPixel(hex);
    const target = { x: p.x * 0.6, y: p.y * 0.6 };
    setCamera(c => ({ ...c, ...target }));
    // drift back to the overview unless the player moved the camera meanwhile
    clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => setCamera(c => (Math.abs(c.x - target.x) < 1 && Math.abs(c.y - target.y) < 1 ? { ...c, x: 0, y: 0 } : c)), 3200);
  }, [settings.cinematic, reduced]);
  const doShake = useCallback(() => { if (!reduced) shake.start({ x: [0, -8, 8, -6, 6, -3, 0], transition: { duration: 0.5 } }); }, [reduced, shake]);

  useEffect(() => onGameEvents((_seq, events: GameEvent[]) => {
    const st = gRef.current;
    const name = (pid: string) => (pid === me ? 'You' : st.players[pid]?.name ?? 'Someone');
    const late = reduced ? 0 : 1800; // let the sinking animation finish before revealing
    const pc = (pid: string) => st.players[pid]?.color ?? '#e2e8f0';
    for (const e of events) {
      // ---- text feed ----
      switch (e.t) {
        case 'turn': log(`— ${e.player === me ? 'Your' : `${name(e.player)}'s`} turn (round ${e.turn})`, pc(e.player)); break;
        case 'sink': log(`${name(e.player)} removed a ${e.terrain}: ${EFFECT_LABEL[e.effect]?.[0] ?? ''} ${e.effect === 'secret' ? 'a secret ability' : EFFECT_LABEL[e.effect]?.[1] ?? e.effect}`, pc(e.player)); break;
        case 'spawn': if (e.kind !== 'boat' && e.kind !== 'egg') log(`${CREATURE_ICON[e.kind]} A ${CREATURE_LABEL[e.kind]} appears`, DIE_COLOR[KIND_COLOR[e.kind]]); break;
        case 'eaten': log(`💀 ${name(e.owner)} lost an adventurer (${e.by === 'volcano' ? 'eruption' : e.by === 'whirlpool' ? 'whirlpool' : e.by === 'piranha' ? 'piranhas' : CREATURE_LABEL[e.by]})`, '#fca5a5'); break;
        case 'rescued': log(`🛟 ${name(e.owner)} rescued an adventurer`, '#86efac'); break;
        case 'ability': log(`${ABILITY_ICON[e.ability]} ${name(e.player)} played ${ABILITY_LABEL[e.ability]}`, '#5eead4'); break;
        case 'repel': log(`🧴 ${name(e.player)} repelled a ${CREATURE_LABEL[e.kind]}`, '#fde68a'); break;
        case 'die': log(`🎲 ${name(e.player)} rolled ${e.face.toUpperCase()}${e.why === 'egg' ? ' (egg hatching)' : ''}`, DIE_COLOR[e.face]); break;
        case 'boatDestroyed': log(`💥 A raft was destroyed`, '#fca5a5'); break;
        case 'capsize': log(`🌊 A whale smashed a raft`, '#93c5fd'); break;
        case 'volcano': log(`🌋 Volcano ${e.count} of ${VOLCANOES_TO_END} erupted`, '#fb923c'); break;
        case 'end': log(`🏁 ${e.reason}`, '#fde047'); break;
      }
      switch (e.t) {
        case 'turn':
          setSelected(null); setAbility(null);
          if (e.player === me) banner('YOUR TURN!', '🧭', '#22c55e', 'alert');
          break;
        case 'place': play('place'); break;
        case 'moveExplorer': play(st.tiles[e.to] && !st.tiles[e.to].sunk ? 'click' : 'splash'); break;
        case 'moveBoat': play('boat'); break;
        case 'push': play('splash'); break;
        case 'sink': {
          play('crack');
          setTimeout(() => play('sink'), 700);
          setTimeout(() => play('splash'), 1700);
          addFx({ type: 'sink', hex: e.hex, terrain: e.terrain, effect: e.effect }, 4200);
          focus(e.hex);
          if (!seenSink.current.has(e.terrain)) { seenSink.current.add(e.terrain); banner(e.terrain === 'beach' ? 'THE BEACHES ARE SINKING!' : e.terrain === 'forest' ? 'THE FORESTS ARE SINKING!' : 'THE MOUNTAINS CRUMBLE!', '🏝️', '#f97316'); }
          break;
        }
        case 'gain':
          if (e.player === me && e.ability) setTimeout(() => banner(`YOU FOUND: ${ABILITY_LABEL[e.ability!].toUpperCase()}`, ABILITY_ICON[e.ability!], '#059669', 'rescue'), late);
          else if (e.ability !== 'piranha') setTimeout(() => banner(`${name(e.player).toUpperCase()} KEEPS A SECRET TILE`, '❔', '#475569'), late);
          break;
        case 'ability':
          banner(`${name(e.player).toUpperCase()}: ${ABILITY_LABEL[e.ability].toUpperCase()}!`, ABILITY_ICON[e.ability], '#0d9488', 'click');
          break;
        case 'spawn':
          setTimeout(() => {
            if (e.kind === 'boat') banner('A RAFT WASHES UP!', '🛶', '#0ea5e9', 'boat');
            else if (e.kind === 'egg') banner('A MYSTERIOUS EGG!', '🥚', '#a16207', 'splash');
            else banner(`${CREATURE_LABEL[e.kind].toUpperCase()} APPEARS!`, CREATURE_ICON[e.kind], DIE_COLOR[KIND_COLOR[e.kind]], e.kind === 'shark' ? 'shark' : 'roar');
            addFx({ type: 'splash', hex: e.hex });
          }, late);
          break;
        case 'hatch': setTimeout(() => { banner('THE EGG HATCHES!', '🐣', '#a16207', 'roar'); addFx({ type: 'hatch', hex: e.hex }); focus(e.hex); }, 300); break;
        case 'whirlpool': setTimeout(() => { banner('WHIRLPOOL!', '🌀', '#0ea5e9', 'splash'); addFx({ type: 'whirl', hex: e.hex }); doShake(); }, late); break;
        case 'volcano': setTimeout(() => { banner(`VOLCANO ${e.count}/${VOLCANOES_TO_END} ERUPTS!`, '🌋', '#dc2626', 'roar'); addFx({ type: 'volcano', hex: e.hex }); doShake(); }, late); break;
        case 'piranha': setTimeout(() => { banner('PIRANHAS!', '🐟', '#b91c1c', 'shark'); addFx({ type: 'piranha', hex: e.hex }); }, late); break;
        case 'repel': banner(`${name(e.player).toUpperCase()} USED REPELLENT!`, '🧴', '#ca8a04', 'rescue'); addFx({ type: 'repel', hex: e.hex }); break;
        case 'creatureGone': if (e.by === 'piranha') addFx({ type: 'bite', hex: e.hex }); break;
        case 'eaten':
          if (e.hex) addFx({ type: 'bite', hex: e.hex, label: e.owner === me ? 'Adventurer lost!' : undefined });
          if (e.by !== 'volcano') play(e.by === 'shark' || e.by === 'piranha' ? 'shark' : 'roar');
          break;
        case 'rescued':
          addFx({ type: 'rescue', hex: e.hex, label: `${name(e.owner)} +1` });
          banner('ADVENTURER RESCUED!', '🛟', '#22c55e', 'rescue');
          break;
        case 'boatDestroyed': banner('RAFT DESTROYED!', '💥', '#dc2626', 'roar'); addFx({ type: 'bite', hex: e.hex }); focus(e.hex); doShake(); break;
        case 'capsize': banner('RAFT SMASHED!', '🌊', '#1e40af', 'splash'); addFx({ type: 'capsize', hex: e.hex }); focus(e.hex); break;
        case 'die': {
          play('dice');
          setDice({ face: e.face, key: ++uid });
          setTimeout(() => { if (!e.usable && e.why !== 'egg') banner(`No ${e.face} creature can move`, '🎲', '#475569'); }, reduced ? 0 : 1100);
          setTimeout(() => setDice(null), reduced ? 900 : 2300);
          break;
        }
        case 'creatureMove': {
          const xs = e.path.map(h => toPixel(h).x), ys = e.path.map(h => toPixel(h).y - 4 - liftOf(gRef.current, h));
          setCPaths(p => ({ ...p, [e.id]: { xs, ys, n: ++uid } }));
          setTimeout(() => setCPaths(p => { const q = { ...p }; delete q[e.id]; return q; }), 600 * e.path.length + 300);
          if (e.kind === 'kaiju' || e.kind === 'kraken') play('roar');
          break;
        }
        case 'end': {
          setTimeout(() => {
            const won = (gRef.current.winners ?? []).includes(me);
            banner(won ? 'FINAL SURVIVOR!' : 'GAME OVER', won ? '🏆' : '🌋', won ? '#eab308' : '#dc2626', won ? 'victory' : 'defeat');
          }, reduced ? 0 : 2000);
          setTimeout(() => setShowResults(true), reduced ? 800 : 3800);
          break;
        }
      }
    }
  }), [me, banner, addFx, focus, doShake, reduced, log]);

  useEffect(() => { if (g.phase !== 'ended') setShowResults(false); }, [g.phase]);
  // keep selection valid
  useEffect(() => {
    if (g.phase === 'creature' && myTurn) {
      const movers = movableOfColor(g, g.die!);
      if (movers.length === 1) setSelected({ kind: 'creature', id: movers[0].id });
      else if (selected?.kind !== 'creature' || !movers.some(m => m.id === selected.id)) setSelected(null);
    } else if (selected?.kind === 'creature') setSelected(null);
    if (selected?.kind === 'explorer' && !g.explorers.some(e => e.id === selected.id && ['land', 'boat', 'swimming'].includes(e.status))) setSelected(null);
    if (selected?.kind === 'boat' && !g.boats.some(b => b.id === selected.id)) setSelected(null);
    // Just climbed aboard? Hand the selection to the raft so the next tap sails it instead of
    // stepping the adventurer straight back off. Only when this player may steer that raft.
    if (selected?.kind === 'explorer' && g.phase === 'action' && myTurn) {
      const e = g.explorers.find(x => x.id === selected.id);
      if (e?.status === 'boat' && boardedFrom.current !== 'boat' && e.boat && boatTargets(g, me, e.boat).length) setSelected({ kind: 'boat', id: e.boat });
    }
    boardedFrom.current = selected?.kind === 'explorer' ? g.explorers.find(x => x.id === selected.id)?.status ?? null : null;
    if (ability && (!myTurn || g.phase !== 'action' || !(g.hands[me] ?? []).some(t => t.id === ability.tile))) setAbility(null);
  }, [g.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const myLeft = g.toPlace[me] ?? [];
  useEffect(() => { if (placeValue === null || !myLeft.includes(placeValue)) setPlaceValue(myLeft.length ? Math.max(...myLeft) : null); }, [myLeft.join(',')]); // eslint-disable-line

  /* ---------- legal targets for highlighting (server re-validates everything) ---------- */
  const abilityPieceIds = useMemo(() => (ability && !ability.target && ability.ability !== 'piranha' ? new Set(abilityPieces(g, me, ability.ability)) : null), [g, me, ability]);
  const { targets, tone } = useMemo(() => {
    const none = { targets: new Set<string>(), tone: 'move' as const };
    if (!myTurn) return none;
    if (g.phase === 'placeExplorers') return { targets: new Set(placeExplorerTargets(g)), tone: 'place' as const };
    if (g.phase === 'placeBoats') return { targets: new Set(placeBoatTargets(g)), tone: 'place' as const };
    if (g.phase === 'sink') return { targets: new Set(sinkableTiles(g)), tone: 'sink' as const };
    if (g.phase === 'choose' && g.pending) {
      const p = g.pending;
      if (p.type === 'egg') return { targets: new Set(p.options), tone: 'choose' as const };
      if (p.type === 'kraken') return { targets: new Set(p.options.map(id => g.explorers.find(e => e.id === id)?.hex).filter(Boolean) as string[]), tone: 'choose' as const };
      if (p.type === 'raftPick') return { targets: new Set(p.options.map(id => g.boats.find(b => b.id === id)?.hex).filter(Boolean) as string[]), tone: 'choose' as const };
      if (p.type === 'spawn') return { targets: new Set(p.options.filter(o => o.startsWith('move:')).map(o => g.creatures.find(c => c.id === o.slice(5))?.hex).filter(Boolean) as string[]), tone: 'choose' as const };
    }
    if (g.phase === 'creature') {
      if (selected?.kind === 'creature') return { targets: new Set(Object.keys(creaturePaths(g, selected.id))), tone: 'creature' as const };
      return { targets: new Set(movableOfColor(g, g.die!).map(c => c.hex)), tone: 'choose' as const };
    }
    if (g.phase === 'action' && ability) {
      if (abilityPieceIds) {
        const hexes = [...abilityPieceIds].map(id => g.explorers.find(e => e.id === id)?.hex ?? g.boats.find(b => b.id === id)?.hex ?? g.creatures.find(c => c.id === id)?.hex).filter(Boolean) as string[];
        return { targets: new Set(hexes), tone: 'choose' as const };
      }
      return { targets: new Set(abilityTargets(g, me, ability.ability, ability.target)), tone: 'ability' as const };
    }
    if (g.phase === 'action' && selected?.kind === 'explorer') return { targets: new Set(explorerTargets(g, me, selected.id)), tone: 'move' as const };
    if (g.phase === 'action' && selected?.kind === 'boat') return { targets: new Set(boatTargets(g, me, selected.id)), tone: 'move' as const };
    return none;
  }, [g, myTurn, selected, me, ability, abilityPieceIds]);
  const danger = useMemo(() => new Set([...g.creatures.filter(c => c.kind !== 'whale').map(c => c.hex), ...g.piranhas]), [g.creatures, g.piranhas]);

  const send = async (a: Parameters<typeof act>[0]) => {
    if (busy) return;
    setBusy(true);
    await act(a);
    setBusy(false);
  };
  /** Pick the piece on hex k that the current ability mode can target. */
  const abilityPieceAt = (k: string) => {
    if (!abilityPieceIds) return null;
    const ids = [...g.explorers.filter(e => e.hex === k).map(e => e.id), ...g.boats.filter(b => b.hex === k).map(b => b.id), ...g.creatures.filter(c => c.hex === k).map(c => c.id)];
    return ids.find(id => abilityPieceIds.has(id)) ?? null;
  };
  const onHex = (k: string) => {
    if (!myTurn) {
      const own = g.explorers.filter(e => e.hex === k && e.owner === me);
      if (own.length) setSelected({ kind: 'explorer', id: own[0].id });
      return;
    }
    if (g.phase === 'choose' && g.pending && targets.has(k)) {
      const p = g.pending;
      play('click');
      if (p.type === 'egg') return send({ type: 'choose', option: k });
      if (p.type === 'kraken') { const e = g.explorers.find(x => x.hex === k && p.options.includes(x.id)); if (e) return send({ type: 'choose', option: e.id }); }
      if (p.type === 'raftPick') { const b = g.boats.find(x => x.hex === k && p.options.includes(x.id)); if (b) return send({ type: 'choose', option: b.id }); }
      if (p.type === 'spawn') { const c = g.creatures.find(x => x.hex === k && p.options.includes(`move:${x.id}`)); if (c) return send({ type: 'choose', option: `move:${c.id}` }); }
      return;
    }
    if (g.phase === 'action' && ability) {
      if (abilityPieceIds) {
        const id = abilityPieceAt(k);
        if (id) { play('click'); setAbility({ ...ability, target: id }); }
        return;
      }
      if (targets.has(k)) { play('click'); setAbility(null); return send({ type: 'useAbility', tile: ability.tile, target: ability.target, to: k }); }
      return;
    }
    if (g.phase === 'creature' && !selected && targets.has(k)) {
      const c = movableOfColor(g, g.die!).find(x => x.hex === k);
      if (c) { setSelected({ kind: 'creature', id: c.id }); play('click'); }
      return;
    }
    if (targets.has(k)) {
      play('click');
      if (g.phase === 'placeExplorers' && placeValue != null) return send({ type: 'placeExplorer', to: k, value: placeValue });
      if (g.phase === 'placeBoats') return send({ type: 'placeBoat', to: k });
      if (g.phase === 'sink') return send({ type: 'sink', hex: k });
      if (selected?.kind === 'creature') return send({ type: 'moveCreature', id: selected.id, to: k });
      if (selected?.kind === 'explorer') return send({ type: 'moveExplorer', id: selected.id, to: k });
      if (selected?.kind === 'boat') return send({ type: 'moveBoat', id: selected.id, to: k });
    }
    // select something on this hex: cycle through own adventurers, then a raft
    if (g.phase !== 'action' && g.phase !== 'creature') return;
    if (g.phase === 'creature') {
      const c = movableOfColor(g, g.die!).find(x => x.hex === k);
      if (c) setSelected({ kind: 'creature', id: c.id });
      return;
    }
    const own = g.explorers.filter(e => e.hex === k && e.owner === me && ['land', 'boat', 'swimming'].includes(e.status));
    const boat = g.boats.find(b => b.hex === k);
    const opts = [...own.map(e => ({ kind: 'explorer' as const, id: e.id })), ...(boat ? [{ kind: 'boat' as const, id: boat.id }] : [])];
    if (!opts.length) return setSelected(null);
    const idx = opts.findIndex(o => o.kind === selected?.kind && o.id === selected?.id);
    setSelected(opts[(idx + 1) % opts.length]);
    play('click');
  };
  const onPiece = (kind: 'explorer' | 'boat' | 'creature', id: string) => {
    const hex = kind === 'explorer' ? g.explorers.find(x => x.id === id)?.hex : kind === 'boat' ? g.boats.find(x => x.id === id)?.hex : g.creatures.find(x => x.id === id)?.hex;
    if (!hex) return;
    if (ability && abilityPieceIds?.has(id)) { play('click'); setAbility({ ...ability, target: id }); return; }
    // outside movement, a tap on a piece means its space (sinking a tile, placing, choosing…)
    if (ability || (g.phase !== 'action' && g.phase !== 'creature')) return onHex(hex);
    if (kind === 'creature') {
      const c = g.creatures.find(x => x.id === id)!;
      if (myTurn && g.phase === 'creature' && KIND_COLOR[c.kind] === g.die && movableOfColor(g, g.die!).some(m => m.id === id)) { setSelected({ kind, id }); play('click'); }
      else if (targets.has(c.hex)) onHex(c.hex);
      return;
    }
    if (kind === 'explorer') {
      const e = g.explorers.find(x => x.id === id)!;
      if (e.owner !== me || (selected && targets.has(e.hex!))) return onHex(e.hex!);
      if (selected?.kind === 'explorer' && selected.id === id && e.status === 'boat') { const b = g.boats.find(x => x.id === e.boat); if (b) return setSelected({ kind: 'boat', id: b.id }); }
      setSelected({ kind, id }); play('click');
      return;
    }
    const b = g.boats.find(x => x.id === id)!;
    if (selected && selected.id !== id && targets.has(b.hex)) return onHex(b.hex);
    setSelected({ kind, id }); play('click');
  };

  // timer
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const timeLeft = g.turnDeadline ? Math.max(0, Math.ceil((g.turnDeadline - now) / 1000)) : null;

  const cur = g.players[currentPlayer(g)];
  const sc = scores(g);
  const selExplorer = selected?.kind === 'explorer' ? g.explorers.find(e => e.id === selected.id) : null;
  const zoom = (f: number) => setCamera(c => ({ ...c, zoom: Math.min(3, Math.max(0.55, c.zoom * f)) }));
  const hand = g.hands[me] ?? [];

  const volcanoMax = g.settings.mode === 'custom' && g.settings.house.suddenVolcano ? 1 : VOLCANOES_TO_END;
  const playerCards = sc.map(s => {
    const p = g.players[s.id];
    const conn = room!.players.find(x => x.id === s.id)?.connected;
    const isCur = s.id === cur.id && g.phase !== 'ended';
    return (
      <motion.div key={s.id} layout animate={{ x: isCur ? -8 : 0 }} className={`wood flex items-center gap-2 rounded-2xl py-1 pl-1 pr-3 ${isCur ? 'turn-glow' : 'opacity-90'}`}>
        <div className="relative shrink-0 rounded-full p-[3px]" style={{ background: p.color, boxShadow: '0 0 0 2px #2d1606' }}>
          <div className="overflow-hidden rounded-full bg-[#14304f]"><Portrait id={p.character} size={34} animate={false} /></div>
          {!conn && <span className="absolute -bottom-1 -right-1 text-xs" title="disconnected">📴</span>}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="max-w-[110px] truncate text-[13px] font-black">{p.name}{s.id === me && <span className="ml-1 text-[10px] text-amber-200">(you)</span>}</div>
          <div className="flex gap-2 text-[11px] font-bold text-[#ffe9c2]">
            <span title="Adventurers still on the board">🧍{s.remaining}</span><span title="Rescued">🛟{s.rescued}</span><span title="Lost">💀{s.lost}</span>
            <span title="Ability tiles in hand">🂠{g.hands[s.id]?.length ?? 0}</span>
            {s.id === me && <span title="Your treasure so far (secret to others)" className="text-amber-300">★{s.score}</span>}
          </div>
        </div>
      </motion.div>
    );
  });

  return (
    <div className="relative z-10 flex h-full flex-col">
      {/* top HUD */}
      <div className="pointer-events-none z-20 flex flex-wrap items-start gap-2 px-2 pt-2 md:px-3 [&>*]:pointer-events-auto">
        <motion.div key={cur.id} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="wood flex items-center gap-2.5 rounded-2xl py-1.5 pl-1.5 pr-3">
          <div className="shrink-0 rounded-full p-[3px]" style={{ background: cur.color, boxShadow: '0 0 0 2px #2d1606' }}>
            <div className="overflow-hidden rounded-full bg-[#14304f]"><Portrait id={cur.character} size={40} animate={false} /></div>
          </div>
          <div className="leading-tight">
            <div className="title-font text-lg tracking-wide" style={{ color: cur.id === me ? '#fde68a' : '#fff4dc' }}>{g.phase === 'ended' ? 'Game over' : cur.id === me ? 'Your turn' : `${cur.name}'s turn`}</div>
            <div className="text-[11px] font-bold text-[#ffe9c2]/80">Round {g.turn} · {PHASE_LABEL[g.phase]}</div>
          </div>
          {g.phase === 'action' && <div className="ml-1 flex gap-1" title="Moves left">{[0, 1, 2].map(i => (
            <span key={i} className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] ${i < g.movesLeft ? 'border-amber-200 bg-gradient-to-b from-amber-300 to-amber-600 shadow-[0_0_8px_#fbbf24]' : 'border-[#2d1606] bg-black/30 opacity-60'}`}>👣</span>))}</div>}
          {timeLeft !== null && <span className={`chip ${timeLeft <= 5 ? 'animate-pulse bg-red-600' : 'bg-black/30'}`}>⏱ {timeLeft}s</span>}
        </motion.div>
        <div className="wood flex items-center gap-1 rounded-2xl px-2.5 py-1.5" title={`The game ends when volcano ${volcanoMax} erupts`}>
          {Array.from({ length: volcanoMax }, (_, i) => (
            <VolcanoIcon key={i} lit={i < g.volcanoes.length} />
          ))}
        </div>
        <div className="flex flex-1 flex-wrap justify-end gap-1.5 md:hidden">{playerCards}</div>
      </div>

      {/* board */}
      <motion.div animate={shake} className="relative -mt-16 min-h-0 flex-1">
        <Board g={g} me={me} colors={colors} targets={targets} targetTone={tone} selected={selected} onHex={onHex} onPiece={onPiece}
          fx={fx} camera={camera} setCamera={setCamera} creaturePaths={cPaths} reduced={reduced} dangerHexes={danger} />
        <div className="vignette pointer-events-none absolute inset-0" />
        <div className="absolute right-3 top-3 hidden flex-col items-end gap-2 md:flex">{playerCards}</div>
        <div className="absolute bottom-3 right-3 flex flex-col gap-2">
          <button className="btn-round text-base" onClick={() => setSettings({ muted: !settings.muted })} aria-label="Toggle sound">{settings.muted ? '🔇' : '🔊'}</button>
          <button className="btn-round" onClick={() => zoom(1.2)} aria-label="Zoom in">+</button>
          <button className="btn-round" onClick={() => zoom(0.83)} aria-label="Zoom out">−</button>
          <button className="btn-round text-sm" onClick={() => setCamera({ x: 0, y: 0, zoom: fitZoom() })} aria-label="Reset view">⟲</button>
        </div>
        {/* hand of ability tiles (hexagons, like the real tiles) */}
        {hand.length > 0 && (
          <div className="absolute bottom-3 left-3 flex max-w-[70vw] flex-wrap items-end gap-1">
            {hand.map(t => {
              const usable = myTurn && !!t.kind && abilityUsable(g, me, t.kind);
              const active = ability?.tile === t.id;
              return (
                <motion.button key={t.id} layout initial={{ y: 60, opacity: 0, rotate: -20 }} animate={{ y: active ? -12 : 0, opacity: 1, rotate: 0 }} whileHover={usable ? { y: -8, scale: 1.06 } : undefined}
                  disabled={!usable || busy} title={t.kind ? ABILITY_HELP[t.kind] : ''}
                  onClick={() => {
                    if (!t.kind) return;
                    play('click');
                    if (active) return setAbility(null);
                    setSelected(null);
                    if (t.kind === 'die') { setAbility(null); return send({ type: 'useAbility', tile: t.id }); }
                    setAbility({ tile: t.id, ability: t.kind });
                  }}
                  className={`relative flex w-[66px] flex-col items-center disabled:cursor-default ${usable || active ? '' : 'opacity-70 grayscale-[.5]'}`}>
                  <div className="hex-clip h-[62px] w-[56px] p-[3px] drop-shadow-[0_5px_4px_rgba(0,0,0,.55)]" style={{ background: active ? '#fff' : usable ? '#a7f3d0' : '#475569' }}>
                    <div className="hex-clip flex h-full w-full items-center justify-center text-[26px]" style={{ background: active ? 'linear-gradient(160deg,#34d399,#047857)' : 'linear-gradient(160deg,#10b981,#065f46 70%,#064e3b)' }}>
                      {t.kind ? <AbilityIcon kind={t.kind} size={36} /> : '❔'}
                    </div>
                  </div>
                  <span className="parch -mt-2 rounded-md px-1.5 text-[10px] font-black leading-4">{t.kind ? ABILITY_LABEL[t.kind] : '?'}{t.kind === 'repellent' && <span className="font-normal opacity-60"> · auto</span>}</span>
                </motion.button>
              );
            })}
          </div>
        )}
        {/* reactions */}
        <div className="pointer-events-none absolute bottom-28 left-4 flex flex-col-reverse gap-1">
          <AnimatePresence>{reactions.map(r => (
            <motion.div key={r.key} initial={{ x: -40, opacity: 0, scale: 0.6 }} animate={{ x: 0, opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="parch rounded-xl px-2 py-1 text-sm">
              <b style={{ color: r.color }}>{r.name}</b> <span className="text-xl">{r.text}</span>
            </motion.div>))}</AnimatePresence>
        </div>
        <ChatPeek open={chatOpen} />
        {/* captain's log */}
        <div className="absolute left-2 top-20 z-10 w-[min(250px,60vw)]">
          <button className="btn-wood mb-1 rounded-lg px-2 py-0.5 text-xs" onClick={() => setFeedOpen(o => !o)} aria-expanded={feedOpen}>📜 {feedOpen ? 'Captain’s log ▴' : 'Log ▾'}</button>
          <AnimatePresence>{feedOpen && feed.length > 0 && (
            <motion.div initial={{ opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0.6 }} style={{ originY: 0 }}
              className="parch max-h-44 overflow-y-auto rounded-xl px-2.5 py-1.5 text-[11px] font-semibold leading-snug scroll-thin" ref={el => { if (el) el.scrollTop = el.scrollHeight; }}>
              {feed.slice(-14).map(f => <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="border-b border-[#7a4a20]/15 py-[1px] last:border-0" style={{ color: logInk(f.color) }}>{f.text}</motion.div>)}
            </motion.div>
          )}</AnimatePresence>
        </div>
      </motion.div>

      {/* action tray */}
      <div className="wood z-20 rounded-t-3xl px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2.5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2">
          {myTurn ? <ActionBar g={g} me={me} busy={busy} send={send} placeValue={placeValue} setPlaceValue={setPlaceValue} selExplorer={selExplorer}
            selected={selected} ability={ability} setAbility={setAbility} />
            : g.phase !== 'ended' && <div className="parch flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"><span className="inline-block h-2 w-2 animate-ping rounded-full" style={{ background: cur.color }} />Waiting for <b style={{ color: logInk(cur.color) }}>{cur.name}</b> — {PHASE_LABEL[g.phase].toLowerCase()}…</div>}
          {g.phase === 'ended' && <button className="btn-primary sheen title-font px-6 text-lg" onClick={() => setShowResults(true)}>🏆 Show results</button>}
          <button className="btn-wood rounded-xl" onClick={() => setChatOpen(o => !o)}>💬 Chat</button>
          <button className="btn-wood rounded-xl text-xs" onClick={() => { if (confirm('Leave this game? Your turns will be auto-played.')) emit('room:leave'); }}>🚪 Leave</button>
        </div>
      </div>

      {/* chat drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} className="wood absolute bottom-24 right-2 top-20 z-30 flex w-[min(320px,92vw)] flex-col rounded-2xl p-3">
            <div className="mb-2 flex items-center justify-between"><b className="title-font text-lg">Room chat</b><button className="btn-wood rounded-lg px-2 py-0.5" onClick={() => setChatOpen(false)}>✕</button></div>
            <div className="min-h-0 flex-1"><Chat compact /></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* banners */}
      <div className="pointer-events-none absolute inset-x-0 top-[22%] z-40 flex flex-col items-center gap-2">
        <AnimatePresence>
          {banners.map(b => (
            <motion.div key={b.id} initial={{ scaleX: 0.2, opacity: 0, y: -20 }} animate={{ scaleX: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="drop-shadow-[0_10px_18px_rgba(0,0,0,.55)]">
              <div className="ribbon title-font flex items-center gap-3 text-center text-[clamp(1.15rem,4.4vw,2.4rem)] text-white"
                style={{ background: `linear-gradient(180deg, ${b.color} 0%, ${b.color} 55%, #00000055 140%)`, textShadow: '0 3px 0 #0009, 0 0 12px #0006' }}>
                <motion.span initial={{ rotate: -30, scale: 0.4 }} animate={{ rotate: 0, scale: 1.15 }} transition={{ type: 'spring', stiffness: 400, damping: 10, delay: 0.1 }}>{b.icon}</motion.span>{b.text}
              </div>
              <div className="mx-6 h-1.5 rounded-b-md bg-black/40" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>{dice && <Dice key={dice.key} face={dice.face} kinds={g.inPlay} reduced={reduced} />}</AnimatePresence>
      <AnimatePresence>{showResults && g.phase === 'ended' && <Results g={g} room={room!} onClose={() => setShowResults(false)} />}</AnimatePresence>
    </div>
  );
}

/** Log colours are tuned for dark backgrounds; darken them so they read on parchment. */
function logInk(c: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return '#3b2412';
  const n = parseInt(m[1], 16);
  const f = (v: number) => Math.round(v * 0.45).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

function ChatPeek({ open }: { open: boolean }) {
  const { chat } = useStore();
  const last = chat[chat.length - 1];
  const [show, setShow] = useState(false);
  useEffect(() => { if (!last || last.system || open) return; setShow(true); const t = setTimeout(() => setShow(false), 3500); return () => clearTimeout(t); }, [last?.id]); // eslint-disable-line
  return (
    <AnimatePresence>{show && last && !open && (
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="panel pointer-events-none absolute bottom-3 right-3 max-w-[60vw] px-3 py-1.5 text-sm">
        <b style={{ color: last.color }}>{last.name}:</b> {last.text}
      </motion.div>)}</AnimatePresence>
  );
}

function rangeText(k: Kind) {
  if (k === 'ptero') return 'any distance in a straight line';
  const [a, b] = RANGE[k];
  const where = k === 'kaiju' ? 'water or land' : 'water';
  return a === b ? `${a} ${where} space` : `${a}–${b} ${where} spaces`;
}

function ActionBar({ g, me, busy, send, placeValue, setPlaceValue, selExplorer, selected, ability, setAbility }: {
  g: GameState; me: string; busy: boolean; send: (a: any) => void; placeValue: number | null; setPlaceValue: (v: number) => void;
  selExplorer: GameState['explorers'][number] | null | undefined; selected: Sel; ability: AbilityMode; setAbility: (a: AbilityMode) => void;
}) {
  const hint = (t: string) => <span className="parch rounded-xl font-semibold px-3 py-2 text-sm">{t}</span>;
  switch (g.phase) {
    case 'placeExplorers': {
      const left = g.toPlace[me];
      const uniq = [...new Set(left)].sort((a, b) => b - a);
      return <>
        <span className="text-sm font-bold">Place adventurer carrying:</span>
        {uniq.map(v => <button key={v} onClick={() => setPlaceValue(v)} className={`h-10 w-10 rounded-full text-lg font-black ${placeValue === v ? 'bg-gradient-to-b from-amber-200 to-amber-500 text-[#3b1d00] ring-4 ring-white' : 'bg-gradient-to-b from-[#f5f5f4] to-[#d6c7a8] text-[#3b1d00] ring-2 ring-[#2d1606]'} shadow-[0_3px_0_#2d1606]`}>{v}<sub className="text-[9px]">×{left.filter(x => x === v).length}</sub></button>)}
        {hint('then tap a glowing island tile')}
        <button className="btn-wood rounded-xl" disabled={busy} onClick={() => send({ type: 'auto' })}>🎲 Auto</button>
      </>;
    }
    case 'placeBoats': return <>{hint(`Tap a glowing water space to place a raft (${g.boatsToPlace[me]} left)`)}<button className="btn-wood rounded-xl" disabled={busy} onClick={() => send({ type: 'auto' })}>🎲 Auto</button></>;
    case 'action': {
      if (ability) {
        const needPiece = ability.ability !== 'piranha' && !ability.target;
        const what = { paddles: 'a raft', dolphin: 'one of your swimmers', dive: 'a creature' }[ability.ability as 'paddles'] ?? '';
        return <>
          <span className="parch rounded-xl font-semibold flex items-center gap-2 px-3 py-2 text-sm"><AbilityIcon kind={ability.ability} size={26} /><b>{ABILITY_LABEL[ability.ability]}:</b> {needPiece ? `pick ${what}` : 'tap a glowing space'}</span>
          <button className="btn-wood rounded-xl" onClick={() => setAbility(null)}>Cancel</button>
        </>;
      }
      const noAdv = g.movesLeft === 0 && !g.explorers.some(e => e.owner === me && ['land', 'boat', 'swimming'].includes(e.status));
      return <>
        {hint(noAdv ? 'No adventurers left — you may still use ability tiles; you will remove 2 tiles.'
          : selected ? (selExplorer ? `Adventurer ${selExplorer.value ?? ''} · ${selExplorer.status === 'swimming' ? 'swimming' : selExplorer.status === 'boat' ? 'on a raft' : 'on foot'}${g.swam[selExplorer.id] ? ' · already swam' : ''}` : 'Raft selected — tap a glowing space') : 'Select an adventurer or raft · 3 moves')}
        <button className="btn-primary" disabled={busy} onClick={() => send({ type: 'endActions' })}>End actions →</button>
      </>;
    }
    case 'sink': return <>{hint(`Rising waters: tap a red-glowing tile to remove it${g.sinksLeft > 1 ? ` (${g.sinksLeft} to remove)` : ''}`)}<button className="btn-wood rounded-xl" disabled={busy} onClick={() => send({ type: 'auto' })}>Random</button></>;
    case 'roll': return <button className="btn-primary sheen title-font px-8 py-3 text-xl" disabled={busy} onClick={() => send({ type: 'roll' })}>🎲 ROLL CREATURE DIE</button>;
    case 'creature': {
      const kinds = [...new Set(movableOfColor(g, g.die!).map(c => c.kind))];
      return <span className="parch rounded-xl font-semibold flex flex-wrap items-center gap-2 px-3 py-1 text-sm" style={{ borderColor: DIE_COLOR[g.die!] }}>
        <b style={{ color: DIE_COLOR[g.die!] }}>{COLOR_NAME[g.die!]}:</b>
        {kinds.map(k => <span key={k} className="flex items-center gap-1"><svg viewBox="-30 -24 60 40" className="h-7 w-10"><CreatureSprite kind={k} /></svg>{CREATURE_LABEL[k]} ({rangeText(k)})</span>)}
        <span className="text-white/60">— you must move one</span>
      </span>;
    }
    case 'choose': {
      const p = g.pending!;
      if (p.type === 'spawn') {
        const fresh = p.options.filter(o => o.startsWith('new:'));
        return <>
          {hint(fresh.length ? `Which ${p.color} creature appears?` : `All ${p.color} creatures are out — tap one to move it here`)}
          {fresh.map(o => { const k = o.slice(4); return <button key={o} className="btn-sea flex items-center gap-1" disabled={busy} onClick={() => send({ type: 'choose', option: o })}><svg viewBox="-30 -24 60 40" className="h-7 w-10"><CreatureSprite kind={k} /></svg>{CREATURE_LABEL[k]}</button>; })}
        </>;
      }
      if (p.type === 'egg') return hint('🥚 Tap a glowing water space to place the Egg — it hatches at the start of your next turn');
      if (p.type === 'kraken') return hint('🐙 The Kraken must grab one adventurer next to it — tap one');
      if (p.type === 'raftPick') return hint('🛶 No rafts left in the supply — tap an empty raft to drift here');
      return null;
    }
  }
  return null;
}

function Dice({ face, kinds, reduced }: { face: CColor; kinds: Kind[]; reduced: boolean }) {
  const [landed, setLanded] = useState(reduced);
  useEffect(() => { const t = setTimeout(() => setLanded(true), reduced ? 0 : 1000); return () => clearTimeout(t); }, [reduced]);
  const [spin, setSpin] = useState<CColor>('red');
  useEffect(() => { if (landed) return; const t = setInterval(() => setSpin(c => (c === 'red' ? 'green' : c === 'green' ? 'blue' : 'red')), 110); return () => clearInterval(t); }, [landed]);
  const show = landed ? face : spin;
  const shown = kinds.filter(k => KIND_COLOR[k] === show);
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ y: -260, rotate: 0, scale: 0.6 }} animate={reduced ? { y: 0, scale: 1 } : { y: [-260, 0, -60, 0, -14, 0], rotate: [0, 380, 600, 700, 720, 720], scale: [0.6, 1, 1, 1, 1, 1.15] }}
        transition={{ duration: 1.1, times: [0, 0.4, 0.6, 0.78, 0.9, 1], ease: 'easeOut' }}
        className="flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        style={{ background: `radial-gradient(circle at 35% 30%, #fff 0%, ${DIE_COLOR[show]} 55%, #111 140%)` }}>
        <svg viewBox="-34 -28 68 50" className="h-24 w-24">{shown.length ? <CreatureSprite kind={shown[0]} /> : null}</svg>
      </motion.div>
      {landed && <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="title-font absolute mt-56 text-center text-4xl text-white drop-shadow-[0_3px_0_#000]">
        {COLOR_NAME[face]}! <span className="block text-xl">{kinds.filter(k => KIND_COLOR[k] === face).map(k => CREATURE_LABEL[k]).join(' or ')}</span>
      </motion.div>}
    </motion.div>
  );
}
export { EFFECT_LABEL };

function VolcanoIcon({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="-16 -16 32 28" className={`h-7 w-8 ${lit ? 'drop-shadow-[0_0_6px_#f97316]' : ''}`} aria-label={lit ? 'erupted volcano' : 'dormant volcano'}>
      <path d="M-15 10 L-5 -7 L5 -7 L15 10 Z" fill={lit ? '#57291a' : '#4a3b2e'} stroke="#1c0a05" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-5 -7 L5 -7 L2 -4 L-2 -4 Z" fill={lit ? '#f97316' : '#2d1f14'} />
      {lit ? <>
        <path d="M-1 -5 Q-4 2 -8 9 M2 -5 Q3 2 6 9" stroke="#fb923c" strokeWidth="2" fill="none" />
        <circle cx="-3" cy="-12" r="3" fill="#78716c" /><circle cx="2" cy="-13" r="3.5" fill="#a8a29e" /><circle cx="-1" cy="-9" r="2.5" fill="#fbbf24" />
      </> : <path d="M-8 3 L-3 -3 M6 4 L2 -2" stroke="#6b5746" strokeWidth="1.2" />}
    </svg>
  );
}
