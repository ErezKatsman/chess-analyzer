// components/drill-panel/types.ts
// type definitions for the drill feature

export type DrillStatus = 'idle' | 'wrong' | 'revealed' | 'correct';

// maps chess.js piece type letter to readable name for hint messages
export const PIECE_NAMES: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

export type DrillProps = {
  fen: string; // position before the blunder
  bestMove: string; // uci e.g. "e2e4" — the engine's best move
  blunderMove?: string; // uci of what was actually played in the game
  side: 'white' | 'black';
  moveNumber: number;
  oneLineReason: string;
  evalBefore: number | null;
  evalAfter: number | null;
  drillIndex: number; // 0-based, for "drill 1 of N" display
  totalDrills: number;
  gameUuid?: string; // used to save drill session to mongodb
  patternTag?: string; // weakness tag — enables pre-drill notice cue + post-failure correction card
  onNext?: () => void;
  onExit: () => void;
};
