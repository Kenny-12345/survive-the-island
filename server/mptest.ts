// Multiplayer integration test: N independent Socket.IO clients against a running server.
// Usage: npx tsx server/mptest.ts [url]   (server must be running)
import { io, type Socket } from 'socket.io-client';
import crypto from 'node:crypto';
import { explorerTargets, currentPlayer, type GameState } from '../shared/game';
import type { RoomView } from '../shared/protocol';

const URL = process.argv[2] || 'http://localhost:3001';
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

interface C { s: Socket; token: string; view: RoomView | null; id: string; events: any[] }
async function client(token = crypto.randomBytes(16).toString('hex')): Promise<C> {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c: C = { s, token, view: null, id: '', events: [] };
  s.on('room:state', v => (c.view = v));
  s.on('game:events', b => c.events.push(...b.events));
  await new Promise<void>(res => s.on('connect', () => res()));
  const r: any = await s.emitWithAck('hello', { token, name: `T${token.slice(0, 4)}` });
  c.id = r.profile.id;
  return c;
}
const ack = (c: C, ev: string, d?: any): Promise<any> => c.s.emitWithAck(ev, d);

async function playersTest(n: number) {
  const cs = await Promise.all(Array.from({ length: n }, () => client()));
  const { code } = await ack(cs[0], 'room:create', { settings: { maxPlayers: 5, quickSetup: true, mode: n === 5 ? 'monster' : 'classic' } });
  for (const c of cs.slice(1)) await ack(c, 'room:join', { code });
  await wait(200);
  ok(cs.every(c => c.view?.players.length === n), `${n} players see each other in room ${code}`);
  cs[0].s.emit('lobby:start'); await wait(200);
  ok(!cs[0].view?.game, `${n}p: start blocked while players not ready`);
  cs.slice(1).forEach(c => c.s.emit('lobby:ready', { ready: true })); await wait(200);
  cs[1].s.emit('lobby:start'); await wait(200);
  ok(!cs[1].view?.game, `${n}p: non-host cannot start`);
  cs[0].s.emit('lobby:start'); await wait(300);
  ok(cs.every(c => c.view?.game?.phase === 'action'), `${n}p: game started for everyone (quick setup)`);
  return cs;
}

(async () => {
  for (const n of [2, 3]) (await playersTest(n)).forEach(c => c.s.close());
  const cs = await playersTest(5);
  const g = () => cs[0].view!.game as GameState;
  // hidden information
  const other = cs[1].view!.game!.explorers.filter(e => e.owner !== cs[1].id);
  ok(other.every(e => e.value === null), 'opponents explorer values are hidden');
  ok(Object.values(cs[1].view!.game!.tiles).every(t => t.effect === null), 'unsunk tile effects are hidden');
  ok(Object.entries(cs[1].view!.game!.hands).every(([p, h]) => p === cs[1].id || h.every(t => t.kind === null)), 'opponents ability tiles are hidden');
  // wrong-turn action
  const cur = currentPlayer(g());
  const notCur = cs.find(c => c.id !== cur)!;
  const r1 = await ack(notCur, 'game:action', { action: { type: 'endActions' }, actionId: 'x1' });
  ok(!!r1.error, `wrong-turn action rejected: "${r1.error}"`);
  const curC = cs.find(c => c.id === cur)!;
  const r2 = await ack(curC, 'game:action', { action: { type: 'sink', hex: '0,0' }, actionId: 'x2' });
  ok(!!r2.error, `out-of-phase sink rejected: "${r2.error}"`);
  const r3 = await ack(curC, 'game:action', { action: { type: 'moveExplorer', id: 'nope', to: '9,9' }, actionId: 'x3' });
  ok(!!r3.error, 'invalid move rejected');
  // legal move + duplicate protection
  const gv = curC.view!.game!;
  const e = gv.explorers.find(x => x.owner === cur && explorerTargets(gv, cur, x.id).length)!;
  const to = explorerTargets(gv, cur, e.id)[0];
  const seqBefore = gv.seq;
  await ack(curC, 'game:action', { action: { type: 'moveExplorer', id: e.id, to }, actionId: 'dup-1' });
  const rd = await ack(curC, 'game:action', { action: { type: 'moveExplorer', id: e.id, to }, actionId: 'dup-1' });
  await wait(150);
  ok(rd.duplicate === true && curC.view!.game!.seq === seqBefore + 1, 'duplicate action id ignored');
  ok(cs.every(c => c.view!.game!.seq === seqBefore + 1), 'all 5 clients synchronized on same seq');
  // disconnect + reconnect with the same token
  const victim = cs[3];
  victim.s.close(); await wait(250);
  ok(cs[0].view!.players.find(p => p.id === victim.id)?.connected === false, 'disconnect shown to others');
  const back = await client(victim.token); await wait(300);
  ok(back.view?.game?.seq === cs[0].view!.game!.seq, 'reconnected player receives current game state');
  ok(cs[0].view!.players.find(p => p.id === victim.id)?.connected === true, 'reconnect shown to others');
  cs[3] = back;
  // play to the end with auto actions + sinks
  let guard = 0;
  while (g().phase !== 'ended' && guard++ < 3000) {
    const p = cs.find(c => c.id === currentPlayer(g()))!;
    const a = g().phase === 'action' ? { type: 'endActions' } : { type: 'auto' };
    const rr = await ack(p, 'game:action', { action: a, actionId: crypto.randomUUID() });
    if (rr?.rateLimited) await wait(300);
  }
  await wait(300);
  ok(g().phase === 'ended' && Array.isArray(g().winners), `game reached the end (${g().endReason})`);
  // secret ability tiles: the taker sees the tile, everyone else sees 'secret'
  const sinks = cs.map(c => c.events.filter(e => e.t === 'sink'));
  let leaks = 0, secrets = 0, own = 0;
  cs.forEach((c, i) => sinks[i].forEach(e => {
    const ability = ['paddles', 'dolphin', 'dive', 'die', 'repellent'].includes(e.effect);
    if (ability && e.player !== c.id) leaks++;
    if (e.effect === 'secret') secrets++;
    if (ability && e.player === c.id) own++;
  }));
  ok(leaks === 0 && secrets > 0 && own > 0, `ability tiles revealed only to their taker (${own} own, ${secrets} hidden, ${leaks} leaks)`);
  ok(cs.every(c => c.view!.game!.explorers.every(e => e.value !== null)), 'values revealed to all at end');
  const lb = await (await fetch(`${URL}/api/leaderboard`)).json();
  ok(Array.isArray(lb) && lb.length > 0, `leaderboard persisted (${lb.length} profiles)`);
  cs[0].s.emit('room:rematch'); await wait(200);
  ok(cs.every(c => c.view!.game === null), 'host Play Again returns all to lobby');
  cs.forEach(c => c.s.close());
  console.log(fails ? `\n${fails} FAILED` : '\nAll multiplayer tests passed.');
  process.exit(fails ? 1 : 0);
})();
