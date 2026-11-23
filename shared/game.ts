/*
 * SURVIVE THE ISLAND — rules engine (shared by server and client).
 * The server is authoritative: it is the only one that calls apply() with real RNG.
 * The client uses the read-only helpers (legal targets, sinkable tiles…) to draw highlights.
 *
 * RULE SOURCES — see RULES.md. The rules follow the official Survive The Island rulebook
 * (Zygomatic, 2024) and the official Monster Pack rulebook. Tags in comments:
 *   [OFFICIAL]  taken from the rulebook
 *   [ASSUMED]   the rulebook doesn't state it (or only in a picture); best reading, check against a physical copy
 *   [DIGITAL]   an adaptation needed for online play (e.g. automatic choices)
 *   [HOUSE]     optional custom rule, Custom mode only
 */
import { dist, neighbors, ring, DIRS, parse, key } from './hex';

export type Terrain = 'beach' | 'forest' | 'mountain';
export type Kind = 'serpent' | 'shark' | 'kaiju' | 'kraken' | 'ptero' | 'whale';
export type CColor = 'red' | 'green' | 'blue';
export type Ability = 'paddles' | 'dolphin' | 'dive' | 'die' | 'repellent' | 'piranha';
export type Effect = 'green' | 'blue' | 'raft' | 'whirlpool' | 'volcano' | 'piranha' | 'egg' | Exclude<Ability, 'piranha'>;
export type Phase = 'placeExplorers' | 'placeBoats' | 'action' | 'sink' | 'roll' | 'creature' | 'choose' | 'ended';
export type GameMode = 'classic' | 'monster' | 'custom';

export const KIND_COLOR: Record<Kind, CColor> = { serpent: 'red', kraken: 'red', shark: 'green', ptero: 'green', kaiju: 'blue', whale: 'blue' };
export const ALL_KINDS: Kind[] = ['serpent', 'kraken', 'shark', 'ptero', 'kaiju', 'whale'];
export const BASE_KINDS: Kind[] = ['serpent', 'shark', 'kaiju'];
export const ABILITIES: Ability[] = ['paddles', 'dolphin', 'dive', 'die', 'repellent', 'piranha'];
export const isAbilityEffect = (e: Effect | null | 'secret'): boolean => !!e && ['paddles', 'dolphin', 'dive', 'die', 'repellent'].includes(e);

export interface HouseRules {
  fastSwimmers: boolean; // [HOUSE] each adventurer may swim twice per turn
  extraBoats: boolean; // [HOUSE] +1 starting raft per player
  suddenVolcano: boolean; // [HOUSE] the first volcano ends the game (classic Escape-from-Atlantis feel)
}
export interface GameSettings {
  maxPlayers: number;
  mode: GameMode;
  monsterPack: boolean; // derived: any Monster Pack content in use
  creatures: Record<Kind, boolean>;
  piranhas: boolean;
  eggs: boolean;
  isPublic: boolean;
  turnTimer: number; // seconds, 0 = off
  quickSetup: boolean; // auto-place adventurers & rafts
  house: HouseRules;
}
export const defaultCreatures = (): Record<Kind, boolean> => ({ serpent: true, shark: true, kaiju: true, kraken: false, ptero: false, whale: false });
export const defaultSettings = (): GameSettings => ({
  maxPlayers: 4, mode: 'classic', monsterPack: false, creatures: defaultCreatures(), piranhas: false, eggs: false,
  isPublic: false, turnTimer: 0, quickSetup: false,
  house: { fastSwimmers: false, extraBoats: false, suddenVolcano: false },
});
/** Make settings consistent (≥1 creature type per colour, classic = base game only). */
export function normalizeSettings(s: GameSettings): GameSettings {
  const c = { ...defaultCreatures(), ...s.creatures };
  if (s.mode === 'classic') { Object.assign(c, defaultCreatures()); s.piranhas = false; s.eggs = false; }
  for (const col of ['red', 'green', 'blue'] as CColor[]) {
    const kinds = ALL_KINDS.filter(k => KIND_COLOR[k] === col);
    if (!kinds.some(k => c[k])) c[BASE_KINDS.find(k => KIND_COLOR[k] === col)!] = true; // [OFFICIAL] at least one type per colour
  }
  s.creatures = c;
  if (s.mode !== 'custom') s.house = { fastSwimmers: false, extraBoats: false, suddenVolcano: false };
  s.monsterPack = s.mode !== 'classic' && (c.kraken || c.ptero || c.whale || s.piranhas || s.eggs);
  return s;
}

export interface Tile { key: string; terrain: Terrain; effect: Effect | 'secret' | null; sunk: boolean; takenBy?: string | null }
export interface Explorer {
  id: string; owner: string; value: number | null; hex: string | null; boat: string | null;
  status: 'unplaced' | 'land' | 'boat' | 'swimming' | 'rescued' | 'lost';
}
export interface Boat { id: string; hex: string }
export interface Creature { id: string; kind: Kind; hex: string }
export interface Egg { id: string; hex: string; owner: string }
export interface HandTile { id: string; kind: Ability | null } // null = hidden from this viewer
export interface PlayerInfo { id: string; name: string; color: string; character: string }
export type Pending =
  | { type: 'spawn'; hex: string; color: CColor; options: string[]; why: 'tile' | 'egg' }
  | { type: 'kraken'; creature: string; options: string[] }
  | { type: 'egg'; options: string[] }
  | { type: 'raftPick'; hex: string; options: string[] }; // which empty raft drifts to a Raft tile when supply is out

export type Cause = Kind | 'whirlpool' | 'volcano' | 'piranha';
export type GameEvent =
  | { t: 'turn'; player: string; turn: number }
  | { t: 'place'; player: string; hex: string; what: 'explorer' | 'boat' }
  | { t: 'moveExplorer'; id: string; from: string | null; to: string }
  | { t: 'moveBoat'; id: string; from: string; to: string }
  | { t: 'sink'; hex: string; terrain: Terrain; effect: Effect | 'secret'; player: string }
  | { t: 'spawn'; kind: Kind | 'boat' | 'egg'; hex: string }
  | { t: 'eaten'; explorer: string; owner: string; by: Cause; hex: string | null }
  | { t: 'rescued'; explorer: string; owner: string; hex: string }
  | { t: 'boatDestroyed'; id: string; hex: string; by: Cause }
  | { t: 'capsize'; id: string; hex: string }
  | { t: 'whirlpool'; hex: string }
  | { t: 'volcano'; hex: string; count: number }
  | { t: 'piranha'; hex: string }
  | { t: 'die'; face: CColor; player: string; usable: boolean; why: 'phase' | 'ability' | 'egg' }
  | { t: 'creatureMove'; id: string; kind: Kind; path: string[] }
  | { t: 'creatureGone'; id: string; kind: Kind; hex: string; by: Cause | 'repellent' }
  | { t: 'repel'; player: string; kind: Kind; hex: string }
  | { t: 'push'; id: string; from: string; to: string }
  | { t: 'gain'; player: string; ability: Ability | null }
  | { t: 'ability'; player: string; ability: Ability }
  | { t: 'hatch'; hex: string }
  | { t: 'end'; reason: string };

