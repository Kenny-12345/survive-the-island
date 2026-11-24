// Starts the game server's codespace when a player opens the site while it's asleep.
// The GitHub token stays here on the server (Vercel env WAKE_TOKEN); the browser only learns the state.
const CS = process.env.CODESPACE_NAME || 'survive-island-jrgppjvw79gw2vjw';
let last = 0; // per-instance throttle: GitHub only needs one start request

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const headers = { Authorization: `Bearer ${process.env.WAKE_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'survive-island-wake' };
  try {
    const st = await fetch(`https://api.github.com/user/codespaces/${CS}`, { headers }).then(r => r.json());
    const state = st.state || 'Unknown';
    if (state !== 'Available' && state !== 'Starting' && Date.now() - last > 20000) {
      last = Date.now();
      await fetch(`https://api.github.com/user/codespaces/${CS}/start`, { method: 'POST', headers });
      return res.json({ state: 'Starting' });
    }
    return res.json({ state });
  } catch {
    return res.status(502).json({ state: 'Unknown' });
  }
}
