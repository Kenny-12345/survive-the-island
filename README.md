# Survive The Island — Ultimate Monster Survival

A browser-based multiplayer board game for 2–5 players, in real time. You lead adventurers off a sinking hex island while sea serpents, sharks and Kaijus hunt them, plus krakens, pterodactyls, whales, piranhas and eggs in the optional Monster Pack. All art and audio are original: the visuals are SVG, CSS and Framer Motion, and the sound is synthesised with the Web Audio API.

The rules follow the official Survive The Island and Monster Pack rulebooks. **[RULES.md](RULES.md)** lists every rule, plus the few assumptions and online adaptations.

## Stack
- **Client:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, socket.io-client (`client/`)
- **Server:** Node.js, Express, Socket.IO (`server/index.ts`). The server is authoritative: it runs the rules engine, rolls the dice and validates every action.
- **Rules engine:** `shared/game.ts`. The server runs it to apply actions; the client uses it only to highlight legal moves.
- **Database:** PostgreSQL or Supabase when `DATABASE_URL` is set (schema in `server/schema.sql`, applied automatically). Without it, data goes to `data/db.json`.

## Run locally
```bash
npm install
```
```bash
npm run dev
```
Then open http://localhost:5173. The dev command runs the API on :3001 and Vite on :5173, with a proxy between them. To try multiplayer on one machine, open several tabs: each tab is a separate player. Phones on the same Wi-Fi can join at `http://<your-LAN-IP>:5173`.

Production-style run (a single port, with the server also serving the built client):
```bash
npm run build
```
```bash
npm start
```
Then open http://localhost:3001.

## Tests
```bash
npm test
```
This plays 400 random full games through the engine, covering every Monster Pack combination, every ability tile and every choice. It checks the rules, the invariants and hidden information.
```bash
npx tsx server/mptest.ts http://localhost:3001
```
This needs a running server. It connects 2, 3 and 5 independent Socket.IO clients and checks:
- lobby rules
- hidden information (values, unrevealed tiles, other players' ability tiles; ability tiles you take are revealed only to you)
- wrong-turn and invalid actions
- duplicate actions
- sync across clients
- disconnect and reconnect
- a full game to the end
- the leaderboard
- Play Again

## Environment variables
See `.env.example`.
| Var | Where | Purpose |
|---|---|---|
| `PORT` | server | HTTP/WebSocket port (default 3001) |
| `DATABASE_URL` | server | Postgres/Supabase connection string (optional) |
| `CORS_ORIGINS` | server | Comma-separated frontend origins, for when the client is hosted separately |
| `VITE_SERVER_URL` | client build | Backend URL, for when the client is hosted separately (e.g. Vercel) |

Secrets stay on the server. The client only ever receives a public profile id: the server stores a SHA-256 hash of each browser's secret token.

## Deploy
**Option A — one service (simplest).** Deploy to Render, Railway or Fly.io:
- build command: `npm install && npm run build`
- start command: `npm start`
- set `DATABASE_URL` to your Supabase/Postgres URL

**Option B — split.**
1. Deploy the backend as in Option A, with `CORS_ORIGINS=https://your-frontend.vercel.app`.
2. Deploy the frontend to Vercel:
   - build command: `npm run build`
   - output directory: `client/dist`
   - environment variable: `VITE_SERVER_URL=https://your-backend.onrender.com`

WebSockets need a host with persistent processes, so don't use serverless functions for the backend. Rooms are kept in memory: a server restart ends running games, but profiles persist in the database.

## Features
- **Menu:** animated ocean with clouds, birds, swaying palms and monster silhouettes; Play (quick match), Create, Join, Public Rooms, How to Play, Collection, Settings, Profile.
- **Rooms:** 5-letter codes, invite links (`?room=CODE`), a public room browser, ready checks, kick, transfer host, host-only settings and start, and chat with quick reactions, mute and report.
- **Game:** adventurer and raft placement, 3 moves per turn (on foot or swimming), Rising Waters with effect tiles (creatures, rafts, whirlpools, 4 volcanoes), secret ability tiles (Paddles, Dolphin, Dive, Creature Die, Repellent), the coloured creature die with mandatory moves, rescues, scoring and an end screen with stats and Play Again.
- **Monster Pack:** pick any mix of the 6 creatures (at least one per colour), with optional Piranha and Egg tiles. The game asks the active player to choose which creature appears, where the egg goes and the Kraken's victim.
- **Animation:**
  - pieces move with tweens; boats bob, swimmers ripple, creatures patrol and follow multi-hex paths
  - sinking tiles flash, shake, crack, fall and splash
  - the dice tumble; event banners, confetti and screen shake for big moments
  - the camera can pan and pinch, follows events in cinematic mode, and there is a reduced-motion setting
- **Audio:** music, ambient ocean, wind and birds, plus 14 sound effects. Each group has its own volume, there's a mute switch, and nothing plays until the player first interacts with the page.
- **Fairness:**
  - server-side crypto dice, validation of turn, phase and move, and per-player hidden values
  - duplicate-action protection, rate limiting and input sanitising
  - reconnection restores your seat; disconnected players' turns are auto-played after 8 seconds
  - an optional turn timer

## Art direction
All art is original SVG drawn in code (no image files):
- `client/src/components/KeyArt.tsx`: sunset key art behind the loading screen and menus.
- `client/src/components/Loading.tsx`: loading screen. Progress tracks real steps (fonts, server connection, profile restore).
- `client/src/components/Board.tsx`: the board is a framed diorama on a wooden table.
  - Tiles are stacked like the cardboard originals: beach thin, forest thicker, mountain thickest.
  - A shallow-water glow and surf foam follow the coastline and shrink as tiles sink.
- `client/src/components/Creatures.tsx`: creature figures, each with a ring in its die colour.
- `client/src/components/Icons.tsx`: ability-tile icons.
- UI theme: carved wood and parchment (`.wood`, `.parch`, `.plank` in `client/src/index.css`).

## Dev tools
```bash
npx tsx server/devplay.ts http://localhost:3001 2 <token1> <token2>
```
This drives existing seats with random legal moves until 2 volcanoes have erupted, so you can watch a game advance in the browser. Each token is the `sti-token` value from a tab's sessionStorage.

## Known gaps / next steps
- Some details aren't printed in the rulebook (the treasure split, die faces, island outline). They're listed under "Assumed" in RULES.md.
- Rooms live in memory, so a single server instance is the limit. Scaling out needs a Redis adapter and a shared state store.
- Reports are only written to the server log; there's no moderation dashboard.
