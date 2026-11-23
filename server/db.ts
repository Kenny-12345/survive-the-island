// Persistent profile storage: PostgreSQL/Supabase when DATABASE_URL is set, otherwise a JSON file.
import fs from 'node:fs';
import path from 'node:path';

export interface Profile {
  id: string; // public id (hash of the secret token)
  name: string;
  avatar: string;
  games: number;
  wins: number;
  losses: number;
  rescued: number;
  lost: number;
  bestScore: number;
  charCounts: Record<string, number>;
  badges: string[];
  updatedAt: number;
}
export interface GameRecord {
  roomCode: string;
  mode: string;
  turns: number;
  durationMs: number;
  results: { id: string; name: string; character: string; score: number; rescued: number; lost: number; winner: boolean }[];
}

export const blankProfile = (id: string, name = 'Explorer', avatar = 'gojirex'): Profile => ({
  id, name, avatar, games: 0, wins: 0, losses: 0, rescued: 0, lost: 0, bestScore: 0, charCounts: {}, badges: [], updatedAt: Date.now(),
});

export function computeBadges(p: Profile) {
  const b: string[] = [];
  if (p.games >= 1) b.push('First Voyage');
  if (p.wins >= 1) b.push('Survivor');
  if (p.wins >= 5) b.push('Island Legend');
  if (p.rescued >= 10) b.push('Lifeguard');
  if (p.rescued >= 50) b.push('Harbour Master');
  if (p.games >= 10) b.push('Veteran');
  if (p.bestScore >= 20) b.push('Treasure Fleet');
  return b;
}

interface Store {
  get(id: string): Promise<Profile | null>;
  save(p: Profile): Promise<void>;
  leaderboard(limit: number): Promise<Profile[]>;
  recordGame(g: GameRecord): Promise<void>;
}

class JsonStore implements Store {
  file = path.resolve('data/db.json');
  data: { profiles: Record<string, Profile>; games: GameRecord[] } = { profiles: {}, games: [] };
  timer: NodeJS.Timeout | null = null;
  constructor() {
    try { this.data = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { /* fresh */ }
  }
  flush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data));
    }, 300);
  }
  async get(id: string) { return this.data.profiles[id] ?? null; }
  async save(p: Profile) { this.data.profiles[p.id] = p; this.flush(); }
  async leaderboard(limit: number) {
    return Object.values(this.data.profiles).filter(p => p.games > 0)
      .sort((a, b) => b.wins - a.wins || b.rescued - a.rescued).slice(0, limit);
  }
  async recordGame(g: GameRecord) { this.data.games.push(g); this.data.games = this.data.games.slice(-500); this.flush(); }
}

class PgStore implements Store {
  pool: any;
  ready: Promise<void>;
  constructor(url: string) {
    this.ready = (async () => {
      const pg = (await import('pg')).default;
      this.pool = new pg.Pool({ connectionString: url, ssl: url.includes('localhost') ? false : { rejectUnauthorized: false } });
      const sql = fs.readFileSync(path.resolve('server/schema.sql'), 'utf8');
      await this.pool.query(sql);
    })();
  }
  row(r: any): Profile {
    return { id: r.id, name: r.name, avatar: r.avatar, games: r.games, wins: r.wins, losses: r.losses, rescued: r.rescued,
      lost: r.lost, bestScore: r.best_score, charCounts: r.char_counts, badges: r.badges, updatedAt: Number(r.updated_at) };
  }
  async get(id: string) {
    await this.ready;
    const r = await this.pool.query('select * from profiles where id=$1', [id]);
    return r.rows[0] ? this.row(r.rows[0]) : null;
  }
  async save(p: Profile) {
    await this.ready;
    await this.pool.query(
      `insert into profiles (id,name,avatar,games,wins,losses,rescued,lost,best_score,char_counts,badges,updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (id) do update set name=$2,avatar=$3,games=$4,wins=$5,losses=$6,rescued=$7,lost=$8,best_score=$9,char_counts=$10,badges=$11,updated_at=$12`,
      [p.id, p.name, p.avatar, p.games, p.wins, p.losses, p.rescued, p.lost, p.bestScore, p.charCounts, p.badges, p.updatedAt]);
  }
  async leaderboard(limit: number) {
    await this.ready;
    const r = await this.pool.query('select * from profiles where games>0 order by wins desc, rescued desc limit $1', [limit]);
    return r.rows.map((x: any) => this.row(x));
  }
  async recordGame(g: GameRecord) {
    await this.ready;
    await this.pool.query('insert into games (room_code, mode, turns, duration_ms, results) values ($1,$2,$3,$4,$5)',
      [g.roomCode, g.mode, g.turns, g.durationMs, JSON.stringify(g.results)]);
  }
}

export const db: Store = process.env.DATABASE_URL ? new PgStore(process.env.DATABASE_URL) : new JsonStore();
export const dbKind = process.env.DATABASE_URL ? 'postgres' : 'json-file';
