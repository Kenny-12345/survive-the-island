// The interactive hex board: camera (pan / zoom / pinch / focus), tiles, pieces, legal-move overlays and FX.
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { HEX_SIZE, hexPoints, parse, toPixel } from '../../../shared/hex';
import { aboard, type GameState, type Terrain } from '../../../shared/game';
import { BoatSprite, CreatureSprite, EFFECT_LABEL, EggSprite, ExplorerPawn, PiranhaSprite } from './Art';
import { ICON } from './Icons';

const HP = hexPoints(HEX_SIZE);
const HP_IN = hexPoints(HEX_SIZE - 3);
const W = 1000, H = 800;

export interface Fx { id: number; type: 'sink' | 'splash' | 'bite' | 'rescue' | 'whirl' | 'volcano' | 'stomp' | 'capsize' | 'repel' | 'piranha' | 'hatch'; hex: string; terrain?: Terrain; label?: string; effect?: string }
export interface Camera { x: number; y: number; zoom: number }

const hash = (k: string) => { let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const TERRAIN_FILL: Record<Terrain, [string, string]> = { beach: ['#fde9bb', '#e6bd78'], forest: ['#62d273', '#25843f'], mountain: ['#b9a189', '#7a6552'] };
/** Physical-looking tiles: like the cardboard tiles of the real game, beach is a thin stack, forest thicker, mountain thickest. */
const TER: Record<Terrain, { h: number; side: string; pat: string }> = {
  beach: { h: 6, side: '#c4914a', pat: 'url(#p-sand)' },
  forest: { h: 11, side: '#6e4a2a', pat: 'url(#p-grass)' },
  mountain: { h: 16, side: '#5a4838', pat: 'url(#p-rock)' },
};
const PTS = Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 180) * (60 * i - 30); return [HEX_SIZE * Math.cos(a), HEX_SIZE * Math.sin(a)]; });
// the four side faces you can see from above-front (edges 0-1, 1-2, 2-3, 3-4), with light coming from the top-left
const FACETS: [number, number, number][] = [[0, 1, 0.32], [1, 2, 0.22], [2, 3, 0.08], [3, 4, 0.02]];
const facet = (a: number, b: number, h: number) => { const [x1, y1] = PTS[a], [x2, y2] = PTS[b]; return `${x1},${y1} ${x2},${y2} ${x2},${y2 + h} ${x1},${y1 + h}`; };
const rim = (dy: number) => PTS.slice(0, 5).map(([x, y]) => `${x},${y + dy}`).join(' ');
const HP_SCALE = (s: number) => hexPoints(HEX_SIZE * s);
const HP_LAGOON = HP_SCALE(1.5), HP_FOAM = HP_SCALE(1.1), HP_BEVEL = HP_SCALE(0.9);
/** How high a piece standing on this space sits (land tiles are raised). */
export function liftOf(g: GameState, k: string | null | undefined) {
  const t = k ? g.tiles[k] : undefined;
  return t && !t.sunk ? TER[t.terrain].h : 0;
}

function Tile3D({ terrain, k }: { terrain: Terrain; k: string }) {
  const { h, side, pat } = TER[terrain];
  return (
    <g transform={`translate(0,${-h})`}>
      {FACETS.map(([a, b, dark]) => (
        <g key={a}>
          <polygon points={facet(a, b, h)} fill={side} />
          <polygon points={facet(a, b, h)} fill="#000" opacity={dark} />
        </g>
      ))}
      {/* stacked-cardboard layer lines */}
      {Array.from({ length: Math.floor(h / 5) }, (_, i) => <polyline key={i} points={rim(5 * (i + 1))} fill="none" stroke="#00000038" strokeWidth="1" />)}
      <polyline points={rim(h)} fill="none" stroke="#1d120866" strokeWidth="1.5" />
      <g className="tile-top">
        <polygon points={HP} fill={`url(#t-${terrain})`} stroke="#2a1d1066" strokeWidth="1.2" />
        <polygon points={HP} fill={pat} />
        <polygon points={HP} fill="url(#topLight)" />
        <polygon points={HP_BEVEL} fill="none" stroke="#ffffff40" strokeWidth="1.6" />
        <TileDeco terrain={terrain} k={k} />
      </g>
    </g>
  );
}

