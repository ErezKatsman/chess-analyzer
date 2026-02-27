// lib/analysis/patterns.ts
import type { ParsedMove } from '@/lib/chess/moves';
import type { PositionEval } from './stockfish';
import type { TurningPoint, Pattern } from '@/lib/interfaces/analysis';

// count minor/major pieces (N, B, R, Q) from fen — proxy for endgame detection
function countActivePieces(fen: string): number {
  const boardPart = fen.split(' ')[0];
  let count = 0;
  for (const ch of boardPart) {
    if ('rnbqRNBQ'.includes(ch)) count += 1;
  }
  return count;
}

// true if the side still has unused castling rights (king hasn't castled yet)
function hasUnusedCastlingRights(fen: string, side: 'white' | 'black'): boolean {
  const castlingField = fen.split(' ')[2] ?? '-';
  if (side === 'white') return castlingField.includes('K') || castlingField.includes('Q');
  return castlingField.includes('k') || castlingField.includes('q');
}

// get 0-based move array index from a turning point
function moveIndexFromTp(tp: TurningPoint): number {
  return (tp.moveNumber - 1) * 2 + (tp.side === 'black' ? 1 : 0);
}

export function detectPatterns(
  moves: ParsedMove[],
  evals: PositionEval[],
  turningPoints: TurningPoint[],
): Pattern[] {
  const patterns: Pattern[] = [];

  // --- opening mistakes (first 12 moves) ---
  const openingTurns = turningPoints.filter(
    (tp) => tp.moveNumber <= 12 && (tp.type === 'blunder' || tp.type === 'mistake'),
  );
  if (openingTurns.length >= 2) {
    patterns.push({
      tag: 'opening',
      title: 'Opening mistakes',
      evidenceMoves: openingTurns.map((tp) => tp.moveNumber),
      coachingHint:
        'Review opening principles: develop pieces to active squares, control the center, and castle early.',
    });
  }

  // --- tactics: any blunder or missed win ---
  const blunders = turningPoints.filter(
    (tp) => tp.type === 'blunder' || tp.type === 'missed_win',
  );
  if (blunders.length >= 1) {
    patterns.push({
      tag: 'tactics',
      title: blunders.length >= 3 ? 'Recurring tactical errors' : 'Tactical oversight',
      evidenceMoves: blunders.map((tp) => tp.moveNumber),
      coachingHint:
        'Before each move scan for checks, captures, and threats. Practice tactical puzzles daily.',
    });
  }

  // --- endgame technique: mistakes when few pieces remain ---
  const endgameTurns = turningPoints.filter((tp) => {
    if (tp.moveNumber < 25) return false;
    const evalEntry = evals[moveIndexFromTp(tp)];
    if (!evalEntry) return false;
    return countActivePieces(evalEntry.fen) <= 6;
  });
  if (endgameTurns.length >= 1) {
    patterns.push({
      tag: 'endgame',
      title: 'Endgame technique',
      evidenceMoves: endgameTurns.map((tp) => tp.moveNumber),
      coachingHint:
        'Study basic endgame techniques: king and pawn endgames, rook endings, and opposition.',
    });
  }

  // --- king safety: mistakes while king is still uncastled after move 10 ---
  const kingSafetyTurns = turningPoints.filter((tp) => {
    if (tp.moveNumber <= 10) return false;
    const evalEntry = evals[moveIndexFromTp(tp)];
    if (!evalEntry) return false;
    return hasUnusedCastlingRights(evalEntry.fen, tp.side);
  });
  if (kingSafetyTurns.length >= 1) {
    patterns.push({
      tag: 'king-safety',
      title: 'King safety issues',
      evidenceMoves: kingSafetyTurns.map((tp) => tp.moveNumber),
      coachingHint:
        'Your king was uncastled when errors occurred. Castle early to keep your king protected.',
    });
  }

  // --- time trouble: mistakes cluster in the last third of the game ---
  const lastThirdStart = Math.floor((moves.length / 2) * 0.66);
  const lateMistakes = turningPoints.filter(
    (tp) =>
      tp.moveNumber >= lastThirdStart && (tp.type === 'blunder' || tp.type === 'mistake'),
  );
  const earlyMistakes = turningPoints.filter(
    (tp) =>
      tp.moveNumber < lastThirdStart && (tp.type === 'blunder' || tp.type === 'mistake'),
  );
  if (lateMistakes.length >= 2 && lateMistakes.length > earlyMistakes.length) {
    patterns.push({
      tag: 'time-trouble',
      title: 'Late-game accuracy drops',
      evidenceMoves: lateMistakes.map((tp) => tp.moveNumber),
      coachingHint:
        'Your accuracy dropped late in the game. Manage your clock and keep 30+ seconds per move.',
    });
  }

  // --- strategy: multiple inaccuracies on quiet (non-capture, non-check) moves ---
  const strategicInaccuracies = turningPoints.filter((tp) => {
    if (tp.type !== 'inaccuracy') return false;
    const move = moves[moveIndexFromTp(tp)];
    if (!move) return false;
    // quiet move = no capture (x), no check (+/#), no promotion (=)
    return !move.san.includes('x') && !move.san.includes('+') && !move.san.includes('=');
  });
  if (strategicInaccuracies.length >= 3) {
    patterns.push({
      tag: 'strategy',
      title: 'Positional inaccuracies',
      evidenceMoves: strategicInaccuracies.map((tp) => tp.moveNumber),
      coachingHint:
        'Focus on positional play: improve piece coordination, control open files, and avoid weak pawns.',
    });
  }

  return patterns;
}
