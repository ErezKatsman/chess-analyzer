// lib/analysis/insights.ts
import type { ParsedMove } from '@/lib/chess/moves';
import type { PositionEval } from './stockfish';
import type { TurningPoint } from '@/lib/interfaces/analysis';

// centipawn loss thresholds for move classification
const BLUNDER_CP = 200;
const MISTAKE_CP = 100;
const INACCURACY_CP = 50;

// treat a forced mate as a large cp value for loss comparison
const MATE_CP = 2000;

// suppress mistakes/inaccuracies when already losing/winning by this much
const DECIDED_MINOR_CP = 500;
// suppress blunder cascades: once losing by this much, further 200cp drops are noise
const DECIDED_BLUNDER_CP = 350;

// convert a position eval to a numeric cp value (handles mate)
function toCp(e: PositionEval): number {
  if (e.cp !== null) return e.cp;
  if (e.mate !== null) return e.mate > 0 ? MATE_CP : -MATE_CP;
  return 0;
}

// compute centipawn loss for the side that just moved
// all evals are white-normalized, so we flip sign for black
function cpLossForMover(
  before: PositionEval,
  after: PositionEval,
  side: 'white' | 'black',
): number {
  const sign = side === 'white' ? 1 : -1;
  const cpBefore = sign * toCp(before);
  const cpAfter = sign * toCp(after);
  // positive result means the mover's position got worse
  return cpBefore - cpAfter;
}

// build a short one-line coaching reason for the turning point
function buildReason(
  type: TurningPoint['type'],
  san: string,
  before: PositionEval,
  after: PositionEval,
  side: 'white' | 'black',
): string {
  const sign = side === 'white' ? 1 : -1;
  const cpB = sign * toCp(before);
  const cpA = sign * toCp(after);

  const fmt = (v: number) => `${v > 0 ? '+' : ''}${v}`;
  const evalDesc = `${fmt(cpB)} → ${fmt(cpA)}`;

  switch (type) {
    case 'blunder':
      return `${san} was a blunder (${evalDesc})`;
    case 'mistake':
      return `${san} was a mistake (${evalDesc})`;
    case 'inaccuracy':
      return `${san} was an inaccuracy (${evalDesc})`;
    case 'missed_win':
      return `${san} missed a forced win`;
    case 'good_defense':
      return `${san} was the only good defensive move`;
    default:
      return san;
  }
}

// returns true when the position is already decided beyond the given threshold.
// used to suppress noise after the game outcome is no longer in doubt.
function isDecided(evalBefore: PositionEval, side: 'white' | 'black', threshold: number = DECIDED_MINOR_CP): boolean {
  const sign = side === 'white' ? 1 : -1;
  const moverCp = sign * toCp(evalBefore);
  return Math.abs(moverCp) > threshold;
}

// detect if a move missed a forced mate that was available before
function isMissedWin(
  before: PositionEval,
  after: PositionEval,
  side: 'white' | 'black',
): boolean {
  const mateWasAvailable =
    before.mate !== null &&
    ((side === 'white' && before.mate > 0) || (side === 'black' && before.mate < 0));

  if (!mateWasAvailable) return false;

  // mate is gone after the move
  const mateLost = after.mate === null;

  // and the position is no longer winning
  const evalDrop = cpLossForMover(before, after, side);

  return mateLost && evalDrop > MISTAKE_CP;
}

export function computeTurningPoints(
  moves: ParsedMove[],
  evals: PositionEval[],
): TurningPoint[] {
  const turningPoints: TurningPoint[] = [];

  for (let i = 0; i < moves.length; i += 1) {
    const move = moves[i];

    // evals[i] = position before this move, evals[i+1] = position after
    const evalBefore = evals[i];
    const evalAfter = evals[i + 1];

    if (!evalBefore || !evalAfter) continue;

    const side: 'white' | 'black' = move.color === 'w' ? 'white' : 'black';
    const loss = cpLossForMover(evalBefore, evalAfter, side);
    // decided uses the default DECIDED_MINOR_CP threshold (500cp) for mistakes/inaccuracies
    const decided = isDecided(evalBefore, side);

    let type: TurningPoint['type'] | null = null;

    if (loss >= BLUNDER_CP && !isDecided(evalBefore, side, DECIDED_BLUNDER_CP)) {
      // use lower threshold for blunders to prevent cascade-flagging after a big loss
      type = 'blunder';
    } else if (!decided && loss >= MISTAKE_CP) {
      // skip mistakes in already-decided positions — they are noise
      type = 'mistake';
    } else if (!decided && loss >= INACCURACY_CP) {
      // skip inaccuracies in already-decided positions — they are noise
      type = 'inaccuracy';
    } else if (!decided && isMissedWin(evalBefore, evalAfter, side)) {
      type = 'missed_win';
    }

    if (!type) continue;

    // move number is 1-based (ply 0 and 1 = move 1, ply 2 and 3 = move 2, etc.)
    const moveNumber = Math.floor(i / 2) + 1;

    turningPoints.push({
      moveNumber,
      side,
      type,
      evalBefore: evalBefore.cp,
      evalAfter: evalAfter.cp,
      oneLineReason: buildReason(type, move.san, evalBefore, evalAfter, side),
      positionHint: evalBefore.fen,
      // uci of the move played — used by the drill intro to show what went wrong
      movePlayed: move.from + move.to + (move.promotion ?? ''),
    });
  }

  return turningPoints;
}
