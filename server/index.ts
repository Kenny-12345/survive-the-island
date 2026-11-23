import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Server, Socket } from 'socket.io';
import { apply, autoAct, createGame, defaultSettings, redact, redactEvent, normalizeSettings, ALL_KINDS, RuleError, scores, currentPlayer,
  type Action, type GameEvent, type GameSettings, type GameState } from '../shared/game';
import { PLAYER_COLORS, type ChatMsg, type PublicRoom, type RoomPlayer, type RoomView } from '../shared/protocol';
import { CHARACTER_IDS } from '../shared/characters';
import { blankProfile, computeBadges, db, dbKind, type Profile } from './db';

const PORT = Number(process.env.PORT || 3001);
const app = express();
const server = http.createServer(app);
const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const io = new Server(server, { cors: origins.length ? { origin: origins } : undefined, maxHttpBufferSize: 1e5 });
// The read-only HTTP API (leaderboard) is fetched cross-origin when the frontend is hosted separately.
app.use('/api', (req, res, next) => {
  const o = req.headers.origin;
  if (o && origins.includes(o)) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
  next();
});
app.get('/healthz', (_q, res) => res.send('ok'));

/* ---------------- helpers ---------------- */
const rng = () => crypto.randomInt(0, 2 ** 31) / 2 ** 31; // server-side, crypto-quality dice
const pidOf = (token: string) => crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
const clean = (s: unknown, max: number) =>
  String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface Room {
  code: string;
  hostId: string;
  settings: GameSettings;
  players: RoomPlayer[];
  chat: ChatMsg[];
  game: GameState | null;
  seen: Map<string, string[]>; // recent action ids per player (duplicate protection)
  timer: NodeJS.Timeout | null;
  emptySince: number | null;
  recorded: boolean;
  chatId: number;
}
const rooms = new Map<string, Room>();
interface Session { pid: string; profile: Profile; room: string | null; sockets: Set<string> }
const sessions = new Map<string, Session>();

function newCode() {
  let c = '';
  do c = Array.from({ length: 5 }, () => CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)]).join('');
  while (rooms.has(c));
  return c;
}
function sanitizeSettings(raw: any, prev = defaultSettings()): GameSettings {
  const s: GameSettings = { ...prev, house: { ...prev.house }, creatures: { ...prev.creatures } };
  if (raw && typeof raw === 'object') {
    if (Number.isInteger(raw.maxPlayers)) s.maxPlayers = Math.min(5, Math.max(2, raw.maxPlayers));
    if (['classic', 'monster', 'custom'].includes(raw.mode)) s.mode = raw.mode;
    if (typeof raw.isPublic === 'boolean') s.isPublic = raw.isPublic;
    if ([0, 30, 60, 90, 120].includes(raw.turnTimer)) s.turnTimer = raw.turnTimer;
    if (typeof raw.quickSetup === 'boolean') s.quickSetup = raw.quickSetup;
    if (typeof raw.piranhas === 'boolean') s.piranhas = raw.piranhas;
    if (typeof raw.eggs === 'boolean') s.eggs = raw.eggs;
    if (raw.creatures && typeof raw.creatures === 'object') for (const k of ALL_KINDS)
      if (typeof raw.creatures[k] === 'boolean') s.creatures[k] = raw.creatures[k];
    if (raw.house) for (const k of ['fastSwimmers', 'extraBoats', 'suddenVolcano'] as const)
      if (typeof raw.house[k] === 'boolean') s.house[k] = raw.house[k];
  }
  return normalizeSettings(s);
}

