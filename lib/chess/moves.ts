import { Chess } from 'chess.js';

export function getSanMovesFromPgn(pgn: string): string[] {
  const chess = new Chess();

  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }

  // san list (one entry per ply)
  return chess.history();
}

export type ParsedMove = {
  ply: number; // 0-based ply index (0 = starting position)
  color: 'w' | 'b';
  san: string;
  fenBefore: string;
  fenAfter: string;
  from: string;
  to: string;
  promotion?: string;
};

export function getParsedMovesFromPgn(pgn: string): ParsedMove[] {
  const chess = new Chess();

  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }

  const verboseMoves = chess.history({ verbose: true });
  const parsed: ParsedMove[] = [];

  chess.reset();

  for (let i = 0; i < verboseMoves.length; i += 1) {
    const move = verboseMoves[i];
    const fenBefore = chess.fen();
    const result = chess.move(move);
    if (!result) break;

    parsed.push({
      ply: i,
      color: result.color,
      san: result.san,
      fenBefore,
      fenAfter: chess.fen(),
      from: result.from,
      to: result.to,
      promotion: result.promotion ?? undefined,
    });
  }

  return parsed;
}