const TileDeco = memo(function TileDeco({ terrain, k }: { terrain: Terrain; k: string }) {
  const h = hash(k);
  if (terrain === 'beach') return (
    <g>
      <ellipse cx={(h % 14) - 1} cy="15" rx="12" ry="3" fill="#8a6a35" opacity=".35" />
      <g transform={`translate(${(h % 14) - 7},${4})`}>
        <path d="M0 10 Q2 -4 0 -14" stroke="#7a4f2a" strokeWidth="2.5" fill="none" />
        <g className="anim-sway" style={{ animationDelay: `${(h % 10) / 4}s` }} transform="translate(0,-14)">
          {[-50, -10, 30, 70, 160].map(a => <path key={a} d="M0 0 Q9 -5 16 3" stroke="#2f9e44" strokeWidth="3.5" fill="none" strokeLinecap="round" transform={`rotate(${a})`} />)}
        </g>
      </g>
      <circle cx={-16 + (h % 6)} cy={18} r="1.6" fill="#fff" opacity=".7" /><circle cx={14} cy={-18 + (h % 5)} r="1.3" fill="#f9a8d4" />
    </g>
  );
  if (terrain === 'forest') return (
    <g>
      {[[-13, -4], [11, -12], [-2, 12], [15, 8], [2, -18]].slice(0, 3 + (h % 3)).sort((a, b) => a[1] - b[1]).map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <ellipse cx="2" cy="9" rx="8" ry="3" fill="#0b3d1a" opacity=".45" />
          <g className="anim-sway" style={{ animationDelay: `${i * 0.7}s`, animationDuration: '5s' }}>
            <rect x="-1.5" y="2" width="3" height="7" fill="#5b3a1e" />
            {i % 2 ? (
              <g><path d="M0 -14 L9 2 L-9 2 Z" fill="#17602b" /><path d="M0 -18 L7 -5 L-7 -5 Z" fill="#23803a" /><path d="M0 -18 L-7 -5 L-2 -5 Z" fill="#3fae58" /></g>
            ) : (
              <g><circle r="8.5" fill="#1b6e30" /><circle cx="3" cy="2" r="5" fill="#155a27" /><circle cx="-2.5" cy="-3" r="4.5" fill="#43b85c" /><circle cx="-3.5" cy="-4" r="1.6" fill="#8be39b" /></g>
            )}
          </g>
        </g>
      ))}
    </g>
  );
  return (
    <g>
      <ellipse cx="2" cy="15" rx="26" ry="4" fill="#2a1d10" opacity=".35" />
      <path d="M-26 14 L-7 -20 L4 -4 L13 -16 L29 14 Z" fill="#8a735d" stroke="#3f3226" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-7 -20 L4 -4 L-2 14 L-26 14 Z" fill="#a38a70" />
      <path d="M13 -16 L29 14 L18 14 L10 -6 Z" fill="#6b5746" />
      <path d="M-12 -11 L-7 -20 L-2 -12 L-5 -10 L-8 -13 Z M9 -9 L13 -16 L17 -9 L14 -8 Z" fill="#f8fafc" />
      {h % 2 === 0 && <g><circle cx="16" cy="9" r="2.4" fill="#7a6552" /><circle cx="-14" cy="10" r="1.8" fill="#6b5746" /></g>}
    </g>
  );
});

