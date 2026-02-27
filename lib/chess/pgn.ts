// lib/chess/pgn.ts
import { Chess, type Move } from 'chess.js';

export type GetFenArrayOptions = {
  includeInitial?: boolean;
};

function fileOf(square: string): string {
  return square[0] ?? '';
}

function rankOf(square: string): number {
  const r = square[1];
  return r ? Number(r) : NaN;
}

function epSquareFromBigPawnMove(move: Move): string | null {
  if (!move.flags.includes('b')) return null;

  const file = fileOf(move.to);
  const fromRank = rankOf(move.from);

  if (!file || Number.isNaN(fromRank)) return null;

  const epRank = move.color === 'w' ? fromRank + 1 : fromRank - 1;
  return `${file}${epRank}`;
}

function getStartFenFromPgnHeaders(pgn: string): string | undefined {
  // cheap/robust enough: only look for the FEN tag line.
  // chess.js also exposes header(), but we can’t access it until after load.
  const match = pgn.match(/^\[FEN\s+"([^"]+)"\]\s*$/im);
  return match?.[1]?.trim();
}

export function getFenArrayFromPgn(pgn: string, options: GetFenArrayOptions = {}): string[] {
  const { includeInitial = false } = options;

  const trimmedPgn = pgn.trim();
  if (!trimmedPgn) return includeInitial ? [new Chess().fen()] : [];

  const parsed = new Chess();

  try {
    parsed.loadPgn(trimmedPgn);
  } catch {
    return includeInitial ? [new Chess().fen()] : [];
  }

  const moves = parsed.history({ verbose: true });

  const startFen = getStartFenFromPgnHeaders(trimmedPgn);
  const replay = startFen ? new Chess(startFen) : new Chess();

  const fens: string[] = [];
  if (includeInitial) fens.push(replay.fen());

  for (const parsedMove of moves) {
    const appliedMove = replay.move({
      from: parsedMove.from,
      to: parsedMove.to,
      promotion: parsedMove.promotion,
    });

    if (!appliedMove) {
      // stop replaying at the first invalid move, return fens collected so far
      break;
    }

    const ep = epSquareFromBigPawnMove(appliedMove);

    const parts = replay.fen().split(' ');
    if (parts.length >= 4) {
      parts[3] = ep ?? '-';
    }

    fens.push(parts.join(' '));
  }

  return fens;
}
