// Rules-engine self test: plays many random full games (all Monster Pack combinations) and checks invariants.
import { apply, createGame, defaultSettings, explorerTargets, currentPlayer, RuleError, scores, boatTargets, isLand, aboard,
  BOAT_CAPACITY, abilityUsable, abilityPieces, abilityTargets, creaturePaths, KIND_COLOR, movableOfColor, maxOf, ALL_KINDS,
  isVolcano, hasKaiju, redact, ISLAND, TOTAL_RAFTS, type Action, type Kind } from '../shared/game';

let seed = 7;
const rng = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T>(a: T[]) => a[Math.floor(rng() * a.length)];
const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `P${i}`, name: `P${i}`, color: '#fff', character: 'gojirex' }));
let failures = 0;
const check = (c: boolean, m: string) => { if (!c) { failures++; if (failures < 30) console.error('FAIL:', m); } };
const used: Record<string, number> = {};
const GAMES = 400;

for (let g = 0; g < GAMES; g++) {
  const n = 2 + (g % 4);
  const st = defaultSettings();
  if (g % 3 !== 0) {
    st.mode = g % 6 === 1 ? 'custom' : 'monster';
    for (const k of ALL_KINDS) st.creatures[k] = rng() < 0.5;
    st.piranhas = rng() < 0.6; st.eggs = rng() < 0.6;
    if (st.mode === 'custom') st.house = { fastSwimmers: rng() < 0.5, extraBoats: rng() < 0.5, suddenVolcano: rng() < 0.2 };
  }
  st.quickSetup = g % 4 !== 0;
  const s = createGame(players(n), st, rng);
  check(Object.keys(s.tiles).length === 40 && ISLAND.length === 40, 'island must have 40 tiles');
  for (const col of ['red', 'green', 'blue']) check(s.inPlay.some(k => KIND_COLOR[k] === col), `no ${col} creature type in play`);
  const other = s.order[(s.current + 1) % n];
  try { apply(s, other, { type: 'endActions' }, rng); check(false, 'wrong turn accepted'); } catch (e) { check(e instanceof RuleError, 'wrong error'); }
  let steps = 0;
  while (s.phase !== 'ended' && steps++ < 8000) {
    const pid = currentPlayer(s);
    let a: Action = { type: 'auto' };
    if (s.phase === 'placeExplorers' && rng() < 0.3) {
      try { apply(s, pid, { type: 'placeExplorer', to: '99,99', value: 1 }, rng); check(false, 'bad placement accepted'); } catch { /* expected */ }
    }
    if (s.phase === 'action') {
      const opts: Action[] = [];
      for (const e of s.explorers.filter(e => e.owner === pid)) for (const to of explorerTargets(s, pid, e.id)) opts.push({ type: 'moveExplorer', id: e.id, to });
      for (const b of s.boats) for (const to of boatTargets(s, pid, b.id)) opts.push({ type: 'moveBoat', id: b.id, to });
      for (const t of s.hands[pid]) {
        if (!t.kind || !abilityUsable(s, pid, t.kind)) continue;
        if (t.kind === 'die') { opts.push({ type: 'useAbility', tile: t.id }); continue; }
        const pieces = t.kind === 'piranha' ? [undefined] : abilityPieces(s, pid, t.kind);
        const target = pick(pieces);
        const to = pick(abilityTargets(s, pid, t.kind, target));
        if (to) opts.push({ type: 'useAbility', tile: t.id, target, to });
      }
      a = opts.length && rng() < 0.9 ? pick(opts) : { type: 'endActions' };
      if (a.type === 'useAbility') used[s.hands[pid].find(t => t.id === (a as any).tile)!.kind!] = (used[s.hands[pid].find(t => t.id === (a as any).tile)!.kind!] || 0) + 1;
    } else if (s.phase === 'sink') {
      try { apply(s, pid, { type: 'sink', hex: '99,99' }, rng); check(false, 'bad sink accepted'); } catch { /* expected */ }
    } else if (s.phase === 'creature') {
      // mandatory move: skipping is not an action any more
      const movers = movableOfColor(s, s.die!);
      check(movers.length > 0, 'creature phase with nothing to move');
      const c = pick(movers);
      const paths = creaturePaths(s, c.id);
      a = { type: 'moveCreature', id: c.id, to: pick(Object.keys(paths)) };
    } else if (s.phase === 'choose') {
      a = { type: 'choose', option: pick(s.pending!.options) };
      used[`choose:${s.pending!.type}`] = (used[`choose:${s.pending!.type}`] || 0) + 1;
    }
    try { apply(s, pid, a, rng); }
    catch (e) { check(false, `legal-looking action rejected in game ${g}: ${JSON.stringify(a)} → ${(e as Error).message}`); apply(s, pid, { type: 'auto' }, rng); }
    // invariants
    for (const b of s.boats) {
      check(aboard(s, b.id).length <= BOAT_CAPACITY, 'raft overloaded');
      check(!isLand(s, b.hex) && !isVolcano(s, b.hex), 'raft on land/volcano');
      check(s.boats.filter(x => x.hex === b.hex).length === 1, 'two rafts on one space');
    }
    check(s.boats.length <= TOTAL_RAFTS, 'too many rafts');
    for (const e of s.explorers) {
      if (e.status === 'land') check(!!e.hex && isLand(s, e.hex), 'adventurer on non-land');
      if (e.status === 'boat') check(s.boats.some(b => b.id === e.boat && b.hex === e.hex), 'adventurer in missing raft');
      if (e.status === 'swimming') check(!!e.hex && !isLand(s, e.hex) && !isVolcano(s, e.hex), 'swimmer on land');
      if (e.hex && ['land', 'boat', 'swimming'].includes(e.status)) check(!hasKaiju(s, e.hex), 'adventurer sharing a Kaiju space');
    }
    for (const k of s.inPlay) check(s.creatures.filter(c => c.kind === k).length <= maxOf(s as any, k as Kind), `too many ${k}`);
    check(s.creatures.every(c => s.inPlay.includes(c.kind)), 'creature type not in play');
    check(s.creatures.every(c => !isVolcano(s, c.hex)), 'creature on volcano');
    check(s.volcanoes.length <= 3, 'more than 3 volcanoes');
    // hidden information
    const view = redact(s, s.order[0]);
    if ((s.phase as string) !== 'ended') {
      check(view.explorers.filter(e => e.owner !== s.order[0]).every(e => e.value === null), 'opponent values leaked');
      check(Object.values(view.tiles).filter(t => !t.sunk).every(t => t.effect === null), 'unsunk tile effects leaked');
      check(Object.entries(view.hands).filter(([p]) => p !== s.order[0]).every(([, h]) => h.every(t => t.kind === null)), 'opponent hand leaked');
    }
  }
  check((s.phase as string) === 'ended', `game ${g} did not end`);
  const sc = scores(s);
  check(sc.every(x => x.remaining === 0), 'adventurers left after end');
  const best = Math.max(...sc.map(x => x.score));
  check(Array.isArray(s.winners) && (best === 0 ? s.winners.length === 0 : s.winners.every(w => sc.find(x => x.id === w)!.score === best)), 'winner rule');
}
console.log('Exercised:', JSON.stringify(used));
console.log(failures ? `${failures} failures` : `All engine self-tests passed (${GAMES} random games).`);
process.exit(failures ? 1 : 0);
