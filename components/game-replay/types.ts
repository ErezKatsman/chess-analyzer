// components/game-replay/types.ts
// shared type definitions for the game-replay feature

import type { TurningPoint, Pattern, BlunderExplanation } from '@/lib/interfaces/analysis';

export type { TurningPoint, Pattern, BlunderExplanation };

export type QuotaState = { used: number; limit: number; remaining?: number; isPaid?: boolean } | null;

export type PlyEval = {
  ply: number;
  fen: string;
  cp: number | null;
  mate: number | null;
  bestMove: string | null;
};

export type AnalysisResult = {
  evals: PlyEval[];
  turningPoints: TurningPoint[];
  patterns: Pattern[];
  explanations?: BlunderExplanation[];
};

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; result: AnalysisResult };

export type GameOption = { uuid: string; label: string };

export type GameReplayProps = {
  userName: string;
  uuid: string;
  // pre-loaded from mongodb server-side — skips the "analyze" step on reopen
  initialAnalysis?: AnalysisResult | null;
  opponentName: string;
  resultText: string;
  gameUrl: string;
  ecoUrl?: string;
  opening?: string;
  endTime: number;
  timeClass: string;
  timeControl: string;
  fenArr: string[];
  sanMoves: string[];
  gameOptions: GameOption[];
  isWhite: boolean;
  archiveYear?: number;
  archiveMonth?: number;
  pgn: string;
  // true when the stored analysisVersion is older than CURRENT_VERSION
  isStale?: boolean;
};
