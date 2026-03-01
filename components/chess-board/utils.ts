// components/chess-board/utils.ts
// types and pure helper functions for the ChessBoard component

export type Orientation = 'white' | 'black';
export type Square = `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export type Piece = {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
};

export const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const ranks = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export function pieceToUnicode(piece: Piece): string {
  const map: Record<Piece['color'], Record<Piece['type'], string>> = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };
  return map[piece.color][piece.type];
}

export function isLightSquare(square: Square): boolean {
  const fileChar = square[0] as (typeof files)[number];
  const rank = Number(square[1]);
  const fileIndex = files.indexOf(fileChar);
  return (fileIndex + rank) % 2 === 0;
}

export function getSquares(orientation: Orientation): Square[] {
  const orderedFiles = orientation === 'white' ? files : [...files].reverse();
  const orderedRanks = orientation === 'white' ? ranks : [...ranks].reverse();

  const result: Square[] = [];
  for (const rank of orderedRanks) {
    for (const file of orderedFiles) {
      result.push(`${file}${rank}` as Square);
    }
  }
  return result;
}

export function parseFenPieces(fen: string): Map<Square, Piece> {
  const map = new Map<Square, Piece>();
  const placement = fen.split(' ')[0] ?? '';
  const rows = placement.split('/');

  if (rows.length !== 8) return map;

  for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
    const row = rows[rowIndex] ?? '';
    const rank = (8 - rowIndex) as 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1;

    let fileIndex = 0;
    for (const char of row) {
      if (fileIndex > 7) break;

      const num = Number(char);
      if (!Number.isNaN(num)) {
        fileIndex += num;
        continue;
      }

      const file = files[fileIndex];
      if (!file) break;

      const isWhite = char === char.toUpperCase();
      const type = char.toLowerCase() as Piece['type'];

      map.set(`${file}${rank}` as Square, { color: isWhite ? 'w' : 'b', type });
      fileIndex += 1;
    }
  }

  return map;
}

// convert a uci square string (e.g. "e2") to svg center coords in 0-8 space
export function squareCenter(square: string, orientation: Orientation): { x: number; y: number } {
  const fileChar = square[0] ?? 'a';
  const rank = parseInt(square[1] ?? '1', 10);
  const fileIndex = files.indexOf(fileChar as (typeof files)[number]);
  if (fileIndex < 0 || rank < 1 || rank > 8) return { x: 0, y: 0 };
  if (orientation === 'white') {
    return { x: fileIndex + 0.5, y: 8 - rank + 0.5 };
  }
  return { x: 7 - fileIndex + 0.5, y: rank - 1 + 0.5 };
}

// shorten the arrow line end to leave visual room for the arrowhead
export function shortenEnd(
  from: { x: number; y: number },
  to: { x: number; y: number },
  amount: number,
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return to;
  return { x: to.x - (dx / len) * amount, y: to.y - (dy / len) * amount };
}

// parse uci move string into from/to square strings
export function parseUci(uci: string): { from: string; to: string } | null {
  if (uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}