function SinkFx({ fx, reduced }: { fx: Fx; reduced: boolean }) {
  const p = toPixel(fx.hex);
  const [a, b] = TERRAIN_FILL[fx.terrain ?? 'beach'];
  const T = reduced ? 0.6 : 2.4;
  return (
    <g transform={`translate(${p.x},${p.y})`} pointerEvents="none">
      <motion.g initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
        animate={reduced ? { opacity: 0 } : { x: [0, 0, -3, 3, -3, 3, -2, 0, 0], y: [0, 0, 0, 0, 0, 0, 0, 6, 34], scale: [1, 1.04, 1, 1, 1, 1, 1, 0.9, 0.55], opacity: [1, 1, 1, 1, 1, 1, 1, 0.9, 0], rotate: [0, 0, 0, 0, 0, 0, 0, -6, -14] }}
        transition={{ duration: T, times: [0, 0.12, 0.2, 0.26, 0.32, 0.38, 0.44, 0.6, 1], ease: 'easeIn' }}>
        <polygon points={HP} fill={a} stroke="#fff" strokeWidth="2" />
        <polygon points={HP_IN} fill={b} opacity=".5" />
        <motion.polygon points={HP} fill="none" stroke="#ff5a4e" strokeWidth="5" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.4, 1, 0] }} transition={{ duration: T * 0.5 }} />
        <motion.path d="M-20 -8 L-6 -2 L-10 10 L4 16 M-6 -2 L8 -14 L18 -6 M8 -14 L4 -26" stroke="#2b1a0e" strokeWidth="2.5" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: T * 0.2, duration: T * 0.25 }} />
      </motion.g>
      {!reduced && <Splash delay={T * 0.72} />}
      {fx.effect && <TileReveal effect={fx.effect} delay={reduced ? 0 : T * 0.42} reduced={reduced} />}
    </g>
  );
}
/** The removed tile flips to show its back: red = effect, green = ability, grey = someone else's secret ability. */
function TileReveal({ effect, delay, reduced }: { effect: string; delay: number; reduced: boolean }) {
  const [icon, label] = EFFECT_LABEL[effect] ?? ['❔', effect];
  const ability = ['paddles', 'dolphin', 'dive', 'die', 'repellent'].includes(effect);
  const ring = effect === 'secret' ? '#94a3b8' : ability ? '#22c55e' : '#ef4444';
  const face = effect === 'volcano' ? '#7c2d12' : effect === 'whirlpool' ? '#0369a1' : effect === 'secret' ? '#334155' : ability ? '#065f46' : '#7f1d1d';
  return (
    <motion.g initial={{ opacity: 0, scaleX: 0, y: 0 }} pointerEvents="none"
      animate={reduced ? { opacity: [0, 1, 1, 0], scaleX: 1 } : { opacity: [0, 1, 1, 1, 0], scaleX: [0, 1, 1, 1, 1], y: [0, -10, -14, -20, -46], scale: [0.8, 1.15, 1, 1, 0.9] }}
      transition={{ delay, duration: reduced ? 1.6 : 2.2, times: reduced ? [0, 0.1, 0.8, 1] : [0, 0.12, 0.3, 0.75, 1] }}>
      <polygon points={HP} transform="scale(.82)" fill={face} stroke={ring} strokeWidth="4" filter="url(#tileShadow)" />
      <polygon points={HP} transform="scale(.66)" fill="none" stroke="#ffffff33" strokeWidth="1.5" />
      {ICON[effect] ? <g transform="scale(.85)">{ICON[effect]}</g> : <text textAnchor="middle" dy="6" fontSize="24">{icon}</text>}
      <text y="44" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" stroke="#000" strokeWidth="3" paintOrder="stroke">{label.toUpperCase()}</text>
    </motion.g>
  );
}
function Splash({ delay = 0, color = '#e0f7fa' }: { delay?: number; color?: string }) {
  return (
    <g pointerEvents="none">
      {[0, 1, 2].map(i => (
        <motion.circle key={i} r="10" fill="none" stroke={color} strokeWidth="3" initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: [0.2, 2.4], opacity: [0.9, 0] }} transition={{ delay: delay + i * 0.15, duration: 0.9 }} />
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <motion.circle key={`d${i}`} r="2.4" fill={color} initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{ x: Math.cos(a) * 26, y: [0, -22 + Math.sin(a) * 8, 10], opacity: [1, 1, 0] }} transition={{ delay, duration: 0.8 }} />;
      })}
    </g>
  );
}
function FxView({ fx, reduced }: { fx: Fx; reduced: boolean }) {
  if (fx.type === 'sink') return <SinkFx fx={fx} reduced={reduced} />;
  const p = toPixel(fx.hex);
  const icon = { splash: '💦', bite: '💥', rescue: '🎉', whirl: '🌀', volcano: '🌋', stomp: '💢', capsize: '🌊', repel: '🧴', piranha: '🐟', hatch: '🐣' }[fx.type];
  return (
    <g transform={`translate(${p.x},${p.y})`} pointerEvents="none">
      {fx.type === 'whirl' && <motion.g initial={{ rotate: 0, scale: 0.3, opacity: 1 }} animate={{ rotate: 720, scale: 2.2, opacity: 0 }} transition={{ duration: 2 }}>
        {[0, 1, 2].map(i => <path key={i} d={`M0 0 Q${10 + i * 8} -${12 + i * 6} ${24 + i * 6} 0`} stroke="#bae6fd" strokeWidth="3" fill="none" transform={`rotate(${i * 120})`} />)}
      </motion.g>}
      {fx.type === 'volcano' && <motion.circle r="20" fill="#f97316" initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 8, opacity: 0 }} transition={{ duration: 1.8 }} />}
      {fx.type === 'rescue' && Array.from({ length: 10 }, (_, i) => (
        <motion.circle key={i} r="2.5" fill={['#ffe08a', '#7dd3fc', '#f9a8d4'][i % 3]} initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: Math.cos(i) * 34, y: Math.sin(i) * 34 - 10, opacity: 0 }} transition={{ duration: 1.2 }} />
      ))}
      {(fx.type === 'splash' || fx.type === 'bite' || fx.type === 'capsize' || fx.type === 'stomp' || fx.type === 'piranha' || fx.type === 'repel' || fx.type === 'hatch') && !reduced && <Splash color={fx.type === 'bite' || fx.type === 'piranha' ? '#fca5a5' : fx.type === 'repel' ? '#fde68a' : '#e0f7fa'} />}
      <motion.text textAnchor="middle" fontSize="22" initial={{ y: 0, opacity: 0, scale: 0.4 }} animate={{ y: -34, opacity: [0, 1, 1, 0], scale: 1.2 }} transition={{ duration: 1.8 }}>{icon}</motion.text>
      {fx.label && <motion.text textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" stroke="#000" strokeWidth="3" paintOrder="stroke" initial={{ y: -10, opacity: 0 }} animate={{ y: -58, opacity: [0, 1, 1, 0] }} transition={{ duration: 2 }}>{fx.label}</motion.text>}
    </g>
  );
}

