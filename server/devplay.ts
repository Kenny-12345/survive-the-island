// Dev tool: drive existing seats with random legal moves so you can watch a game advance in the browser.
// Usage: npx tsx server/devplay.ts <url> <stopAtVolcanoes or "new"> <token1> [token2 ...]
// (tokens are the 'sti-token' values from each browser tab's sessionStorage)
import { io } from 'socket.io-client';
import { abilityPieces, abilityTargets, abilityUsable, boatTargets, creaturePaths, currentPlayer, explorerTargets, movableOfColor,
  type Action, type GameState } from '../shared/game';

const [url, stopAt, ...tokens] = process.argv.slice(2);
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

(async () => {
  const seats = await Promise.all(tokens.map(async token => {
    const s = io(url, { transports: ['websocket'], forceNew: true });
    const seat = { s, id: '', g: null as GameState | null };
    s.on('room:state', v => (seat.g = v.game));
    await new Promise<void>(r => s.on('connect', () => r()));
    const h: any = await s.emitWithAck('hello', { token });
    seat.id = h.profile.id;
    return seat;
  }));
  await wait(500);
  if (stopAt === 'new') {
    // set up a fresh Monster Pack game for these seats (first token hosts), then exit
    for (const x of seats) x.s.emit('room:leave');
    await wait(300);
    const { code } = await seats[0].s.emitWithAck('room:create', { settings: { maxPlayers: seats.length, mode: 'monster', quickSetup: true,
      creatures: { serpent: true, shark: true, kaiju: true, kraken: true, ptero: true, whale: true }, piranhas: true, eggs: true } });
    for (const x of seats.slice(1)) { await x.s.emitWithAck('room:join', { code }); x.s.emit('lobby:ready', { ready: true }); }
    await wait(300);
    seats[0].s.emit('lobby:start');
    await wait(500);
    console.log(`started room ${code}: phase=${seats[0].g?.phase}`);
    seats.forEach(x => x.s.close());
    process.exit(0);
  }
  for (let i = 0; i < 2000; i++) {
    const g = seats[0].g;
    if (!g || g.phase === 'ended' || g.volcanoes.length >= Number(stopAt)) break;
    const seat = seats.find(x => x.id === currentPlayer(g));
    if (!seat) { await wait(300); continue; }
    const v = seat.g!;
    const me = seat.id;
    let a: Action = { type: 'auto' };
    if (v.phase === 'action') {
      const opts: Action[] = [];
      for (const e of v.explorers.filter(e => e.owner === me)) for (const to of explorerTargets(v, me, e.id)) opts.push({ type: 'moveExplorer', id: e.id, to });
      for (const b of v.boats) for (const to of boatTargets(v, me, b.id)) opts.push({ type: 'moveBoat', id: b.id, to });
      for (const t of v.hands[me]) {
        if (!t.kind || !abilityUsable(v, me, t.kind) || Math.random() < 0.6) continue;
        if (t.kind === 'die') { opts.push({ type: 'useAbility', tile: t.id }); continue; }
        const target = t.kind === 'piranha' ? undefined : pick(abilityPieces(v, me, t.kind));
        const to = pick(abilityTargets(v, me, t.kind, target));
        if (to) opts.push({ type: 'useAbility', tile: t.id, target, to });
      }
      a = opts.length && Math.random() < 0.85 ? pick(opts) : { type: 'endActions' };
    } else if (v.phase === 'creature') {
      const c = pick(movableOfColor(v, v.die!));
      if (c) a = { type: 'moveCreature', id: c.id, to: pick(Object.keys(creaturePaths(v, c.id))) };
    } else if (v.phase === 'choose') a = { type: 'choose', option: pick(v.pending!.options) };
    const r: any = await seat.s.emitWithAck('game:action', { action: a, actionId: `dev-${i}-${Date.now()}` });
    if (r?.rateLimited) await wait(400);
    await wait(120);
  }
  const g = seats[0].g!;
  console.log(`stopped: phase=${g.phase} volcanoes=${g.volcanoes.length} piranhas=${g.piranhas.length} eggs=${g.eggs.length} creatures=${g.creatures.map(c => c.kind).join(',')}`);
  seats.forEach(x => x.s.close());
  process.exit(0);
})();
