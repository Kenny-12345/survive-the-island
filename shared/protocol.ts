import type { GameEvent, GameSettings, GameState } from './game';

export const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
  character: string;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
}
export interface ChatMsg { id: number; from: string; name: string; color: string; text: string; at: number; system?: boolean; reaction?: boolean }
export interface RoomView {
  code: string;
  hostId: string;
  settings: GameSettings;
  players: RoomPlayer[];
  game: GameState | null;
  you: string;
}
export interface PublicRoom { code: string; host: string; players: number; max: number; mode: string; monsterPack: boolean; inGame: boolean }
export interface EventBatch { seq: number; events: GameEvent[] }