function view(room: Room, pid: string): RoomView {
  return { code: room.code, hostId: room.hostId, settings: room.settings, players: room.players,
    game: room.game ? redact(room.game, pid) : null, you: pid };
}
function broadcastRoom(room: Room) {
  for (const p of room.players) {
    const sess = sessions.get(p.id);
    sess?.sockets.forEach(sid => io.to(sid).emit('room:state', view(room, p.id)));
  }
}
function sysChat(room: Room, text: string) {
  const m: ChatMsg = { id: ++room.chatId, from: 'system', name: 'Island', color: '#94a3b8', text, at: Date.now(), system: true };
  room.chat.push(m); room.chat = room.chat.slice(-100);
  io.to(room.code).emit('chat', m);
}
function publicRooms(): PublicRoom[] {
  return [...rooms.values()].filter(r => r.settings.isPublic && r.players.length > 0)
    .map(r => ({ code: r.code, host: r.players.find(p => p.isHost)?.name ?? '?', players: r.players.length,
      max: r.settings.maxPlayers, mode: r.settings.mode, monsterPack: r.settings.monsterPack, inGame: !!r.game && r.game.phase !== 'ended' }));
}

/* ---------------- turn timer / disconnected players ---------------- */
function schedule(room: Room) {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
  const g = room.game;
  if (!g || g.phase === 'ended') { if (g) g.turnDeadline = null; return; }
  const cur = room.players.find(p => p.id === currentPlayer(g));
  const absent = !cur || !cur.connected;
  const secs = absent ? 8 : g.settings.turnTimer;
  if (!secs) { g.turnDeadline = null; return; }
  g.turnDeadline = Date.now() + secs * 1000;
  room.timer = setTimeout(() => {
    if (!room.game || room.game.phase === 'ended') return;
    const ev: GameEvent[] = [];
    autoAct(room.game, currentPlayer(room.game), rng, ev);
    room.game.seq++;
    afterGameChange(room, ev);
  }, secs * 1000);
}
function afterGameChange(room: Room, ev: GameEvent[]) {
  const g = room.game!;
  schedule(room);
  for (const p of room.players) {
    const sess = sessions.get(p.id);
    const evs = ev.map(e => redactEvent(e, p.id));
    sess?.sockets.forEach(sid => io.to(sid).emit('game:events', { seq: g.seq, events: evs }));
  }
  broadcastRoom(room);
  if (g.phase === 'ended' && !room.recorded) { room.recorded = true; void recordResults(room); }
}
async function recordResults(room: Room) {
  const g = room.game!;
  const sc = scores(g);
  const winners = new Set(g.winners ?? []);
  try {
    for (const s of sc) {
      const sess = sessions.get(s.id);
      const p = sess?.profile ?? (await db.get(s.id)) ?? blankProfile(s.id, g.players[s.id].name);
      p.games++; winners.has(s.id) ? p.wins++ : p.losses++;
      p.rescued += s.rescued; p.lost += s.lost; p.bestScore = Math.max(p.bestScore, s.score);
      const ch = g.players[s.id].character; p.charCounts[ch] = (p.charCounts[ch] || 0) + 1;
      p.badges = computeBadges(p); p.updatedAt = Date.now();
      await db.save(p);
      if (sess) { sess.profile = p; sess.sockets.forEach(sid => io.to(sid).emit('profile', p)); }
    }
    await db.recordGame({ roomCode: room.code, mode: g.settings.mode, turns: g.turn, durationMs: (g.endedAt ?? Date.now()) - g.startedAt,
      results: sc.map(s => ({ id: s.id, name: g.players[s.id].name, character: g.players[s.id].character, score: s.score, rescued: s.rescued, lost: s.lost, winner: winners.has(s.id) })) });
  } catch (e) { console.error('record results failed', e); }
}