export interface GameState {
  seq: number;
  turn: number;
  current: number;
  order: string[];
  players: Record<string, PlayerInfo>;
  phase: Phase;
  movesLeft: number;
  sinksLeft: number;
  swam: Record<string, number>;
  board: string[]; // every playable hex (water + island + rescue islands)
  tiles: Record<string, Tile>;
  sea: string[]; // hexes that were water from the start
  safe: string[]; // rescue islands
  volcanoes: string[]; // revealed volcano tiles (inaccessible)
  piranhas: string[]; // piranha tiles on the board (water spaces that eliminate anything entering)
  explorers: Explorer[];
  boats: Boat[];
  creatures: Creature[];
  eggs: Egg[];
  hands: Record<string, HandTile[]>;
  piranhaSupply: number;
  inPlay: Kind[];
  die: CColor | null;
  dieFor: 'phase' | 'ability' | null;
  pending: Pending | null;
  resume: 'sink' | 'creature' | 'hatch' | 'ability' | null;
  toPlace: Record<string, number[]>;
  boatsToPlace: Record<string, number>;
  settings: GameSettings;
  nextId: number;
  winners: string[] | null;
  endReason: string | null;
  startedAt: number;
  endedAt: number | null;
  turnDeadline: number | null;
  log: string[];
}

export type Action =
  | { type: 'placeExplorer'; to: string; value: number }
  | { type: 'placeBoat'; to: string }
  | { type: 'moveExplorer'; id: string; to: string }
  | { type: 'moveBoat'; id: string; to: string }
  | { type: 'useAbility'; tile: string; target?: string; to?: string }
  | { type: 'endActions' }
  | { type: 'sink'; hex: string }
  | { type: 'roll' }
  | { type: 'moveCreature'; id: string; to: string }
  | { type: 'choose'; option: string }
  | { type: 'auto' };

export class RuleError extends Error {}
const fail = (m: string): never => { throw new RuleError(m); };

/* ---------- constants ---------- */
export const BOAT_CAPACITY = 3;
export const MOVES_PER_TURN = 3;
export const TOTAL_RAFTS = 12;
export const VOLCANOES_TO_END = 3;
const TIER: Terrain[] = ['beach', 'forest', 'mountain'];
// [OFFICIAL] tile distribution (rulebook p.8): 16 beach, 16 forest, 8 mountain.
const DISTRIBUTION: Record<Terrain, Partial<Record<Effect, number>>> = {
  beach: { green: 3, blue: 3, raft: 1, paddles: 2, dolphin: 3, die: 2, repellent: 2 },
  forest: { green: 3, blue: 2, raft: 3, whirlpool: 2, dolphin: 1, dive: 2, die: 2, repellent: 1 },
  mountain: { whirlpool: 4, volcano: 4 },
};
// [OFFICIAL] Monster Pack: pieces per creature type → [only type of its colour, both types of the colour]
export const CREATURE_COUNTS: Record<Kind, [number, number]> = {
  serpent: [5, 3], kraken: [4, 2], shark: [6, 3], ptero: [3, 2], kaiju: [2, 2], whale: [5, 3],
};
// Movement ranges [OFFICIAL]; ptero = straight line, any length (0 here means "line")
export const RANGE: Record<Kind, [number, number]> = { serpent: [1, 1], shark: [1, 2], kaiju: [1, 2], kraken: [1, 1], whale: [1, 3], ptero: [1, 99] };
export function explorerValues(players: number): number[] {
  // [OFFICIAL] 10 adventurers per colour worth 1–5. [ASSUMED] two of each value (the split isn't printed in the rules).
  const set = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  return players === 2 ? [...set, ...set] : set; // [OFFICIAL] 2 players play two colours each
}

/* ---------- board geometry: a 13×11 rectangle of pointy hexes, like the printed board ---------- */
export const COLS = 6, ROWS = 5; // columns −6..6, rows −5..5
export const offsetToAxial = (col: number, row: number) => key(col - (row - (row & 1)) / 2, row);
export function boardHexes(): string[] {
  const out: string[] = [];
  for (let row = -ROWS; row <= ROWS; row++) for (let col = -COLS; col <= COLS; col++) out.push(offsetToAxial(col, row));
  return out;
}
export const RESCUE = [offsetToAxial(-COLS, -ROWS), offsetToAxial(COLS, -ROWS), offsetToAxial(-COLS, ROWS), offsetToAxial(COLS, ROWS)];
export const CORNER_SPOTS = [offsetToAxial(-4, -3), offsetToAxial(4, -3), offsetToAxial(-4, 3), offsetToAxial(4, 3)];
export const CENTER = '0,0';
// [ASSUMED] the printed island outline: rings 1–3 around a central water hole (where a serpent starts) + 4 extra hexes.
export const ISLAND = [...ring(1), ...ring(2), ...ring(3), '4,-1', '-4,1', '1,3', '-1,-3'];

/* ---------- queries ---------- */
const onBoard = (e: Explorer) => e.status === 'land' || e.status === 'boat' || e.status === 'swimming';
export const isLand = (s: GameState, k: string) => !!s.tiles[k] && !s.tiles[k].sunk;
export const isSafe = (s: GameState, k: string) => s.safe.includes(k);
export const isVolcano = (s: GameState, k: string) => s.volcanoes.includes(k);
export const isPiranha = (s: GameState, k: string) => s.piranhas.includes(k);
export const inBoard = (s: GameState, k: string) => s.board.includes(k);
/** A Water space: in the board, not land, not a rescue island, not a revealed volcano. Piranha tiles count as water. */
export const isWater = (s: GameState, k: string) => inBoard(s, k) && !isSafe(s, k) && !isLand(s, k) && !isVolcano(s, k);
export const boatAt = (s: GameState, k: string) => s.boats.find(b => b.hex === k);
export const aboard = (s: GameState, boatId: string) => s.explorers.filter(e => e.boat === boatId && e.status === 'boat');
export const swimmersAt = (s: GameState, k: string) => s.explorers.filter(e => e.hex === k && e.status === 'swimming');
export const explorersAt = (s: GameState, k: string) => s.explorers.filter(e => e.hex === k && onBoard(e));
export const creaturesAt = (s: GameState, k: string) => s.creatures.filter(c => c.hex === k);
export const hasKaiju = (s: GameState, k: string) => s.creatures.some(c => c.hex === k && c.kind === 'kaiju');
export const currentPlayer = (s: GameState) => s.order[s.current];
const swimLimit = (s: GameState) => (s.settings.mode === 'custom' && s.settings.house.fastSwimmers ? 2 : 1);
export const hasAdventurers = (s: GameState, pid: string) => s.explorers.some(e => e.owner === pid && onBoard(e));
export const kindsOfColor = (s: GameState, c: CColor) => s.inPlay.filter(k => KIND_COLOR[k] === c);
export function maxOf(s: GameState, k: Kind) {
  if (!s.inPlay.includes(k)) return 0;
  return CREATURE_COUNTS[k][kindsOfColor(s, KIND_COLOR[k]).length > 1 ? 1 : 0];
}
export const reserveOf = (s: GameState, k: Kind) => maxOf(s, k) - s.creatures.filter(c => c.kind === k).length;
export const raftSupply = (s: GameState) => TOTAL_RAFTS - s.boats.length;

export function controlsBoat(s: GameState, pid: string, b: Boat) {
  const occ = aboard(s, b.id);
  if (occ.length === 0) return true; // [OFFICIAL] an empty raft may be moved by anyone
  const counts: Record<string, number> = {};
  occ.forEach(e => (counts[e.owner] = (counts[e.owner] || 0) + 1));
  const mine = counts[pid] || 0;
  return mine > 0 && mine >= Math.max(...Object.values(counts)); // [OFFICIAL] at least as many as each opponent
}

