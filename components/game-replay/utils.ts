// components/game-replay/utils.ts
// pure helpers for the game-replay feature — no react dependencies

import { computeChesscomAccuracy } from '@/lib/analysis/accuracy';
import type { TurningPoint, Pattern } from '@/lib/interfaces/analysis';
import type { PlyEval } from './types';

// ── move quality ────────────────────────────────────────────────────────────

export type MoveQuality = 'blunder' | 'mistake' | 'inaccuracy' | 'normal' | 'good';

// mirrors thresholds in insights.ts; applied to every ply (no decided-suppression for blunders)
const BLUNDER_CP = 200;
const MISTAKE_CP = 100;
const INACCURACY_CP = 50;
const DECIDED_BLUNDER_CP = 350;  // suppress blunder when position already decided beyond this
const DECIDED_MINOR_CP = 500;    // suppress mistake/inaccuracy beyond this

function toCpVal(e: PlyEval): number {
  if (e.cp !== null) return e.cp;
  if (e.mate !== null) return e.mate > 0 ? 2000 : -2000;
  return 0;
}

// ── accuracy score ───────────────────────────────────────────────────────────
// chess.com-style accuracy: 103.1668 * exp(-0.04354 * avgCpLoss) - 3.1669
// caps individual move loss at 1000cp to avoid outlier distortion

export function computeAccuracy(evals: PlyEval[], side: 'white' | 'black'): number {
  return computeChesscomAccuracy(evals, side);
}

export function computeMoveQuality(
  before: PlyEval,
  after: PlyEval,
  side: 'white' | 'black',
): MoveQuality {
  const sign = side === 'white' ? 1 : -1;
  const cpB = sign * toCpVal(before);
  const cpA = sign * toCpVal(after);
  const loss = cpB - cpA; // positive = mover got worse
  const absBefore = Math.abs(cpB);

  if (loss >= BLUNDER_CP && absBefore <= DECIDED_BLUNDER_CP) return 'blunder';
  if (loss >= MISTAKE_CP && absBefore <= DECIDED_MINOR_CP) return 'mistake';
  if (loss >= INACCURACY_CP && absBefore <= DECIDED_MINOR_CP) return 'inaccuracy';
  // good: mover was losing but found a defensive resource that improved their eval
  if (loss <= -50 && cpB < 0) return 'good';
  return 'normal';
}

export function moveQualitySymbol(q: MoveQuality): string {
  switch (q) {
    case 'blunder': return '??';
    case 'mistake': return '?';
    case 'inaccuracy': return '?!';
    case 'good': return '!';
    default: return '';
  }
}

export function moveQualityBadgeClass(q: MoveQuality): string {
  const base = 'inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none';
  switch (q) {
    case 'blunder': return `${base} bg-red-500/15 text-red-500`;
    case 'mistake': return `${base} bg-orange-400/15 text-orange-400`;
    case 'inaccuracy': return `${base} bg-yellow-500/15 text-yellow-600 dark:text-yellow-500`;
    case 'good': return `${base} bg-green-500/15 text-green-500`;
    default: return '';
  }
}

export type MoveRow = { moveNumber: number; white?: string; black?: string };

export function formatEndTime(endTimeSeconds: number): string {
  if (!Number.isFinite(endTimeSeconds) || endTimeSeconds <= 0) return '';
  const date = new Date(endTimeSeconds * 1000);
  return date.toLocaleString();
}

export function groupMoves(sanMoves: string[]): MoveRow[] {
  const rows: MoveRow[] = [];
  for (let i = 0; i < sanMoves.length; i += 2) {
    rows.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: sanMoves[i],
      black: sanMoves[i + 1],
    });
  }
  return rows;
}

// pill-badge style — colored bg + text so badges stand out in the move list
export function tpBadgeClass(type: TurningPoint['type']): string {
  const base =
    'inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none';
  switch (type) {
    case 'blunder':
      return `${base} bg-red-500/15 text-red-500`;
    case 'mistake':
      return `${base} bg-orange-400/15 text-orange-400`;
    case 'inaccuracy':
      return `${base} bg-yellow-500/15 text-yellow-600 dark:text-yellow-500`;
    case 'missed_win':
      return `${base} bg-purple-400/15 text-purple-400`;
    default:
      return `${base} bg-muted text-muted-foreground`;
  }
}

export function tpSymbol(type: TurningPoint['type']): string {
  switch (type) {
    case 'blunder':
      return '??';
    case 'mistake':
      return '?';
    case 'inaccuracy':
      return '?!';
    case 'missed_win':
      return '⁉';
    default:
      return '';
  }
}

export function patternTagClass(tag: Pattern['tag']): string {
  switch (tag) {
    case 'tactics':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'opening':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'endgame':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'king-safety':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'time-trouble':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'strategy':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