/* ---------------- room membership ---------------- */
function leaveRoom(sess: Session, voluntary: boolean) {
  const room = sess.room ? rooms.get(sess.room) : null;
  sess.room = null;
  sess.sockets.forEach(sid => io.sockets.sockets.get(sid)?.leave(room?.code ?? ''));
  if (!room) return;
  const p = room.players.find(x => x.id === sess.pid);
  if (!p) return;
  if (room.game && room.game.phase !== 'ended' && room.game.order.includes(p.id)) {
    p.connected = false; // keep seat: their turns auto-play until they come back
    sysChat(room, `${p.name} left the island (their turns will be auto-played).`);
  } else {
    room.players = room.players.filter(x => x !== p);
    sysChat(room, `${p.name} left the room.`);
  }
  if (p.isHost) {
    const next = room.players.find(x => x.connected && x.id !== p.id);
    if (next) transferHost(room, next.id);
  }
  if (!room.players.some(x => x.connected)) room.emptySince = Date.now();
  schedule(room);
  broadcastRoom(room);
  void voluntary;
}
function transferHost(room: Room, to: string) {
  room.players.forEach(p => (p.isHost = p.id === to));
  room.hostId = to;
  const p = room.players.find(x => x.id === to);
  if (p) { p.ready = true; sysChat(room, `${p.name} is now the host.`); }
}
function joinRoom(sock: Socket, sess: Session, room: Room): string | null {
  const existing = room.players.find(p => p.id === sess.pid);
  if (!existing) {
    if (room.game && room.game.phase !== 'ended') return 'That game is already in progress.';
    if (room.players.length >= room.settings.maxPlayers) return 'Room is full.';
    if (sess.room && sess.room !== room.code) leaveRoom(sess, true);
    const used = new Set(room.players.map(p => p.color));
    room.players.push({ id: sess.pid, name: sess.profile.name, color: PLAYER_COLORS.find(c => !used.has(c))!,
      character: sess.profile.avatar, ready: false, connected: true, isHost: room.players.length === 0 });
    if (room.players.length === 1) room.hostId = sess.pid;
    sysChat(room, `${sess.profile.name} joined.`);
  } else {
    existing.connected = true;
    sysChat(room, `${existing.name} reconnected.`);
  }
  sess.room = room.code;
  room.emptySince = null;
  sess.sockets.forEach(sid => io.sockets.sockets.get(sid)?.join(room.code));
  sock.emit('chat:history', room.chat);
  schedule(room);
  broadcastRoom(room);
  return null;
}