export interface BoardProps {
  g: GameState;
  me: string;
  colors: Record<string, string>;
  targets: Set<string>;
  targetTone: 'move' | 'sink' | 'place' | 'creature' | 'ability' | 'choose';
  selected: { kind: 'explorer' | 'boat' | 'creature'; id: string } | null;
  onHex: (k: string) => void;
  onPiece: (kind: 'explorer' | 'boat' | 'creature', id: string) => void;
  fx: Fx[];
  camera: Camera;
  setCamera: (c: Camera) => void;
  creaturePaths: Record<string, { xs: number[]; ys: number[]; n: number }>;
  reduced: boolean;
  dangerHexes: Set<string>;
}

export function Board(p: BoardProps) {
  const { g, me, colors, targets, selected, camera, reduced } = p;
  const svgRef = useRef<SVGSVGElement>(null);
  // camera smoothing
  const [view, setView] = useState(camera);
  const viewRef = useRef(view);
  useEffect(() => {
    if (reduced) { setView(camera); viewRef.current = camera; return; }
    let raf = 0;
    const step = () => {
      const v = viewRef.current;
      const n = { x: v.x + (camera.x - v.x) * 0.18, y: v.y + (camera.y - v.y) * 0.18, zoom: v.zoom + (camera.zoom - v.zoom) * 0.18 };
      const done = Math.abs(n.x - camera.x) < 0.5 && Math.abs(n.y - camera.y) < 0.5 && Math.abs(n.zoom - camera.zoom) < 0.002;
      viewRef.current = done ? camera : n;
      setView(viewRef.current);
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [camera, reduced]);

  // pointer pan / pinch zoom
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ moved: 0, pinch: 0 });
  const toWorld = useCallback((dx: number, dy: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const scale = Math.max(W / r.width, H / r.height) / camera.zoom;
    return { dx: dx * scale, dy: dy * scale };
  }, [camera.zoom]);
  const onDown = (e: React.PointerEvent) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current.moved = 0;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      drag.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    ptrs.current.set(e.pointerId, cur);
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (drag.current.pinch) p.setCamera({ ...camera, zoom: clampZ(camera.zoom * (d / drag.current.pinch)) });
      drag.current.pinch = d; drag.current.moved = 99;
      return;
    }
    const { dx, dy } = toWorld(cur.x - prev.x, cur.y - prev.y);
    drag.current.moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
    if (drag.current.moved > 6) {
      if (!svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current?.setPointerCapture(e.pointerId);
      p.setCamera({ ...camera, x: clampX(camera.x - dx), y: clampX(camera.y - dy) });
    }
  };
  const onUp = (e: React.PointerEvent) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) drag.current.pinch = 0; };
  useEffect(() => {
    const el = svgRef.current!;
    const wheel = (e: WheelEvent) => { e.preventDefault(); p.setCamera({ ...camera, zoom: clampZ(camera.zoom * (e.deltaY < 0 ? 1.12 : 0.89)) }); };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [camera, p.setCamera]);
  const click = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); if (drag.current.moved > 6) return; fn(); };

  const vb = `${view.x - W / 2 / view.zoom} ${view.y - H / 2 / view.zoom} ${W / view.zoom} ${H / view.zoom}`;
  const tiles = Object.values(g.tiles);
  const toneColor = { move: '#7dd3fc', sink: '#ff5a4e', place: '#ffe08a', creature: '#c084fc', ability: '#34d399', choose: '#f472b6' }[p.targetTone];

  // piece layout
  const explorerPos = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    const groups: Record<string, string[]> = {};
    for (const e of g.explorers) {
      if (!e.hex || e.status === 'rescued' || e.status === 'lost' || e.status === 'unplaced') continue;
      if (e.status === 'boat') continue;
      const k = `${e.hex}|${e.status}`;
      (groups[k] ??= []).push(e.id);
    }
    for (const [k, ids] of Object.entries(groups)) {
      const [hex, status] = k.split('|');
      const c = toPixel(hex);
      ids.forEach((id, i) => {
        const n = ids.length;
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const r = n === 1 ? 0 : n < 4 ? 12 : 16;
        out[id] = { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.8 + (status === 'swimming' ? 8 : 2 - liftOf(g, hex)) };
      });
    }
    for (const b of g.boats) {
      const c = toPixel(b.hex);
      aboard(g, b.id).forEach((e, i) => (out[e.id] = { x: c.x + (i - 1) * 12, y: c.y - 2 }));
    }
    return out;
  }, [g]);

  return (
    <svg ref={svgRef} viewBox={vb} className="h-full w-full touch-none select-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}>
      <defs>
        <radialGradient id="seaGlow"><stop offset="0%" stopColor="#2aa6cf" /><stop offset="70%" stopColor="#0f4f80" /><stop offset="100%" stopColor="#0b3d66" /></radialGradient>
        <radialGradient id="lava"><stop offset="0%" stopColor="#fde047" /><stop offset="45%" stopColor="#f97316" /><stop offset="100%" stopColor="#7f1d1d" /></radialGradient>
        {(['beach', 'forest', 'mountain'] as Terrain[]).map(t => (
          <linearGradient key={t} id={`t-${t}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={TERRAIN_FILL[t][0]} /><stop offset="100%" stopColor={TERRAIN_FILL[t][1]} /></linearGradient>
        ))}
        <filter id="tileShadow"><feDropShadow dx="0" dy="5" stdDeviation="2" floodColor="#00213a" floodOpacity=".55" /></filter>
        <filter id="blur18" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16" /></filter>
        <filter id="blur5" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5" /></filter>
        <filter id="blur2"><feGaussianBlur stdDeviation="1.8" /></filter>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id="deepSea" cx="50%" cy="48%" r="70%"><stop offset="0%" stopColor="#1b8fbf" /><stop offset="55%" stopColor="#0f5f93" /><stop offset="100%" stopColor="#0a3a63" /></radialGradient>
        <linearGradient id="pawnShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fff" stopOpacity=".3" /><stop offset="45%" stopColor="#fff" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity=".38" /></linearGradient>
        <linearGradient id="topLight" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity=".28" /><stop offset="45%" stopColor="#fff" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity=".22" /></linearGradient>
        <linearGradient id="frameWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d9a35c" /><stop offset="50%" stopColor="#a8692c" /><stop offset="100%" stopColor="#7a4a1e" /></linearGradient>
        <pattern id="p-sand" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".9" fill="#b8894a" opacity=".5" /><circle cx="10" cy="9" r=".7" fill="#fff" opacity=".6" /><circle cx="7" cy="13" r=".8" fill="#b8894a" opacity=".4" /></pattern>
        <pattern id="p-grass" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M3 9 l1 -3 l1 3 M11 3 l1 -3 l1 3 M9 15 l1 -3 l1 3" stroke="#1a6b2f" strokeWidth=".9" fill="none" opacity=".55" /><circle cx="14" cy="10" r=".9" fill="#b6f5c0" opacity=".5" /></pattern>
        <pattern id="p-rock" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M2 6 l5 2 l3 -3 M12 15 l4 -2 l3 3" stroke="#4a3b2e" strokeWidth=".8" fill="none" opacity=".45" /><circle cx="15" cy="5" r="1" fill="#e7dccd" opacity=".4" /></pattern>
        <pattern id="woodTable" width="420" height="64" patternUnits="userSpaceOnUse">
          <rect width="420" height="64" fill="#5c3a1d" />
          <rect y="31" width="420" height="2" fill="#3f2711" opacity=".7" />
          <path d="M0 10 Q120 4 210 12 T420 10 M0 22 Q140 28 260 20 T420 24 M0 44 Q90 38 200 46 T420 42 M0 56 Q160 60 300 52 T420 56" stroke="#4a2e15" strokeWidth="1.4" fill="none" opacity=".7" />
          <path d="M0 16 Q100 12 220 18 T420 15 M0 50 Q120 46 240 52 T420 49" stroke="#7a5230" strokeWidth="1" fill="none" opacity=".6" />
          <ellipse cx="300" cy="18" rx="9" ry="3" fill="none" stroke="#3f2711" strokeWidth="1.2" opacity=".6" />
        </pattern>
        <pattern id="caustic" width="200" height="200" patternUnits="userSpaceOnUse">
          <path d="M0 40 Q50 14 100 40 T200 40 M0 140 Q50 114 100 140 T200 140 M-20 90 Q30 70 80 92 T180 88" stroke="#ffffff" strokeOpacity=".07" strokeWidth="3" fill="none" />
          <path d="M20 20 l10 4 M140 70 l12 3 M60 170 l10 -3 M170 160 l8 4" stroke="#d6f6ff" strokeOpacity=".22" strokeWidth="1.5" strokeLinecap="round" />
          {!reduced && <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="200 100" dur="40s" repeatCount="indefinite" />}
        </pattern>
        <clipPath id="boardClip"><rect x="-530" y="-410" width="1060" height="820" rx="34" /></clipPath>
      </defs>
      {/* the table the board rests on */}
      <rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#woodTable)" />
      <rect x="-560" y="-420" width="1120" height="880" rx="44" fill="#000" opacity=".55" filter="url(#blur18)" />
      {/* board thickness, frame, sea */}
      <rect x="-546" y="-424" width="1092" height="866" rx="42" fill="#2b1608" />
      <rect x="-546" y="-426" width="1092" height="852" rx="42" fill="url(#frameWood)" stroke="#3b1f0a" strokeWidth="3" />
      <rect x="-534" y="-414" width="1068" height="828" rx="36" fill="none" stroke="#f6d69a" strokeWidth="1.5" opacity=".7" />
      {[[-526, -406], [526, -406], [-526, 406], [526, 406]].map(([x, y]) => <g key={`${x}${y}`}><circle cx={x} cy={y} r="5" fill="#f3c97a" stroke="#5b3410" strokeWidth="1.5" /><circle cx={x - 1.5} cy={y - 1.5} r="1.5" fill="#fff6" /></g>)}
      <g clipPath="url(#boardClip)">
        <rect x="-530" y="-410" width="1060" height="820" fill="url(#deepSea)" />
        {/* sea-chart rhumb lines */}
        <g stroke="#bfe9ff" strokeOpacity=".06" strokeWidth="1.2">{Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <line key={i} x1="0" y1="0" x2={Math.cos(a) * 900} y2={Math.sin(a) * 900} />; })}</g>
        {/* shallow lagoon around whatever island is left: it shrinks as the island sinks */}
        <g filter="url(#blur18)" opacity=".75">
          {tiles.filter(t => !t.sunk).map(t => { const c = toPixel(t.key); return <polygon key={t.key} points={HP_LAGOON} transform={`translate(${c.x},${c.y})`} fill="#3fd0dd" />; })}
          {g.safe.map(k => { const c = toPixel(k); return <circle key={k} cx={c.x} cy={c.y} r="58" fill="#3fd0dd" />; })}
        </g>
        <rect x="-530" y="-410" width="1060" height="820" fill="url(#caustic)" />
      </g>
      {/* sea hexes (printed grid) */}
      {[...g.sea, ...tiles.filter(t => t.sunk).map(t => t.key)].filter(k => !g.volcanoes.includes(k)).map(k => {
        const c = toPixel(k);
        const danger = p.dangerHexes.has(k);
        return (
          <g key={`s${k}`} transform={`translate(${c.x},${c.y})`} onClick={click(() => p.onHex(k))}>
            <polygon points={HP_SCALE(0.96)} fill="#ffffff01" stroke="#e0f7ff" strokeOpacity=".13" strokeWidth="1.2" />
            {danger && <g pointerEvents="none">
              <circle r="26" fill="#ff3b3b" opacity=".1" />
              <circle r="24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeDasharray="4 5" opacity=".7">{!reduced && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="14s" repeatCount="indefinite" />}</circle>
            </g>}
            {(hash(k) % 4 === 0) && <path d="M-10 4 q5 -4 10 0 t10 0" stroke="#e0f7ff" strokeWidth="1.6" fill="none" strokeLinecap="round" className="anim-glint" style={{ animationDelay: `${hash(k) % 7}s` }} />}
          </g>
        );
      })}
      {/* surf foam hugging the coastline */}
      <g filter="url(#blur2)" pointerEvents="none">
        {tiles.filter(t => !t.sunk).map(t => { const c = toPixel(t.key); return <polygon key={t.key} points={HP_FOAM} transform={`translate(${c.x},${c.y + 3})`} fill="none" stroke="#f0fdff" strokeWidth="5" strokeOpacity=".55" />; })}
      </g>
      {/* soft tile shadows on the water */}
      <g filter="url(#blur5)" opacity=".5" pointerEvents="none">
        {tiles.filter(t => !t.sunk).map(t => { const c = toPixel(t.key); return <polygon key={t.key} points={HP} transform={`translate(${c.x + 7},${c.y + 9})`} fill="#002338" />; })}
      </g>
      {/* safe islands */}
      {g.safe.map(k => {
        const c = toPixel(k);
        // islands sit in the board corners: push the land mass outward, toward the frame
        const sx = c.x < 0 ? -1 : 1, sy = c.y < 0 ? -1 : 1;
        return (
          <g key={`safe${k}`} transform={`translate(${c.x},${c.y})`} onClick={click(() => p.onHex(k))} style={{ cursor: 'pointer' }}>
            <circle r="40" fill="#7dd3fc" opacity=".22">{!reduced && <animate attributeName="r" values="36;46;36" dur="3s" repeatCount="indefinite" />}</circle>
            <g transform={`scale(${sx},${sy})`}>
              <path d="M-30 12 Q-44 -6 -26 -26 Q-6 -46 22 -36 Q46 -26 44 -2 Q46 22 22 30 Q-6 40 -30 12 Z" fill="#f3d79a" stroke="#fff8" strokeWidth="2.5" filter="url(#tileShadow)" />
              <path d="M-14 -4 Q-20 -22 2 -28 Q28 -30 32 -10 Q30 8 10 10 Q-8 14 -14 -4 Z" fill="#4cb860" />
              <path d="M-4 -12 Q4 -22 18 -16" stroke="#2f8a44" strokeWidth="3" fill="none" />
            </g>
            {/* hut + flag */}
            <g transform={`translate(${sx * 8},${sy * 4 - 6})`}>
              <path d="M-9 4 L0 -6 L9 4 Z" fill="#b45309" stroke="#5b2d0a" strokeWidth="1.2" />
              <rect x="-7" y="4" width="14" height="9" fill="#d6a058" stroke="#5b2d0a" strokeWidth="1.2" />
              <rect x="-2" y="7" width="4" height="6" fill="#5b2d0a" />
            </g>
            <path d={`M${-sx * 12} 12 V-18`} stroke="#5b3a1e" strokeWidth="2.5" />
            <path d={`M${-sx * 12} -18 l14 5 l-14 5 Z`} fill="#22c55e" className={reduced ? '' : 'anim-sway'} />
            {/* life ring */}
            <g transform={`translate(${-sx * 22},${sy * 16})`} className={reduced ? '' : 'anim-bob'}>
              <circle r="6" fill="none" stroke="#ef4444" strokeWidth="3.4" /><circle r="6" fill="none" stroke="#fff" strokeWidth="3.4" strokeDasharray="4.7 4.7" />
            </g>
            <g transform="translate(0,30)">
              <rect x="-24" y="-8" width="48" height="13" rx="6" fill="#14532d" stroke="#bbf7d0" strokeWidth="1.2" />
              <text y="2" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#ecfccb" letterSpacing="1">RESCUE</text>
            </g>
          </g>
        );
      })}
      {/* land tiles */}
      {tiles.filter(t => !t.sunk).sort((a, b) => parse(a.key)[1] - parse(b.key)[1]).map(t => {
        const c = toPixel(t.key);
        return (
          <g key={t.key} className="hex-tile" transform={`translate(${c.x},${c.y})`} onClick={click(() => p.onHex(t.key))} style={{ cursor: 'pointer' }}>
            <Tile3D terrain={t.terrain} k={t.key} />
          </g>
        );
      })}
      {/* revealed volcanoes (inaccessible) */}
      {g.volcanoes.map(k => {
        const c = toPixel(k);
        return (
          <g key={`v${k}`} transform={`translate(${c.x},${c.y})`} pointerEvents="none">
            <polygon points={HP} transform="translate(7,9)" fill="#002338" opacity=".45" filter="url(#blur5)" />
            {FACETS.map(([fa, fb, dark]) => <g key={fa}><polygon points={facet(fa, fb, 18)} transform="translate(0,-18)" fill="#3a1d10" /><polygon points={facet(fa, fb, 18)} transform="translate(0,-18)" fill="#000" opacity={dark} /></g>)}
            <polyline points={rim(0)} fill="none" stroke="#ff6a1f" strokeWidth="1.5" opacity=".6">{!reduced && <animate attributeName="opacity" values=".2;.8;.2" dur="1.6s" repeatCount="indefinite" />}</polyline>
            <g transform="translate(0,-18)">
            <polygon points={HP} fill="#3b1d12" stroke="#7f1d1d" strokeWidth="2" />
            <polygon points={HP} fill="url(#topLight)" />
            <path d="M-26 16 L-8 -14 L8 -14 L26 16 Z" fill="#57291a" stroke="#1c0a05" strokeWidth="1.5" />
            <ellipse cx="0" cy="-14" rx="9" ry="3.5" fill="url(#lava)">{!reduced && <animate attributeName="rx" values="8;10;8" dur="1s" repeatCount="indefinite" />}</ellipse>
            <path d="M-2 -13 Q-6 0 -12 14 M3 -13 Q4 2 10 14" stroke="#f97316" strokeWidth="2.5" fill="none" opacity=".9">{!reduced && <animate attributeName="opacity" values=".5;1;.5" dur="1.4s" repeatCount="indefinite" />}</path>
            {!reduced && [0, 1, 2].map(i => <circle key={i} cx={(i - 1) * 5} cy="-20" r="4" fill="#57534e" opacity=".6"><animate attributeName="cy" values="-18;-44" dur="2.4s" begin={`${i * 0.8}s`} repeatCount="indefinite" /><animate attributeName="opacity" values=".7;0" dur="2.4s" begin={`${i * 0.8}s`} repeatCount="indefinite" /><animate attributeName="r" values="3;9" dur="2.4s" begin={`${i * 0.8}s`} repeatCount="indefinite" /></circle>)}
            </g>
          </g>
        );
      })}
      {/* piranha tiles (water spaces that eliminate anything entering) */}
      {g.piranhas.map(k => {
        const c = toPixel(k);
        return (
          <g key={`pi${k}`} transform={`translate(${c.x},${c.y})`} onClick={click(() => p.onHex(k))}>
            <polygon points={HP_IN} fill="#7f1d1d55" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 4" />
            <g className={reduced ? '' : 'anim-bob'}><PiranhaSprite x={-10} y={-6} /><PiranhaSprite x={10} y={4} flip /><PiranhaSprite x={-4} y={12} /></g>
          </g>
        );
      })}
      {/* eggs */}
      {g.eggs.map(e => {
        const c = toPixel(e.hex);
        return <g key={e.id} transform={`translate(${c.x + 14},${c.y - 12})`} pointerEvents="none"><EggSprite /></g>;
      })}
      {/* legal targets */}
      {[...targets].map(k => {
        const c = toPixel(k);
        const lift = liftOf(g, k);
        return (
          <g key={`t${k}`} className="hex-target" transform={`translate(${c.x},${c.y - lift})`} onClick={click(() => p.onHex(k))} style={{ cursor: 'pointer' }}>
            <polygon points={HP_IN} fill={toneColor} fillOpacity=".22" stroke={toneColor} strokeWidth="3.5" strokeLinejoin="round" filter="url(#glow)">
              {!reduced && <animate attributeName="fill-opacity" values=".1;.34;.1" dur="1.4s" repeatCount="indefinite" />}
            </polygon>
            <polygon points={HP_SCALE(0.78)} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" strokeDasharray="5 6" />
            <g className={reduced ? '' : 'anim-hover'}>
              <path d="M-6 -30 L6 -30 L0 -22 Z" fill={toneColor} stroke="#0008" strokeWidth="1.2" strokeLinejoin="round" />
            </g>
          </g>
        );
      })}
      {/* boats */}
      {g.boats.map(b => {
        const c = toPixel(b.hex);
        const n = aboard(g, b.id).length;
        return (
          <motion.g key={b.id} initial={false} animate={{ x: c.x, y: c.y + 8 }} transition={{ duration: reduced ? 0 : 0.7, ease: 'easeInOut' }}
            onClick={click(() => p.onPiece('boat', b.id))} style={{ cursor: 'pointer' }}>
            <g className="anim-bob"><BoatSprite selected={selected?.kind === 'boat' && selected.id === b.id} /></g>
            {n > 0 && <g transform="translate(0,21)"><rect x="-9" y="-6" width="18" height="10" rx="5" fill="#0b2545e6" stroke="#ffffff55" strokeWidth=".8" /><text y="1.6" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="900">{n}/3</text></g>}
          </motion.g>
        );
      })}
      {/* explorers */}
      {g.explorers.map(e => {
        const pos = explorerPos[e.id];
        if (!pos) return null;
        const own = e.owner === me;
        return (
          <motion.g key={e.id} initial={{ x: pos.x, y: pos.y - 30, opacity: 0 }} animate={{ x: pos.x, y: pos.y, opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.55, ease: 'easeInOut' }}
            onClick={click(() => p.onPiece('explorer', e.id))} style={{ cursor: own ? 'pointer' : 'default' }}>
            {e.status === 'swimming' && <ellipse cx="0" cy="8" rx="11" ry="3.5" fill="none" stroke="#e0f7fa" strokeWidth="1.5"><animate attributeName="rx" values="9;13;9" dur="1.6s" repeatCount="indefinite" /></ellipse>}
            <g className={e.status === 'swimming' ? 'anim-bob' : e.status === 'boat' ? 'anim-bob-slow' : ''} transform={e.status === 'swimming' ? 'translate(0,3) scale(.9)' : ''}>
              <ExplorerPawn color={colors[e.owner] ?? '#fff'} value={e.value} own={own} selected={selected?.kind === 'explorer' && selected.id === e.id} />
            </g>
          </motion.g>
        );
      })}
      {/* creatures */}
      {g.creatures.map((c, i) => {
        const pos = toPixel(c.hex);
        const same = g.creatures.filter(x => x.hex === c.hex);
        const off = same.length > 1 ? (same.indexOf(c) - (same.length - 1) / 2) * 16 : 0;
        const path = p.creaturePaths[c.id];
        const anim = path && !reduced ? { x: path.xs.map(x => x + off), y: path.ys } : { x: pos.x + off, y: pos.y - 4 - liftOf(g, c.hex) };
        const sel = selected?.kind === 'creature' && selected.id === c.id;
        return (
          <motion.g key={c.id} initial={false} animate={anim} transition={{ duration: reduced ? 0 : path ? 0.55 * path.xs.length : 0.6, ease: 'easeInOut' }}
            onClick={click(() => p.onPiece('creature', c.id))} style={{ cursor: 'pointer' }}>
            {sel && <circle r="22" fill="none" stroke="#c084fc" strokeWidth="3" strokeDasharray="5 4" />}
            <motion.g animate={reduced ? undefined : { rotate: c.kind === 'shark' ? [0, 8, 0, -8, 0] : [0, 3, 0, -3, 0] }} transition={{ duration: 3 + (i % 3), repeat: Infinity }}>
              <CreatureSprite kind={c.kind} />
            </motion.g>
          </motion.g>
        );
      })}
      {p.fx.map(f => <FxView key={f.id} fx={f} reduced={reduced} />)}
    </svg>
  );
}
const clampZ = (z: number) => Math.min(3, Math.max(0.55, z));
const clampX = (v: number) => Math.min(480, Math.max(-480, v));
export const pixelOf = toPixel;
export type { ReactNode };
