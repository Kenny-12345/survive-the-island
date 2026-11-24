import { useSyncExternalStore } from 'react';

export interface Settings {
  music: number; sfx: number; ambient: number; muted: boolean;
  reducedMotion: boolean; lowFx: boolean; fxChecked: boolean; cinematic: boolean; weather: 'clear' | 'rain' | 'storm';
}
const defaults: Settings = {
  music: 0.5, sfx: 0.8, ambient: 0.6, muted: false,
  reducedMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  lowFx: false, fxChecked: false, cinematic: true, weather: 'clear',
};
let s: Settings = defaults;
try { s = { ...defaults, ...JSON.parse(localStorage.getItem('sti-settings') || '{}') }; } catch { /* storage unavailable */ }
const subs = new Set<() => void>();
export const getSettings = () => s;
export const onSettings = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export function setSettings(p: Partial<Settings>) {
  s = { ...s, ...p };
  try { localStorage.setItem('sti-settings', JSON.stringify(s)); } catch { /* ignore */ }
  subs.forEach(f => f());
}
export const useSettings = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => s);
