// lib/analysis/progressUtils.ts
// pure helpers for computing per-game progress metrics from stored GameAnalysis data.

import { computeChesscomAccuracy } from './accuracy';
import type { PositionEval } from './stockfish';
import type { TurningPoint } from '@/lib/interfaces/analysis';

export type ProgressPoint = {
  gameUuid: string;
  date: number; // unix timestamp (seconds)
  accuracy: number; // 0–100
  rating: number | null;
  result: 'win' | 'loss' | 'draw';
  blunders: number;
  mistakes: number;
};

type PgnHeaders = {
  date: number | null; // unix timestamp seconds
  whiteElo: number | null;
  blackElo: number | null;
  result: '1-0' | '0-1' | '1/2-1/2' | null;
};


function parsePgnHeaders(pgn: string): PgnHeaders {
  const dateMatch = pgn.match(/\[Date\s+"(\d{4})\.(\d{2})\.(\d{2})"\]/);
  const date = dateMatch
    ? Date.UTC(+dateMatch[1], +dateMatch[2] - 1, +dateMatch[3]) / 1000
    : null;

  const whiteEloMatch = pgn.match(/\[WhiteElo\s+"(\d+)"\]/);
  const blackEloMatch = pgn.match(/\[BlackElo\s+"(\d+)"\]/);
  const resultMatch = pgn.match(/\[Result\s+"([^"]+)"\]/);

  return {
    date,
    whiteElo: whiteEloMatch ? +whiteEloMatch[1] : null,
    blackElo: blackEloMatch ? +blackEloMatch[1] : null,
    result: (resultMatch?.[1] as PgnHeaders['result']) ?? null,
  };
}


export function buildProgressPoint(
  gameUuid: string,
  pgn: string,
  playerSide: 'white' | 'black',
  evals: PositionEval[],
  turningPoints: TurningPoint[],
  storedAccuracy?: number,
): ProgressPoint | null {
  const headers = parsePgnHeaders(pgn);
  if (!headers.date) return null;

  const rating = playerSide === 'white' ? headers.whiteElo : headers.blackElo;

  let result: 'win' | 'loss' | 'draw' = 'draw';
  if (headers.result === '1-0') result = playerSide === 'white' ? 'win' : 'loss';
  else if (headers.result === '0-1') result = playerSide === 'black' ? 'win' : 'loss';

  const mine = turningPoints.filter((tp) => tp.side === playerSide);

  return {
    gameUuid,
    date: headers.date,
    accuracy: storedAccuracy ?? computeChesscomAccuracy(evals, playerSide),
    rating,
    result,
    blunders: mine.filter((tp) => tp.type === 'blunder').length,
    mistakes: mine.filter((tp) => tp.type === 'mistake').length,
  };
}
