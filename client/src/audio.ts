// All audio is synthesised at runtime with the Web Audio API (original, no licensed samples needed).
// Nothing plays until the user has interacted with the page (unlock()).
import { getSettings, onSettings } from './settings';

let ctx: AudioContext | null = null;
let master: GainNode, music: GainNode, sfx: GainNode, amb: GainNode;
let started = false;
let noiseBuf: AudioBuffer;

function apply() {
  if (!ctx) return;
  const s = getSettings();
  const m = s.muted ? 0 : 1;
  master.gain.setTargetAtTime(m, ctx.currentTime, 0.05);
  music.gain.setTargetAtTime(s.music * 0.35, ctx.currentTime, 0.1);
  sfx.gain.setTargetAtTime(s.sfx * 0.8, ctx.currentTime, 0.05);
  amb.gain.setTargetAtTime(s.ambient * 0.5, ctx.currentTime, 0.1);
}
onSettings(apply);

export function unlock() {
  if (started) { ctx?.resume(); return; }
  started = true;
  ctx = new AudioContext();
  master = ctx.createGain(); master.connect(ctx.destination);
  music = ctx.createGain(); music.connect(master);
  sfx = ctx.createGain(); sfx.connect(master);
  amb = ctx.createGain(); amb.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  apply();
  startAmbience();
  startMusic();
}

function noise(dest: AudioNode, loop = false) {
  const n = ctx!.createBufferSource(); n.buffer = noiseBuf; n.loop = loop; n.connect(dest); return n;
}
function startAmbience() {
  const c = ctx!;
  // ocean: low-passed noise whose volume swells like waves
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
  const g = c.createGain(); g.gain.value = 0.25;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.12;
  const lg = c.createGain(); lg.gain.value = 0.18; lfo.connect(lg); lg.connect(g.gain);
  noise(lp, true).start(); lp.connect(g); g.connect(amb); lfo.start();
  // wind: band-passed noise, slow sweep
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
  const wg = c.createGain(); wg.gain.value = 0.05;
  const wl = c.createOscillator(); wl.frequency.value = 0.05; const wlg = c.createGain(); wlg.gain.value = 400;
  wl.connect(wlg); wlg.connect(bp.frequency); wl.start();
  noise(bp, true).start(); bp.connect(wg); wg.connect(amb);
  // birds: occasional chirps
  const chirp = () => {
    if (!ctx) return;
    const t = c.currentTime;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const o = c.createOscillator(), og = c.createGain();
      const f = 2200 + Math.random() * 1500, st = t + i * 0.13;
      o.frequency.setValueAtTime(f, st); o.frequency.exponentialRampToValueAtTime(f * 1.4, st + 0.07);
      og.gain.setValueAtTime(0, st); og.gain.linearRampToValueAtTime(0.04, st + 0.02); og.gain.linearRampToValueAtTime(0, st + 0.09);
      o.connect(og); og.connect(amb); o.start(st); o.stop(st + 0.1);
    }
    setTimeout(chirp, 5000 + Math.random() * 9000);
  };
  setTimeout(chirp, 3000);
}

function startMusic() {
  // gentle tropical marimba loop on a pentatonic scale
  const c = ctx!;
  const scale = [0, 2, 4, 7, 9, 12, 14, 16];
  const chords = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
  const base = 261.63;
  const step = 0.28;
  let bar = 0;
  let next = c.currentTime + 0.2;
  const tick = () => {
    if (!ctx) return;
    while (next < c.currentTime + 1.2) {
      const chord = chords[Math.floor(bar / 8) % chords.length];
      const i = bar % 8;
      if (i % 4 === 0) chord.forEach(n => pluck(base * 2 ** ((n - 12) / 12), next, 0.06, music, 1.4));
      if (Math.random() < 0.7) pluck(base * 2 ** (scale[(bar * 3 + Math.floor(Math.random() * 3)) % scale.length] / 12), next, 0.05, music, 0.5);
      next += step; bar++;
    }
    setTimeout(tick, 400);
  };
  tick();
}
function pluck(freq: number, t: number, vol: number, dest: AudioNode, len = 0.4, type: OscillatorType = 'sine') {
  const c = ctx!;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + len + 0.05);
}
function burst(t: number, dur: number, from: number, to: number, vol: number, type: BiquadFilterType = 'lowpass') {
  const c = ctx!;
  const f = c.createBiquadFilter(); f.type = type;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const n = noise(f); f.connect(g); g.connect(sfx); n.start(t, Math.random()); n.stop(t + dur + 0.05);
}
function tone(t: number, dur: number, from: number, to: number, vol: number, type: OscillatorType = 'sawtooth') {
  const c = ctx!;
  const o = c.createOscillator(), g = c.createGain(); o.type = type;
  o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.05);
}

export type Sfx = 'click' | 'dice' | 'crack' | 'sink' | 'splash' | 'roar' | 'shark' | 'boat' | 'rescue' | 'victory' | 'defeat' | 'whoosh' | 'alert' | 'place';
export function play(name: Sfx) {
  if (!ctx || getSettings().muted) return;
  const t = ctx.currentTime;
  switch (name) {
    case 'click': pluck(880, t, 0.08, sfx, 0.08, 'triangle'); break;
    case 'place': pluck(523, t, 0.1, sfx, 0.15, 'triangle'); pluck(784, t + 0.05, 0.08, sfx, 0.2, 'triangle'); break;
    case 'dice': for (let i = 0; i < 7; i++) burst(t + i * 0.07 + Math.random() * 0.03, 0.04, 3000, 1500, 0.3, 'bandpass'); break;
    case 'crack': for (let i = 0; i < 5; i++) burst(t + i * 0.05, 0.05, 2500, 400, 0.5, 'highpass'); tone(t, 0.3, 90, 40, 0.2, 'square'); break;
    case 'sink': tone(t, 1.2, 160, 40, 0.25, 'triangle'); burst(t + 0.3, 1.2, 1200, 120, 0.4); break;
    case 'splash': burst(t, 0.6, 4000, 300, 0.5); burst(t + 0.08, 0.4, 2000, 200, 0.3); break;
    case 'roar': tone(t, 1.1, 120, 55, 0.35); tone(t, 1.1, 123, 52, 0.25, 'square'); burst(t, 1, 800, 150, 0.25); break;
    case 'shark': burst(t, 0.25, 3000, 600, 0.4); tone(t, 0.4, 330, 311, 0.15, 'square'); tone(t, 0.4, 349, 330, 0.15, 'square'); break;
    case 'boat': tone(t, 0.5, 180, 140, 0.06, 'triangle'); burst(t, 0.5, 900, 300, 0.12); break;
    case 'rescue': [523, 659, 784, 1047].forEach((f, i) => pluck(f, t + i * 0.09, 0.15, sfx, 0.5, 'triangle')); break;
    case 'victory': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => pluck(f, t + i * 0.13, 0.18, sfx, 0.7, 'triangle')); break;
    case 'defeat': [392, 370, 349, 262].forEach((f, i) => pluck(f, t + i * 0.25, 0.15, sfx, 0.7, 'sine')); break;
    case 'whoosh': burst(t, 0.4, 400, 3000, 0.2, 'bandpass'); break;
    case 'alert': pluck(988, t, 0.1, sfx, 0.2, 'square'); pluck(988, t + 0.18, 0.1, sfx, 0.2, 'square'); break;
  }
}