export function lowestTier(s: GameState): Terrain | null {
  for (const t of TIER) if (Object.values(s.tiles).some(x => x.terrain === t && !x.sunk)) return t;
  return null;
}
/** [OFFICIAL] any tile of the thinnest remaining type (beaches, then forests, then mountains). */
export function sinkableTiles(s: GameState): string[] {
  const tier = lowestTier(s);
  return tier ? Object.values(s.tiles).filter(t => t.terrain === tier && !t.sunk).map(t => t.key) : [];
}

/** Can an adventurer (or raft) step into hex k at all? Nothing may enter a Kaiju's space or a volcano. */
const enterable = (s: GameState, k: string) => inBoard(s, k) && !isVolcano(s, k) && !hasKaiju(s, k);

export function explorerTargets(s: GameState, pid: string, id: string): string[] {
  const e = s.explorers.find(x => x.id === id);
  if (!e || e.owner !== pid || s.phase !== 'action' || s.movesLeft < 1 || !e.hex || !onBoard(e)) return [];
  if (currentPlayer(s) !== pid) return [];
  const canSwim = (s.swam[e.id] || 0) < swimLimit(s);
  const out: string[] = [];
  for (const n of neighbors(e.hex)) {
    if (!enterable(s, n)) continue;
    const b = boatAt(s, n);
    const raftRoom = !!b && aboard(s, b.id).length < BOAT_CAPACITY;
    if (e.status === 'swimming') {
      // [OFFICIAL] swimming: start OR end on a Water space; once per adventurer per turn
      if (canSwim && (isLand(s, n) || isSafe(s, n) || isWater(s, n))) out.push(n);
    } else {
      // on foot: land / raft / rescue island → land / raft / rescue island
      if (isLand(s, n) || isSafe(s, n) || raftRoom) out.push(n);
      else if (canSwim && isWater(s, n)) out.push(n); // diving in = swimming
    }
  }
  return out;
}
export function boatTargets(s: GameState, pid: string, id: string): string[] {
  const b = s.boats.find(x => x.id === id);
  if (!b || s.phase !== 'action' || s.movesLeft < 1 || currentPlayer(s) !== pid || !controlsBoat(s, pid, b)) return [];
  return neighbors(b.hex).filter(n => isWater(s, n) && !boatAt(s, n) && !hasKaiju(s, n));
}

/** Elements a creature interacts with in hex k. [OFFICIAL] rulebook p.6 + Monster Pack p.4 */
export function interactsAt(s: GameState, kind: Kind, k: string, exceptId?: string): boolean {
  const advs = explorersAt(s, k), swim = swimmersAt(s, k), raft = !!boatAt(s, k);
  switch (kind) {
    case 'serpent': return raft || advs.length > 0;
    case 'shark': case 'kraken': return swim.length > 0;
    case 'whale': return raft;
    case 'ptero': return advs.length > 0;
    case 'kaiju': return raft || advs.length > 0 || s.creatures.some(c => c.hex === k && c.id !== exceptId);
  }
}
/** Legal destinations for a creature, with the path walked to get there. */
export function creaturePaths(s: GameState, id: string): Record<string, string[]> {
  const c = s.creatures.find(x => x.id === id);
  const out: Record<string, string[]> = {};
  if (!c) return out;
  if (c.kind === 'ptero') {
    // [OFFICIAL] straight line in any of 6 directions, any length; flies over anything;
    // stops on a Water/Land space with at most one adventurer (not a volcano, Kaiju or rescue island).
    for (const [dq, dr] of DIRS) {
      let [q, r] = parse(c.hex);
      const path: string[] = [];
      for (;;) {
        q += dq; r += dr;
        const k = key(q, r);
        if (!inBoard(s, k)) break;
        path.push(k);
        if (isSafe(s, k) || isVolcano(s, k) || hasKaiju(s, k)) continue;
        if (explorersAt(s, k).length <= 1) out[k] = [...path];
      }
    }
    return out;
  }
  const [, max] = RANGE[c.kind];
  const canEnter = (k: string) => {
    if (!inBoard(s, k) || isSafe(s, k) || isVolcano(s, k)) return false;
    if (hasKaiju(s, k) && c.kind !== 'kaiju') return false; // nothing but a Kaiju may enter a Kaiju space
    if (c.kind === 'kaiju') return isWater(s, k) || isLand(s, k); // [OFFICIAL] Kaiju: water and/or land
    return isWater(s, k);
  };
  const seen = new Set([c.hex]);
  let frontier: [string, string[]][] = [[c.hex, []]];
  for (let step = 0; step < max; step++) {
    const next: [string, string[]][] = [];
    for (const [h, path] of frontier)
      for (const n of neighbors(h)) {
        if (seen.has(n) || !canEnter(n)) continue;
        seen.add(n);
        const p = [...path, n];
        out[n] = p;
        // [OFFICIAL] a creature immediately ends its move on entering a space with elements it interacts with
        if (!interactsAt(s, c.kind, n, c.id) && !isPiranha(s, n)) next.push([n, p]);
      }
    frontier = next;
  }
  return out;
}
export const canMove = (s: GameState, c: Creature) => Object.keys(creaturePaths(s, c.id)).length > 0;
export function movableOfColor(s: GameState, col: CColor) {
  return s.creatures.filter(c => KIND_COLOR[c.kind] === col && canMove(s, c));
}

export function placeExplorerTargets(s: GameState): string[] {
  const land = Object.values(s.tiles).filter(t => !t.sunk).map(t => t.key);
  const empty = land.filter(k => !s.explorers.some(e => e.hex === k));
  if (empty.length) return empty;
  // [OFFICIAL] 5 players: once all tiles are occupied, place on tiles holding exactly one meeple
  return land.filter(k => s.explorers.filter(e => e.hex === k).length === 1);
}
export function placeBoatTargets(s: GameState): string[] {
  return s.board.filter(k => isWater(s, k) && !boatAt(s, k) && creaturesAt(s, k).length === 0 && neighbors(k).some(n => isLand(s, n)));
}

/* ---------- ability targeting (used by client highlights and server validation) ---------- */
export function abilityTargets(s: GameState, pid: string, ability: Ability, target?: string): string[] {
  if (s.phase !== 'action' || currentPlayer(s) !== pid) return [];
  switch (ability) {
    case 'paddles': { // move an empty raft or one you control 1 or 2 spaces
      const b = s.boats.find(x => x.id === target);
      if (!b || !controlsBoat(s, pid, b)) return [];
      const ok = (k: string) => isWater(s, k) && !boatAt(s, k) && !hasKaiju(s, k);
      const one = neighbors(b.hex).filter(ok);
      const two = one.filter(k => !isPiranha(s, k)).flatMap(k => neighbors(k).filter(n => n !== b.hex && ok(n)));
      return [...new Set([...one, ...two])];
    }
    case 'dolphin': { // move one of your swimmers 1 or 2 water spaces; may end on land or a raft
      const e = s.explorers.find(x => x.id === target);
      if (!e || e.owner !== pid || e.status !== 'swimming' || !e.hex) return [];
      const end = (k: string) => enterable(s, k) && (isWater(s, k) || isLand(s, k));
      const one = neighbors(e.hex).filter(end);
      const via = neighbors(e.hex).filter(k => enterable(s, k) && isWater(s, k) && !isPiranha(s, k));
      const two = via.flatMap(k => neighbors(k).filter(n => n !== e.hex && end(n)));
      return [...new Set([...one, ...two])];
    }
    case 'dive': { // move any creature to any empty water space
      if (!s.creatures.some(c => c.id === target)) return [];
      return s.board.filter(k => isWater(s, k) && !isPiranha(s, k) && !boatAt(s, k) && creaturesAt(s, k).length === 0
        && explorersAt(s, k).length === 0 && !s.eggs.some(g => g.hex === k));
    }
    case 'piranha': // place on a water space adjacent to a piranha tile
      return s.board.filter(k => isWater(s, k) && !isPiranha(s, k) && neighbors(k).some(n => isPiranha(s, n)));
    default: return [];
  }
}
export function abilityPieces(s: GameState, pid: string, ability: Ability): string[] {
  if (ability === 'paddles') return s.boats.filter(b => abilityTargets(s, pid, 'paddles', b.id).length).map(b => b.id);
  if (ability === 'dolphin') return s.explorers.filter(e => abilityTargets(s, pid, 'dolphin', e.id).length).map(e => e.id);
  if (ability === 'dive') return s.creatures.filter(c => abilityTargets(s, pid, 'dive', c.id).length).map(c => c.id);
  return [];
}
export function abilityUsable(s: GameState, pid: string, ability: Ability): boolean {
  if (s.phase !== 'action' || currentPlayer(s) !== pid) return false;
  if (ability === 'repellent') return false; // [DIGITAL] used automatically when needed
  if (ability === 'die') return true;
  if (ability === 'piranha') return abilityTargets(s, pid, 'piranha').length > 0;
  return abilityPieces(s, pid, ability).length > 0;
}

