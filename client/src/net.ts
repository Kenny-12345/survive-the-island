import { io } from 'socket.io-client';
import { useSyncExternalStore } from 'react';
import type { Action, GameEvent } from '../../shared/game';
import type { ChatMsg, RoomView } from '../../shared/protocol';

export interface ProfileData {
  id: string; name: string; avatar: string; games: number; wins: number; losses: number; rescued: number; lost: number;
  bestScore: number; charCounts: Record<string, number>; badges: string[];
}
export interface Toast { id: number; kind: 'error' | 'info'; text: string }
interface Store {
  connected: boolean;
  ready: boolean;
  profile: ProfileData | null;
  room: RoomView | null;
  chat: ChatMsg[];
  toasts: Toast[];
  reactions: (ChatMsg & { key: number })[];
}
let state: Store = { connected: false, ready: false, profile: null, room: null, chat: [], toasts: [], reactions: [] };
const subs = new Set<() => void>();
const set = (p: Partial<Store>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
export const useStore = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => state);
export const getStore = () => state;

/* ---- identity: one per tab (so several tabs = several players), persisted across visits ---- */
const safe = <T,>(f: () => T, d: T) => { try { return f(); } catch { return d; } };
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
async function resolveToken(): Promise<string> {
  const existing = safe(() => sessionStorage.getItem('sti-token'), null);
  if (existing) return existing;
  const stored = safe(() => localStorage.getItem('sti-token'), null);
  let token = stored ?? newToken();
  if (stored && 'BroadcastChannel' in window) {
    // Another open tab already using the saved identity? Then this tab plays as a fresh guest.
    const ch = new BroadcastChannel('sti-identity');
    const taken = await new Promise<boolean>(res => {
      ch.onmessage = e => { if (e.data?.type === 'mine' && e.data.token === stored) res(true); };
      ch.postMessage({ type: 'who', token: stored });
      setTimeout(() => res(false), 250);
    });
    ch.close();
    if (taken) token = newToken();
  }
  if (!stored) safe(() => localStorage.setItem('sti-token', token), undefined);
  safe(() => sessionStorage.setItem('sti-token', token), undefined);
  return token;
}
let token = '';
const tokenReady = resolveToken().then(t => {
  token = t;
  if ('BroadcastChannel' in window) {
    const ch = new BroadcastChannel('sti-identity');
    ch.onmessage = e => { if (e.data?.type === 'who' && e.data.token === token) ch.postMessage({ type: 'mine', token }); };
  }
  return t;
});

/* ---- socket ---- */
export const socket = io(import.meta.env.VITE_SERVER_URL || undefined, { autoConnect: false, transports: ['websocket', 'polling'] });
type EvListener = (seq: number, ev: GameEvent[]) => void;
const evListeners = new Set<EvListener>();
export const onGameEvents = (f: EvListener) => { evListeners.add(f); return () => { evListeners.delete(f); }; };

let toastId = 0;
export function toast(text: string, kind: Toast['kind'] = 'info') {
  const t = { id: ++toastId, kind, text };
  set({ toasts: [...state.toasts, t].slice(-4) });
  setTimeout(() => set({ toasts: state.toasts.filter(x => x !== t) }), 3500);
}

socket.on('connect', async () => {
  await tokenReady;
  set({ connected: true });
  const name = safe(() => localStorage.getItem('sti-name'), null) ?? undefined;
  socket.emit('hello', { token, name }, (r: { profile: ProfileData }) => set({ profile: r.profile, ready: true }));
});
socket.on('disconnect', () => set({ connected: false }));
socket.on('profile', (p: ProfileData) => set({ profile: p }));
socket.on('room:state', (room: RoomView) => set({ room }));
socket.on('room:left', () => set({ room: null, chat: [] }));
socket.on('kicked', () => { set({ room: null, chat: [] }); toast('You were removed from the room by the host.', 'error'); });
socket.on('chat:history', (chat: ChatMsg[]) => set({ chat }));
let rk = 0;
socket.on('chat', (m: ChatMsg) => {
  if (m.reaction) {
    const r = { ...m, key: ++rk };
    set({ reactions: [...state.reactions, r] });
    setTimeout(() => set({ reactions: state.reactions.filter(x => x !== r) }), 2600);
  } else set({ chat: [...state.chat, m].slice(-100) });
});
socket.on('toast', (t: { kind: Toast['kind']; text: string }) => toast(t.text, t.kind));
socket.on('game:events', (b: { seq: number; events: GameEvent[] }) => evListeners.forEach(f => f(b.seq, b.events)));
tokenReady.then(() => socket.connect());

export function call<T = any>(ev: string, data?: unknown): Promise<T> {
  return new Promise(res => socket.timeout(8000).emit(ev, data, (err: unknown, r: T) => res(err ? ({ error: 'Server did not respond.' } as T) : r)));
}
let aid = 0;
export async function act(action: Action) {
  // a unique action id lets the server drop duplicates (double-clicks, retransmits after reconnect)
  const r = await call<{ ok?: boolean; error?: string }>('game:action', { action, actionId: `${token.slice(0, 6)}-${Date.now()}-${++aid}` });
  if (r?.error) toast(r.error, 'error');
  return r;
}
export const emit = (ev: string, data?: unknown) => socket.emit(ev, data);
export const inviteLink = (code: string) => `${location.origin}${location.pathname}?room=${code}`;