/* ---------------- sockets ---------------- */
io.on('connection', sock => {
  let sess: Session | null = null;
  let bucket = 25, last = Date.now();
  const limited = () => {
    const now = Date.now();
    bucket = Math.min(25, bucket + ((now - last) / 1000) * 8);
    last = now;
    if (bucket < 1) return true;
    bucket--;
    return false;
  };
  const err = (m: string) => sock.emit('toast', { kind: 'error', text: m });
  const room = () => (sess?.room ? rooms.get(sess.room) ?? null : null);
  const me = (r: Room) => r.players.find(p => p.id === sess!.pid);
  const on = (ev: string, fn: (data: any, ack?: (x: any) => void) => unknown) =>
    sock.on(ev, async (data: any, ack?: any) => {
      if (limited()) { if (typeof ack === 'function') ack({ error: 'Slow down a little!', rateLimited: true }); return err('Slow down a little!'); }
      if (ev !== 'hello' && !sess) return err('Not identified.');
      try { await fn(data, typeof ack === 'function' ? ack : undefined); }
      catch (e) { console.error(ev, e); err('Something went wrong.'); }
    });

  on('hello', async (d, ack) => {
    const token = clean(d?.token, 64);
    if (token.length < 16) return err('Bad token');
    const pid = pidOf(token);
    let s = sessions.get(pid);
    if (!s) {
      const profile = (await db.get(pid)) ?? blankProfile(pid, clean(d?.name, 16) || `Explorer${crypto.randomInt(100, 999)}`);
      s = { pid, profile, room: null, sockets: new Set() };
      sessions.set(pid, s);
    }
    s.sockets.add(sock.id);
    sess = s;
    // Reconnection: restore the room this player was in (before the ack, so the client never flashes the menu).
    const r = s.room ? rooms.get(s.room) : null;
    if (r) joinRoom(sock, s, r);
    ack?.({ profile: s.profile, db: dbKind });
  });

  on('profile:update', async d => {
    const p = sess!.profile;
    const name = clean(d?.name, 16);
    if (name.length >= 2) p.name = name;
    if (CHARACTER_IDS.includes(d?.avatar)) p.avatar = d.avatar;
    p.updatedAt = Date.now();
    await db.save(p);
    sess!.sockets.forEach(sid => io.to(sid).emit('profile', p));
    const r = room();
    if (r && !r.game) { const rp = me(r); if (rp) { rp.name = p.name; broadcastRoom(r); } }
  });

  on('room:create', (d, ack) => {
    const code = newCode();
    const r: Room = { code, hostId: sess!.pid, settings: sanitizeSettings(d?.settings), players: [], chat: [], game: null,
      seen: new Map(), timer: null, emptySince: null, recorded: false, chatId: 0 };
    rooms.set(code, r);
    joinRoom(sock, sess!, r);
    ack?.({ code });
  });
  on('room:join', (d, ack) => {
    const r = rooms.get(clean(d?.code, 8).toUpperCase());
    if (!r) return ack?.({ error: 'Room not found.' });
    const e = joinRoom(sock, sess!, r);
    ack?.(e ? { error: e } : { code: r.code });
  });
  on('room:quick', (_d, ack) => {
    const open = [...rooms.values()].find(r => r.settings.isPublic && !r.game && r.players.length < r.settings.maxPlayers && r.players.some(p => p.connected));
    if (open) { joinRoom(sock, sess!, open); return ack?.({ code: open.code }); }
    const code = newCode();
    const r: Room = { code, hostId: sess!.pid, settings: sanitizeSettings({ isPublic: true }), players: [], chat: [], game: null,
      seen: new Map(), timer: null, emptySince: null, recorded: false, chatId: 0 };
    rooms.set(code, r);
    joinRoom(sock, sess!, r);
    ack?.({ code });
  });
  on('room:list', (_d, ack) => ack?.(publicRooms()));
  on('room:leave', () => { leaveRoom(sess!, true); sock.emit('room:left'); });

  on('lobby:update', d => {
    const r = room(); if (!r || r.game) return;
    const p = me(r)!;
    if (CHARACTER_IDS.includes(d?.character)) p.character = d.character;
    if (PLAYER_COLORS.includes(d?.color) && !r.players.some(x => x !== p && x.color === d.color)) p.color = d.color;
    broadcastRoom(r);
  });
  on('lobby:ready', d => {
    const r = room(); if (!r || r.game) return;
    me(r)!.ready = !!d?.ready;
    broadcastRoom(r);
  });
  on('lobby:settings', d => {
    const r = room(); if (!r || r.game) return;
    if (r.hostId !== sess!.pid) return err('Only the host can change settings.');
    const s = sanitizeSettings(d, r.settings);
    if (s.maxPlayers < r.players.length) s.maxPlayers = r.players.length;
    r.settings = s;
    broadcastRoom(r);
  });
  on('lobby:kick', d => {
    const r = room(); if (!r || r.game) return;
    if (r.hostId !== sess!.pid) return err('Only the host can kick.');
    const target = r.players.find(p => p.id === d?.id && p.id !== sess!.pid);
    if (!target) return;
    r.players = r.players.filter(p => p !== target);
    const ts = sessions.get(target.id);
    if (ts) { ts.room = null; ts.sockets.forEach(sid => { io.sockets.sockets.get(sid)?.leave(r.code); io.to(sid).emit('kicked'); }); }
    sysChat(r, `${target.name} was removed by the host.`);
    broadcastRoom(r);
  });
  on('lobby:transfer', d => {
    const r = room(); if (!r) return;
    if (r.hostId !== sess!.pid) return err('Only the host can transfer host.');
    if (!r.players.some(p => p.id === d?.id && p.connected)) return;
    transferHost(r, d.id);
    broadcastRoom(r);
  });
  on('lobby:start', () => {
    const r = room(); if (!r) return;
    if (r.hostId !== sess!.pid) return err('Only the host can start.');
    if (r.game && r.game.phase !== 'ended') return err('Game already running.');
    if (r.players.length < 2) return err('At least 2 players are needed.');
    if (r.players.some(p => !p.isHost && !p.ready)) return err('Everyone must be ready.');
    if (r.players.some(p => !p.connected)) return err('A player is disconnected.');
    r.game = createGame(r.players.map(p => ({ id: p.id, name: p.name, color: p.color, character: p.character })), r.settings, rng);
    r.recorded = false;
    r.seen.clear();
    sysChat(r, 'The expedition begins! Place your adventurers.');
    afterGameChange(r, [{ t: 'turn', player: currentPlayer(r.game), turn: 1 }]);
  });
  on('room:rematch', () => {
    const r = room(); if (!r || !r.game || r.game.phase !== 'ended') return;
    if (r.hostId !== sess!.pid) return err('Only the host can reset the room.');
    r.game = null;
    r.players = r.players.filter(p => p.connected);
    r.players.forEach(p => (p.ready = p.isHost));
    sysChat(r, 'Back in the lobby — ready up for another round!');
    broadcastRoom(r);
  });

  on('game:action', (d, ack) => {
    const r = room();
    if (!r?.game) return ack?.({ error: 'No game running.' });
    const actionId = clean(d?.actionId, 40);
    const seen = r.seen.get(sess!.pid) ?? [];
    if (actionId && seen.includes(actionId)) return ack?.({ ok: true, duplicate: true });
    try {
      const a = d?.action as Action;
      if (!a || typeof a.type !== 'string') throw new RuleError('Bad action.');
      const ev = apply(r.game, sess!.pid, a, rng);
      if (actionId) { seen.push(actionId); r.seen.set(sess!.pid, seen.slice(-50)); }
      afterGameChange(r, ev);
      ack?.({ ok: true });
    } catch (e) {
      if (e instanceof RuleError) return ack?.({ error: e.message });
      throw e;
    }
  });

  on('chat', d => {
    const r = room(); if (!r) return;
    const p = me(r); if (!p) return;
    const text = clean(d?.text, 200);
    if (!text) return;
    const m: ChatMsg = { id: ++r.chatId, from: p.id, name: p.name, color: p.color, text, at: Date.now(), reaction: !!d?.reaction && text.length <= 8 };
    if (!m.reaction) { r.chat.push(m); r.chat = r.chat.slice(-100); }
    io.to(r.code).emit('chat', m);
  });
  on('report', d => {
    const r = room();
    console.warn(`[REPORT] room=${r?.code} by=${sess!.pid} target=${clean(d?.id, 20)} reason=${clean(d?.reason, 200)}`);
    sock.emit('toast', { kind: 'info', text: 'Thanks — the report was logged for moderators.' });
  });

  sock.on('disconnect', () => {
    if (!sess) return;
    sess.sockets.delete(sock.id);
    if (sess.sockets.size) return;
    const r = room();
    if (!r) return;
    const p = me(r);
    if (p) { p.connected = false; sysChat(r, `${p.name} disconnected.`); }
    if (!r.players.some(x => x.connected)) r.emptySince = Date.now();
    schedule(r);
    broadcastRoom(r);
  });
});

/* ---------------- room cleanup ---------------- */
setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) {
    if (r.emptySince && now - r.emptySince > 5 * 60_000) {
      if (r.timer) clearTimeout(r.timer);
      rooms.delete(r.code);
      r.players.forEach(p => { const s = sessions.get(p.id); if (s?.room === r.code) s.room = null; });
    }
  }
}, 30_000);

/* ---------------- http ---------------- */
app.get('/api/health', (_q, res) => res.json({ ok: true, rooms: rooms.size, db: dbKind }));
app.get('/api/leaderboard', async (_q, res) => {
  try { res.json(await db.leaderboard(20)); } catch { res.status(500).json([]); }
});
const dist = path.resolve('client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h' }));
  app.get('*', (_q, res) => res.sendFile(path.join(dist, 'index.html')));
}
server.listen(PORT, () => console.log(`Survive The Island server on :${PORT} (db: ${dbKind})`));