export function scores(s: GameState) {
  return s.order.map(pid => {
    const mine = s.explorers.filter(e => e.owner === pid);
    const rescued = mine.filter(e => e.status === 'rescued');
    return {
      id: pid,
      score: rescued.reduce((a, e) => a + (e.value ?? 0), 0),
      rescued: rescued.length,
      lost: mine.filter(e => e.status === 'lost').length,
      remaining: mine.filter(onBoard).length,
    };
  });
}

/* ---------- setup ---------- */
type Rng = () => number;
function shuffle<T>(a: T[], rng: Rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pickOne = <T>(a: T[], rng: Rng) => a[Math.floor(rng() * a.length)];

export function createGame(players: PlayerInfo[], rawSettings: GameSettings, rng: Rng): GameState {
  const settings = normalizeSettings(JSON.parse(JSON.stringify(rawSettings)));
  const board = boardHexes();
  // [OFFICIAL] tiles are shuffled and placed randomly, landscape side up, inside the island outline
  const dist = JSON.parse(JSON.stringify(DISTRIBUTION)) as typeof DISTRIBUTION;
  if (settings.piranhas) { dist.beach.die! -= 1; (dist.beach as any).piranha = 1; } // [OFFICIAL] MP: replaces a Creature-die beach tile
  if (settings.eggs) { dist.beach.green! -= 1; dist.beach.blue! -= 1; (dist.beach as any).egg = 2; } // [OFFICIAL] MP
  const deck: { terrain: Terrain; effect: Effect }[] = [];
  for (const t of TIER) for (const [e, n] of Object.entries(dist[t])) for (let i = 0; i < (n as number); i++) deck.push({ terrain: t, effect: e as Effect });
  shuffle(deck, rng);
  const tiles: Record<string, Tile> = {};
  ISLAND.forEach((k, i) => (tiles[k] = { key: k, ...deck[i], sunk: false, takenBy: null }));
  const sea = board.filter(k => !tiles[k] && !RESCUE.includes(k));
  const inPlay = ALL_KINDS.filter(k => settings.creatures[k]);
  const s: GameState = {
    seq: 0, turn: 1, current: 0, order: players.map(p => p.id),
    players: Object.fromEntries(players.map(p => [p.id, p])),
    phase: 'placeExplorers', movesLeft: MOVES_PER_TURN, sinksLeft: 1, swam: {}, board, tiles, sea, safe: [...RESCUE],
    volcanoes: [], piranhas: [], explorers: [], boats: [], creatures: [], eggs: [],
    hands: Object.fromEntries(players.map(p => [p.id, []])), piranhaSupply: settings.piranhas ? 5 : 0, inPlay,
    die: null, dieFor: null, pending: null, resume: null, toPlace: {}, boatsToPlace: {},
    settings, nextId: 1, winners: null, endReason: null, startedAt: Date.now(), endedAt: null, turnDeadline: null, log: [],
  };
  const vals = explorerValues(players.length);
  const boatsEach = (players.length === 2 ? 4 : 2) + (settings.mode === 'custom' && settings.house.extraBoats ? 1 : 0);
  for (const p of players) { s.toPlace[p.id] = [...vals]; s.boatsToPlace[p.id] = boatsEach; }
  // [OFFICIAL] red creatures start on the board: serpents on the 5 serpent spaces; krakens on the 4 corner spaces;
  // with both, a serpent in the middle and the rest in the 4 corners.
  const red = kindsOfColor(s, 'red');
  if (red.length === 2) {
    s.creatures.push({ id: nid(s), kind: 'serpent', hex: CENTER });
    CORNER_SPOTS.forEach((h, i) => s.creatures.push({ id: nid(s), kind: i % 2 ? 'kraken' : 'serpent', hex: h }));
  } else if (red[0] === 'kraken') {
    CORNER_SPOTS.forEach(h => s.creatures.push({ id: nid(s), kind: 'kraken', hex: h }));
  } else {
    [CENTER, ...CORNER_SPOTS].forEach(h => s.creatures.push({ id: nid(s), kind: 'serpent', hex: h }));
  }
  if (settings.quickSetup) {
    while (s.phase === 'placeExplorers' || s.phase === 'placeBoats') autoAct(s, currentPlayer(s), rng, []);
  }
  return s;
}
const nid = (s: GameState) => `p${s.nextId++}`;
/** Phase check that defeats TS narrowing (phase changes inside helper calls). */
const choosing = (s: GameState) => (s.phase as Phase) === 'choose';

/* ---------- action application (server) ---------- */
export function apply(s: GameState, pid: string, a: Action, rng: Rng): GameEvent[] {
  if (s.phase === 'ended') fail('The game is over.');
  if (currentPlayer(s) !== pid) fail('It is not your turn.');
  const ev: GameEvent[] = [];
  switch (a.type) {
    case 'auto': autoAct(s, pid, rng, ev); break;
    case 'placeExplorer': {
      if (s.phase !== 'placeExplorers') fail('Not the adventurer placement phase.');
      const left = s.toPlace[pid];
      const i = left.indexOf(a.value);
      if (i < 0) fail('You have no adventurer with that value left.');
      if (!placeExplorerTargets(s).includes(a.to)) fail('Adventurers must go on an empty island tile.');
      left.splice(i, 1);
      s.explorers.push({ id: nid(s), owner: pid, value: a.value, hex: a.to, boat: null, status: 'land' });
      ev.push({ t: 'place', player: pid, hex: a.to, what: 'explorer' });
      advancePlacement(s, rng, ev);
      break;
    }
    case 'placeBoat': {
      if (s.phase !== 'placeBoats') fail('Not the raft placement phase.');
      if (!placeBoatTargets(s).includes(a.to)) fail('Rafts must go on an empty water space next to the island.');
      s.boats.push({ id: nid(s), hex: a.to });
      s.boatsToPlace[pid]--;
      ev.push({ t: 'place', player: pid, hex: a.to, what: 'boat' });
      advancePlacement(s, rng, ev);
      break;
    }
    case 'moveExplorer': {
      if (!explorerTargets(s, pid, a.id).includes(a.to)) fail('Illegal adventurer move.');
      s.movesLeft--;
      moveExplorer(s, a.id, a.to, ev, true);
      checkEnd(s, ev);
      break;
    }
    case 'moveBoat': {
      if (!boatTargets(s, pid, a.id).includes(a.to)) fail('Illegal raft move.');
      s.movesLeft--;
      moveBoat(s, a.id, [a.to], ev);
      checkEnd(s, ev);
      break;
    }
    case 'useAbility': useAbility(s, pid, a, rng, ev); break;
    case 'endActions':
      if (s.phase !== 'action') fail('Not the action phase.');
      enterSink(s);
      break;
    case 'sink': {
      if (s.phase !== 'sink') fail('Not the Rising Waters phase.');
      if (!sinkableTiles(s).includes(a.hex)) fail('That tile cannot be removed yet (beaches first, then forests, then mountains).');
      sinkTile(s, pid, a.hex, rng, ev);
      break;
    }
    case 'roll': {
      if (s.phase !== 'roll') fail('Not time to roll the creature die.');
      rollDie(s, pid, rng, ev, 'phase');
      break;
    }
    case 'moveCreature': {
      if (s.phase !== 'creature') fail('Not the creature phase.');
      const c = s.creatures.find(x => x.id === a.id);
      if (!c || KIND_COLOR[c.kind] !== s.die) fail(`You must move a ${s.die} creature.`);
      const path = creaturePaths(s, a.id)[a.to];
      if (!path) fail('That creature cannot reach there.');
      moveCreature(s, c!, path, rng, ev);
      afterCreature(s, rng, ev);
      break;
    }
    case 'choose': {
      if (s.phase !== 'choose' || !s.pending) fail('Nothing to choose.');
      if (!s.pending!.options.includes(a.option)) fail('Not a valid choice.');
      resolveChoice(s, a.option, rng, ev);
      break;
    }
    default: fail('Unknown action.');
  }
  s.seq++;
  return ev;
}

function advancePlacement(s: GameState, rng: Rng, ev: GameEvent[]) {
  const n = s.order.length;
  const need = (pid: string) => (s.phase === 'placeExplorers'
    ? s.toPlace[pid].length > 0 && placeExplorerTargets(s).length > 0
    : s.boatsToPlace[pid] > 0 && raftSupply(s) > 0 && placeBoatTargets(s).length > 0);
  for (let i = 1; i <= n; i++) {
    const c = (s.current + i) % n;
    if (need(s.order[c])) { s.current = c; return; }
  }
  if (s.phase === 'placeExplorers') {
    s.order.forEach(p => (s.toPlace[p] = []));
    s.phase = 'placeBoats';
    s.current = n - 1;
    return advancePlacement(s, rng, ev);
  }
  s.current = 0;
  startTurn(s, rng, ev);
}

function startTurn(s: GameState, rng: Rng, ev: GameEvent[]) {
  const pid = currentPlayer(s);
  const any = hasAdventurers(s, pid);
  s.phase = 'action';
  s.movesLeft = any ? MOVES_PER_TURN : 0;
  s.sinksLeft = any ? 1 : 2; // [OFFICIAL] no adventurers left to rescue → remove 2 tiles
  s.swam = {};
  s.die = null; s.dieFor = null;
  ev.push({ t: 'turn', player: pid, turn: s.turn });
  hatchEggs(s, rng, ev);
}

/** [OFFICIAL] MP: at the start of your next Action phase, hatch your egg(s). */
function hatchEggs(s: GameState, rng: Rng, ev: GameEvent[]) {
  const pid = currentPlayer(s);
  for (;;) {
    if (s.phase !== 'action') return;
    const egg = s.eggs.find(e => e.owner === pid);
    if (!egg) return;
    s.eggs = s.eggs.filter(e => e !== egg);
    const face = rollFace(rng);
    ev.push({ t: 'die', face, player: pid, usable: true, why: 'egg' });
    ev.push({ t: 'hatch', hex: egg.hex });
    s.resume = 'hatch';
    spawnColor(s, face, egg.hex, 'egg', rng, ev);
    if (choosing(s)) return; // resumes in resolveChoice
    s.resume = null;
  }
}

function lose(s: GameState, e: Explorer, by: Cause, ev: GameEvent[]) {
  if (!onBoard(e)) return;
  ev.push({ t: 'eaten', explorer: e.id, owner: e.owner, by, hex: e.hex });
  e.status = 'lost'; e.hex = null; e.boat = null;
}
function rescue(e: Explorer, hex: string, ev: GameEvent[]) {
  e.status = 'rescued'; e.hex = null; e.boat = null;
  ev.push({ t: 'rescued', explorer: e.id, owner: e.owner, hex });
}
function removeBoat(s: GameState, b: Boat) { s.boats = s.boats.filter(x => x !== b); }
function removeCreature(s: GameState, c: Creature, by: Cause | 'repellent', ev: GameEvent[]) {
  if (!s.creatures.includes(c)) return;
  s.creatures = s.creatures.filter(x => x !== c);
  ev.push({ t: 'creatureGone', id: c.id, kind: c.kind, hex: c.hex, by });
}
/** Put a lone adventurer at hex: on land, on a raft with room, or swimming. */
function settle(s: GameState, e: Explorer, hex: string) {
  e.hex = hex;
  if (isLand(s, hex)) { e.status = 'land'; e.boat = null; return; }
  const b = boatAt(s, hex);
  // [OFFICIAL] an adventurer on the same space as a raft goes aboard immediately if there is room
  if (b && aboard(s, b.id).length < BOAT_CAPACITY) { e.status = 'boat'; e.boat = b.id; return; }
  e.status = 'swimming'; e.boat = null;
}
/** Swimmers in hex climb aboard the raft there (active player's first). */
function boardSwimmers(s: GameState, b: Boat) {
  const pid = currentPlayer(s);
  const sw = swimmersAt(s, b.hex).sort((x, y) => Number(y.owner === pid) - Number(x.owner === pid));
  for (const e of sw) if (aboard(s, b.id).length < BOAT_CAPACITY) { e.status = 'boat'; e.boat = b.id; }
}
/** Eliminate everything entering / sitting on a piranha tile. */
function piranhaBite(s: GameState, hex: string, ev: GameEvent[]) {
  if (!isPiranha(s, hex)) return false;
  explorersAt(s, hex).forEach(e => lose(s, e, 'piranha', ev));
  s.boats.filter(b => b.hex === hex).forEach(b => { removeBoat(s, b); ev.push({ t: 'boatDestroyed', id: b.id, hex, by: 'piranha' }); });
  creaturesAt(s, hex).forEach(c => removeCreature(s, c, 'piranha', ev));
  s.eggs = s.eggs.filter(g => g.hex !== hex);
  return true;
}
/** Elements were moved onto hex: every creature there interacts with them. [OFFICIAL] trigger #2 */
function arrive(s: GameState, hex: string, rng: Rng, ev: GameEvent[]) {
  if (piranhaBite(s, hex, ev)) return;
  for (const c of [...creaturesAt(s, hex)]) if (s.creatures.includes(c) && interactsAt(s, c.kind, hex, c.id)) interact(s, c, rng, ev);
}

/** [DIGITAL] Repellent is played automatically for the first affected player who holds one. */
function tryRepel(s: GameState, c: Creature, victims: Explorer[], ev: GameEvent[]) {
  const owners = [...new Set(victims.map(e => e.owner))];
  const start = s.current;
  const ordered = s.order.map((_, i) => s.order[(start + i) % s.order.length]).filter(p => owners.includes(p));
  for (const p of ordered) {
    const h = s.hands[p].findIndex(t => t.kind === 'repellent');
    if (h >= 0) {
      s.hands[p].splice(h, 1);
      ev.push({ t: 'repel', player: p, kind: c.kind, hex: c.hex });
      removeCreature(s, c, 'repellent', ev);
      return true;
    }
  }
  return false;
}

/** Resolve creature c's interaction with the elements on its space. */
function interact(s: GameState, c: Creature, rng: Rng, ev: GameEvent[], depth = 0) {
  const hex = c.hex;
  switch (c.kind) {
    case 'serpent': {
      s.boats.filter(b => b.hex === hex).forEach(b => { removeBoat(s, b); ev.push({ t: 'boatDestroyed', id: b.id, hex, by: 'serpent' }); });
      explorersAt(s, hex).forEach(e => lose(s, e, 'serpent', ev));
      s.explorers.filter(e => e.status === 'boat' && !s.boats.some(b => b.id === e.boat)).forEach(e => lose(s, e, 'serpent', ev));
      break;
    }
    case 'shark': {
      const v = swimmersAt(s, hex);
      if (v.length && !tryRepel(s, c, v, ev)) v.forEach(e => lose(s, e, 'shark', ev));
      break;
    }
    case 'kraken': swimmersAt(s, hex).forEach(e => lose(s, e, 'kraken', ev)); break;
    case 'ptero': explorersAt(s, hex).forEach(e => lose(s, e, 'ptero', ev)); break;
    case 'whale': {
      for (const b of s.boats.filter(b => b.hex === hex)) {
        const crew = aboard(s, b.id);
        removeBoat(s, b);
        crew.forEach(e => { e.status = 'swimming'; e.boat = null; });
        ev.push({ t: 'capsize', id: b.id, hex });
      }
      // [ASSUMED] the crew are now swimmers on this space: other creatures here interact with them
      for (const o of creaturesAt(s, hex)) if (o !== c && o.kind !== 'whale' && interactsAt(s, o.kind, hex, o.id)) interact(s, o, rng, ev, depth + 1);
      break;
    }
    case 'kaiju': {
      const advs = explorersAt(s, hex);
      if (advs.length && tryRepel(s, c, advs, ev)) return;
      // eliminates rafts (crew are pushed with everyone else)
      s.boats.filter(b => b.hex === hex).forEach(b => {
        aboard(s, b.id).forEach(e => { e.status = 'swimming'; e.boat = null; });
        removeBoat(s, b); ev.push({ t: 'boatDestroyed', id: b.id, hex, by: 'kaiju' });
      });
      // [OFFICIAL] pushes adventurers onto adjacent spaces (any, not necessarily the same)
      // [DIGITAL] the server chooses each landing space at random among legal ones
      const dests = neighbors(hex).filter(n => enterable(s, n) && !isSafe(s, n) && (isLand(s, n) || isWater(s, n)));
      for (const e of explorersAt(s, hex)) {
        if (!dests.length) { lose(s, e, 'kaiju', ev); continue; }
        const to = pickOne(dests, rng);
        ev.push({ t: 'push', id: e.id, from: hex, to });
        settle(s, e, to);
        arrive(s, to, rng, ev);
      }
      // displaces other creatures according to their movement rules
      if (depth < 3) for (const o of creaturesAt(s, hex)) {
        if (o === c || !s.creatures.includes(o)) continue;
        const paths = creaturePaths(s, o.id);
        const opts = Object.keys(paths);
        if (!opts.length) continue;
        moveCreature(s, o, paths[pickOne(opts, rng)], rng, ev, depth + 1);
      }
      break;
    }
  }
}

function moveExplorer(s: GameState, eid: string, to: string, ev: GameEvent[], countSwim: boolean, rng: Rng = Math.random) {
  const e = s.explorers.find(x => x.id === eid)!;
  const from = e.hex;
  const swimming = e.status === 'swimming' || (!isLand(s, to) && !isSafe(s, to) && !(boatAt(s, to) && aboard(s, boatAt(s, to)!.id).length < BOAT_CAPACITY));
  if (countSwim && swimming) s.swam[e.id] = (s.swam[e.id] || 0) + 1;
  ev.push({ t: 'moveExplorer', id: e.id, from, to });
  if (isSafe(s, to)) return rescue(e, to, ev);
  settle(s, e, to);
  arrive(s, to, rng, ev);
}

function moveBoat(s: GameState, bid: string, path: string[], ev: GameEvent[], rng: Rng = Math.random) {
  for (const to of path) {
    const b = s.boats.find(x => x.id === bid);
    if (!b) return;
    ev.push({ t: 'moveBoat', id: b.id, from: b.hex, to });
    b.hex = to;
    aboard(s, b.id).forEach(e => (e.hex = to));
    boardSwimmers(s, b);
    arrive(s, to, rng, ev);
  }
}

function enterSink(s: GameState) {
  s.phase = sinkableTiles(s).length && s.sinksLeft > 0 ? 'sink' : 'roll';
}

function sinkTile(s: GameState, pid: string, hex: string, rng: Rng, ev: GameEvent[]) {
  const t = s.tiles[hex];
  t.sunk = true;
  s.sinksLeft--;
  const effect = t.effect as Effect;
  ev.push({ t: 'sink', hex, terrain: t.terrain, effect, player: pid });
  // [OFFICIAL] adventurers and creatures on the tile go onto the revealed water space
  explorersAt(s, hex).forEach(e => { e.status = 'swimming'; });
  s.resume = 'sink';
  switch (effect) {
    case 'green': case 'blue': spawnColor(s, effect, hex, 'tile', rng, ev); break;
    case 'raft': {
      if (raftSupply(s) > 0) { spawnRaft(s, hex, ev); break; }
      // [OFFICIAL FAQ] supply empty → move an empty raft already on the board here
      const empty = s.boats.filter(b => aboard(s, b.id).length === 0).map(b => b.id);
      if (empty.length === 1) relocateRaft(s, empty[0], hex, rng, ev);
      else if (empty.length > 1) { s.pending = { type: 'raftPick', hex, options: empty }; s.phase = 'choose'; }
      break;
    }
    case 'whirlpool': {
      // [OFFICIAL] remove all elements on this space and all adjacent Water spaces (not piranha tiles)
      ev.push({ t: 'whirlpool', hex });
      const area = [hex, ...neighbors(hex).filter(n => isWater(s, n))];
      for (const k of area) {
        explorersAt(s, k).forEach(e => lose(s, e, 'whirlpool', ev));
        s.boats.filter(b => b.hex === k).forEach(b => { removeBoat(s, b); ev.push({ t: 'boatDestroyed', id: b.id, hex: k, by: 'whirlpool' }); });
        creaturesAt(s, k).forEach(c => removeCreature(s, c, 'whirlpool', ev));
        s.eggs = s.eggs.filter(g => g.hex !== k);
      }
      break;
    }
    case 'volcano': {
      // [OFFICIAL] removes adventurers and creatures on this space; tile stays face up and the space is inaccessible
      explorersAt(s, hex).forEach(e => lose(s, e, 'volcano', ev));
      creaturesAt(s, hex).forEach(c => removeCreature(s, c, 'volcano', ev));
      s.eggs = s.eggs.filter(g => g.hex !== hex);
      s.volcanoes.push(hex);
      ev.push({ t: 'volcano', hex, count: s.volcanoes.length });
      const limit = s.settings.mode === 'custom' && s.settings.house.suddenVolcano ? 1 : VOLCANOES_TO_END;
      if (s.volcanoes.length >= limit) return endGame(s, limit === 1 ? 'The volcano erupted!' : 'The third volcano erupted! Everyone still on or around the island is lost.', ev);
      break;
    }
    case 'piranha': {
      // [OFFICIAL] MP: eliminate everything on the space, leave the tile face up, deal all 5 Piranha ability tiles
      s.piranhas.push(hex);
      ev.push({ t: 'piranha', hex });
      piranhaBite(s, hex, ev);
      const n = s.order.length;
      for (let i = 0; s.piranhaSupply > 0; i++) {
        const p = s.order[(s.current + i) % n];
        s.hands[p].push({ id: nid(s), kind: 'piranha' });
        s.piranhaSupply--;
        ev.push({ t: 'gain', player: p, ability: 'piranha' });
      }
      break;
    }
    case 'egg': {
      // [OFFICIAL] MP: place an Egg token on any water space; hatch it at the start of your next turn
      const opts = s.board.filter(k => isWater(s, k) && !isPiranha(s, k) && !s.eggs.some(g => g.hex === k));
      if (opts.length) { s.pending = { type: 'egg', options: opts }; s.phase = 'choose'; }
      break;
    }
    default: {
      // ability tile: kept secretly in hand
      t.takenBy = pid;
      s.hands[pid].push({ id: nid(s), kind: effect as Ability });
      ev.push({ t: 'gain', player: pid, ability: effect as Ability });
    }
  }
  if (choosing(s)) return;
  s.resume = null;
  afterSink(s, ev);
}
function afterSink(s: GameState, ev: GameEvent[]) {
  if (checkEnd(s, ev)) return;
  if (s.sinksLeft > 0 && sinkableTiles(s).length) s.phase = 'sink';
  else s.phase = 'roll';
}
function spawnRaft(s: GameState, hex: string, ev: GameEvent[]) {
  const b = { id: nid(s), hex };
  s.boats.push(b);
  ev.push({ t: 'spawn', kind: 'boat', hex });
  boardSwimmers(s, b);
  piranhaBite(s, hex, ev);
}
function relocateRaft(s: GameState, bid: string, hex: string, rng: Rng, ev: GameEvent[]) {
  const b = s.boats.find(x => x.id === bid)!;
  ev.push({ t: 'moveBoat', id: b.id, from: b.hex, to: hex });
  b.hex = hex;
  boardSwimmers(s, b);
  arrive(s, hex, rng, ev);
}

/** Bring a creature of colour `col` into play on hex (tile effect or egg). May open a choice. */
function spawnColor(s: GameState, col: CColor, hex: string, why: 'tile' | 'egg', rng: Rng, ev: GameEvent[]) {
  const opts = spawnOptions(s, col, hex);
  if (!opts.length) return;
  if (opts.length === 1) return doSpawn(s, opts[0], hex, rng, ev);
  s.pending = { type: 'spawn', hex, color: col, options: opts, why };
  s.phase = 'choose';
}
export function spawnOptions(s: GameState, col: CColor, hex: string): string[] {
  const kaijuThere = hasKaiju(s, hex);
  const kinds = kindsOfColor(s, col).filter(k => !kaijuThere || k === 'kaiju');
  const fresh = kinds.filter(k => reserveOf(s, k) > 0).map(k => `new:${k}`);
  if (fresh.length) return fresh;
  // [OFFICIAL] all of that type on the board → move one of them onto this space
  return s.creatures.filter(c => kinds.includes(c.kind) && c.hex !== hex).map(c => `move:${c.id}`);
}
function doSpawn(s: GameState, opt: string, hex: string, rng: Rng, ev: GameEvent[]) {
  let c: Creature;
  if (opt.startsWith('new:')) {
    c = { id: nid(s), kind: opt.slice(4) as Kind, hex };
    s.creatures.push(c);
    ev.push({ t: 'spawn', kind: c.kind, hex });
  } else {
    c = s.creatures.find(x => x.id === opt.slice(5))!;
    ev.push({ t: 'creatureMove', id: c.id, kind: c.kind, path: [hex] });
    c.hex = hex;
  }
  creatureLands(s, c, rng, ev, 0);
}
/** A creature has just arrived on its hex (moved, placed, displaced): piranhas, kaiju displacement, interactions. */
function creatureLands(s: GameState, c: Creature, rng: Rng, ev: GameEvent[], depth: number) {
  if (isPiranha(s, c.hex)) return removeCreature(s, c, 'piranha', ev);
  if (c.kind === 'kaiju') {
    // [OFFICIAL] a Kaiju entering another Kaiju's space displaces the first one
    const other = s.creatures.find(o => o !== c && o.kind === 'kaiju' && o.hex === c.hex);
    if (other && depth < 3) {
      const paths = creaturePaths(s, other.id);
      const opts = Object.keys(paths).filter(k => k !== c.hex);
      if (opts.length) moveCreature(s, other, paths[pickOne(opts, rng)], rng, ev, depth + 1);
    }
  }
  if (s.creatures.includes(c) && interactsAt(s, c.kind, c.hex, c.id)) interact(s, c, rng, ev, depth);
}

function rollFace(rng: Rng): CColor {
  // [ASSUMED] the creature die has two faces of each colour (red, green, blue)
  return (['red', 'red', 'green', 'green', 'blue', 'blue'] as CColor[])[Math.floor(rng() * 6)];
}
function rollDie(s: GameState, pid: string, rng: Rng, ev: GameEvent[], why: 'phase' | 'ability') {
  const face = rollFace(rng);
  const movers = movableOfColor(s, face);
  ev.push({ t: 'die', face, player: pid, usable: movers.length > 0, why });
  if (movers.length) { s.die = face; s.dieFor = why; s.phase = 'creature'; return; }
  if (why === 'phase') nextTurn(s, rng, ev);
}

function moveCreature(s: GameState, c: Creature, path: string[], rng: Rng, ev: GameEvent[], depth = 0) {
  const to = path[path.length - 1];
  ev.push({ t: 'creatureMove', id: c.id, kind: c.kind, path });
  c.hex = to;
  creatureLands(s, c, rng, ev, depth);
  // [OFFICIAL] MP Kraken: after moving, eliminate one adventurer on its space or an adjacent one (mandatory)
  if (depth === 0 && c.kind === 'kraken' && s.creatures.includes(c)) {
    const opts = s.explorers.filter(e => onBoard(e) && e.hex && dist(e.hex, c.hex) <= 1).map(e => e.id);
    if (opts.length === 1) { const e = s.explorers.find(x => x.id === opts[0])!; lose(s, e, 'kraken', ev); }
    else if (opts.length > 1) { s.pending = { type: 'kraken', creature: c.id, options: opts }; s.phase = 'choose'; s.resume = 'creature'; }
  }
}
function afterCreature(s: GameState, rng: Rng, ev: GameEvent[]) {
  if (choosing(s)) return;
  s.resume = null;
  if (checkEnd(s, ev)) return;
  const why = s.dieFor;
  s.die = null; s.dieFor = null;
  if (why === 'ability') s.phase = 'action';
  else nextTurn(s, rng, ev);
}

function resolveChoice(s: GameState, opt: string, rng: Rng, ev: GameEvent[]) {
  const p = s.pending!;
  s.pending = null;
  s.phase = 'action'; // placeholder, replaced by the resume step below
  if (p.type === 'spawn') doSpawn(s, opt, p.hex, rng, ev);
  else if (p.type === 'raftPick') relocateRaft(s, opt, p.hex, rng, ev);
  else if (p.type === 'egg') { s.eggs.push({ id: nid(s), hex: opt, owner: currentPlayer(s) }); ev.push({ t: 'spawn', kind: 'egg', hex: opt }); }
  else if (p.type === 'kraken') { const e = s.explorers.find(x => x.id === opt); if (e) lose(s, e, 'kraken', ev); }
  if (choosing(s)) return; // another choice opened (rare)
  const r = s.resume;
  s.resume = null;
  if (r === 'sink') afterSink(s, ev);
  else if (r === 'creature') afterCreature(s, rng, ev);
  else if (r === 'hatch') { s.phase = 'action'; if (!checkEnd(s, ev)) hatchEggs(s, rng, ev); }
  else { s.phase = 'action'; checkEnd(s, ev); }
}

function useAbility(s: GameState, pid: string, a: Extract<Action, { type: 'useAbility' }>, rng: Rng, ev: GameEvent[]) {
  if (s.phase !== 'action') fail('Abilities are used during your Action phase.');
  const hand = s.hands[pid];
  const i = hand.findIndex(t => t.id === a.tile);
  if (i < 0) fail('You do not hold that tile.');
  const ab = hand[i].kind!;
  if (ab === 'repellent') fail('Repellent is played automatically when a Shark or Kaiju reaches your adventurer.');
  if (ab !== 'die') {
    if (!a.to || !abilityTargets(s, pid, ab, a.target).includes(a.to)) fail('Not a legal target for that ability.');
  }
  hand.splice(i, 1);
  ev.push({ t: 'ability', player: pid, ability: ab });
  switch (ab) {
    case 'paddles': {
      const b = s.boats.find(x => x.id === a.target)!;
      const path = neighbors(b.hex).includes(a.to!) ? [a.to!] : [neighbors(b.hex).find(n => isWater(s, n) && !boatAt(s, n) && !hasKaiju(s, n) && !isPiranha(s, n) && neighbors(n).includes(a.to!))!, a.to!];
      moveBoat(s, b.id, path, ev, rng);
      break;
    }
    case 'dolphin': moveExplorer(s, a.target!, a.to!, ev, false, rng); break; // doesn't use the swim
    case 'dive': {
      const c = s.creatures.find(x => x.id === a.target)!;
      ev.push({ t: 'creatureMove', id: c.id, kind: c.kind, path: [a.to!] });
      c.hex = a.to!;
      break;
    }
    case 'piranha': {
      s.piranhas.push(a.to!);
      ev.push({ t: 'piranha', hex: a.to! });
      piranhaBite(s, a.to!, ev); // [ASSUMED] anything already on that space is eliminated
      break;
    }
    case 'die': rollDie(s, pid, rng, ev, 'ability'); break;
  }
  checkEnd(s, ev);
}

function checkEnd(s: GameState, ev: GameEvent[]) {
  if (s.phase === 'ended') return true;
  if (!s.explorers.some(onBoard) && s.explorers.length > 0 && s.phase !== 'placeExplorers' && s.phase !== 'placeBoats') {
    endGame(s, 'No adventurers are left to rescue.', ev);
    return true;
  }
  return false;
}

function nextTurn(s: GameState, rng: Rng, ev: GameEvent[]) {
  s.die = null; s.dieFor = null;
  if (checkEnd(s, ev)) return;
  s.current = (s.current + 1) % s.order.length;
  if (s.current === 0) s.turn++;
  startTurn(s, rng, ev);
}

function endGame(s: GameState, reason: string, ev: GameEvent[]) {
  // [OFFICIAL] adventurers not yet rescued score nothing
  s.explorers.filter(onBoard).forEach(e => lose(s, e, 'volcano', ev));
  s.phase = 'ended';
  s.pending = null;
  s.endReason = reason;
  s.endedAt = Date.now();
  const sc = scores(s);
  const best = Math.max(...sc.map(x => x.score));
  // [OFFICIAL] ties share the victory. [DIGITAL] if nobody saved any treasure, nobody wins.
  s.winners = best === 0 ? [] : sc.filter(x => x.score === best).map(x => x.id);
  ev.push({ t: 'end', reason });
}

/** A random legal action for the current step (used for "Auto", quick setup and turn timeouts). */
export function autoAct(s: GameState, pid: string, rng: Rng, ev: GameEvent[]) {
  switch (s.phase) {
    case 'placeExplorers': {
      const left = s.toPlace[pid];
      const v = left[left.length - 1];
      left.pop();
      const to = pickOne(placeExplorerTargets(s), rng);
      s.explorers.push({ id: nid(s), owner: pid, value: v, hex: to, boat: null, status: 'land' });
      ev.push({ t: 'place', player: pid, hex: to, what: 'explorer' });
      return advancePlacement(s, rng, ev);
    }
    case 'placeBoats': {
      const spots = placeBoatTargets(s);
      if (spots.length && raftSupply(s) > 0) {
        const to = pickOne(spots, rng);
        s.boats.push({ id: nid(s), hex: to });
        ev.push({ t: 'place', player: pid, hex: to, what: 'boat' });
        s.boatsToPlace[pid]--;
      } else s.boatsToPlace[pid] = 0;
      return advancePlacement(s, rng, ev);
    }
    case 'action': return enterSink(s);
    case 'sink': return sinkTile(s, pid, pickOne(sinkableTiles(s), rng), rng, ev);
    case 'roll': return rollDie(s, pid, rng, ev, 'phase');
    case 'creature': {
      const movers = movableOfColor(s, s.die!);
      if (!movers.length) return afterCreature(s, rng, ev);
      const c = pickOne(movers, rng);
      const paths = creaturePaths(s, c.id);
      moveCreature(s, c, paths[pickOne(Object.keys(paths), rng)], rng, ev);
      return afterCreature(s, rng, ev);
    }
    case 'choose': return resolveChoice(s, pickOne(s.pending!.options, rng), rng, ev);
  }
}

/** Hide information the viewer is not allowed to see. */
export function redact(s: GameState, viewer: string | null): GameState {
  const c: GameState = JSON.parse(JSON.stringify(s));
  const over = c.phase === 'ended';
  if (!over) {
    // [OFFICIAL] treasure values stay secret (even rescued ones) until final scoring
    c.explorers.forEach(e => { if (e.owner !== viewer) e.value = null; });
    for (const pid of Object.keys(c.toPlace)) if (pid !== viewer) c.toPlace[pid] = c.toPlace[pid].map(() => 0);
    for (const pid of Object.keys(c.hands)) if (pid !== viewer) c.hands[pid] = c.hands[pid].map(t => ({ id: t.id, kind: null }));
  }
  Object.values(c.tiles).forEach(t => {
    if (!t.sunk) { if (!over) t.effect = null; }
    else if (isAbilityEffect(t.effect) && t.takenBy !== viewer && !over) t.effect = 'secret';
  });
  // the Kraken victim choice reveals nothing secret; the egg/spawn choices are public
  c.log = [];
  return c;
}
/** Hide secret parts of an event for a given viewer. */
export function redactEvent(e: GameEvent, viewer: string | null): GameEvent {
  if (e.t === 'sink' && isAbilityEffect(e.effect) && e.player !== viewer) return { ...e, effect: 'secret' };
  if (e.t === 'gain' && e.player !== viewer && e.ability !== 'piranha') return { ...e, ability: null };
  return e;
}
