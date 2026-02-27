'use client';

import * as React from 'react';

type Orientation = 'white' | 'black';
type Square = `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

type Piece = {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
};

type Props = {
  fen: string;
  orientation?: Orientation;
  className?: string;
  showCoords?: boolean;
};

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const ranks = [8, 7, 6, 5, 4, 3, 2, 1] as const;

function pieceToUnicode(piece: Piece): string {
  const map: Record<Piece['color'], Record<Piece['type'], string>> = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };

  return map[piece.color][piece.type];
}

function isLightSquare(square: Square): boolean {
  const fileChar = square[0] as (typeof files)[number];
  const rank = Number(square[1]);
  const fileIndex = files.indexOf(fileChar);
  return (fileIndex + rank) % 2 === 0;
}

function getSquares(orientation: Orientation): Square[] {
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

function parseFenPieces(fen: string): Map<Square, Piece> {
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

export function ChessBoard({ fen, orientation = 'white', className, showCoords = true }: Props) {
  const squares = React.useMemo(() => getSquares(orientation), [orientation]);
  const pieces = React.useMemo(() => parseFenPieces(fen), [fen]);

  return (
    <div className={className}>
      <div className="w-full max-w-[560px] aspect-square rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="grid grid-cols-8 h-full">
          {squares.map((square) => {
            const piece = pieces.get(square) ?? null;
            const light = isLightSquare(square);

            const showFile =
              showCoords &&
              ((orientation === 'white' && square[1] === '1') ||
                (orientation === 'black' && square[1] === '8'));

            const showRank =
              showCoords &&
              ((orientation === 'white' && square[0] === 'a') ||
                (orientation === 'black' && square[0] === 'h'));

            return (
              <div
                key={square}
                className={[
                  'relative flex items-center justify-center aspect-square overflow-hidden',
                  light ? 'bg-[#f0d9b5]' : 'bg-[#b58863]',
                ].join(' ')}
              >
                {showRank ? (
                  <div className="absolute top-1 left-1 text-[10px] font-semibold text-muted-foreground">
                    {square[1]}
                  </div>
                ) : null}

                {showFile ? (
                  <div className="absolute bottom-1 right-1 text-[10px] font-semibold text-muted-foreground">
                    {square[0]}
                  </div>
                ) : null}

                {piece ? (
                  <span
                    className="w-full h-full flex items-center justify-center leading-none select-none"
                    style={{
                      fontSize: 'clamp(22px, 5vw, 44px)',
                      fontFamily:
                        'ui-sans-serif, system-ui, -apple-system, Segoe UI Symbol, Apple Color Emoji, Noto Color Emoji',
                      // white pieces: white fill + dark outline; black pieces: dark fill + light outline
                      color: piece.color === 'w' ? '#ffffff' : '#1a1a1a',
                      textShadow:
                        piece.color === 'w'
                          ? '0 0 2px #000, 0 1px 3px rgba(0,0,0,0.9)'
                          : '0 0 2px rgba(255,255,255,0.9), 0 1px 3px rgba(255,255,255,0.6)',
                    }}
                  >
                    {pieceToUnicode(piece)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
