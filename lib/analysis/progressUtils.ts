// lib/analysis/progressUtils.ts
// pure helpers for computing per-game progress metrics from stored GameAnalysis data.

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

// treat forced mate as large centipawn value for loss calculation
const MATE_CP = 2000;

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

function toCp(e: PositionEval): number {
  if (e.cp !== null) return e.cp;
  if (e.mate !== null) return e.mate > 0 ? MATE_CP : -MATE_CP;
  return 0;
}

// average centipawn loss for the player's moves → accuracy score 0–100
export function computeAccuracy(evals: PositionEval[], playerSide: 'white' | 'black'): number {
  const sign = playerSide === 'white' ? 1 : -1;
  // white moves at even indices (0,2,4…), black at odd (1,3,5…)
  const startPly = playerSide === 'white' ? 0 : 1;

  let totalLoss = 0;
  let count = 0;

  for (let i = startPly; i + 1 < evals.length; i += 2) {
    const before = evals[i];
    const after = evals[i + 1];
    if (!before || !after) continue;

    const cpBefore = sign * toCp(before);
    const cpAfter = sign * toCp(after);
    totalLoss += Math.max(0, cpBefore - cpAfter);
    count++;
  }

  if (count === 0) return 100;
  return Math.max(0, Math.min(100, Math.round(100 - totalLoss / count / 10)));
}

export function buildProgressPoint(
  gameUuid: string,
  pgn: string,
  playerSide: 'white' | 'black',
  evals: PositionEval[],
  turningPoints: TurningPoint[],
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
    accuracy: computeAccuracy(evals, playerSide),
    rating,
    result,
    blunders: mine.filter((tp) => tp.type === 'blunder').length,
    mistakes: mine.filter((tp) => tp.type === 'mistake').length,
  };
}
