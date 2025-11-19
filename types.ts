export interface Point {
  r: number;
  c: number;
}

export interface AppleCell {
  id: string;
  value: number;
  r: number;
  c: number;
  isCleared: boolean;
}

export interface SelectionBox {
  start: Point;
  end: Point;
}

export enum GameStatus {
  IDLE,
  LOBBY,     // Waiting for connection
  PLAYING,
  PAUSED,
  GAME_OVER,
  VICTORY
}

export interface HintResponse {
  found: boolean;
  startRow?: number;
  startCol?: number;
  endRow?: number;
  endCol?: number;
  message?: string;
}

// Multiplayer Types
export type MessageType = 'START' | 'SCORE' | 'GAME_OVER' | 'RESTART';

export interface GameMessage {
  type: MessageType;
  payload?: any;
}

// Shim for global PeerJS
declare global {
  interface Window {
    Peer: any;
  }
}