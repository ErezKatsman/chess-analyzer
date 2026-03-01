'use client';

import * as React from 'react';
import type { Orientation, Square, Piece } from '@/components/chess-board/utils';
import {
  files,
  getSquares,
  parseFenPieces,
  pieceToUnicode,
  isLightSquare,
  squareCenter,
  shortenEnd,
  parseUci,
} from '@/components/chess-board/utils';

type Props = {
  fen: string;
  orientation?: Orientation;
  className?: string;
  showCoords?: boolean;
  // uci move string to highlight as best-move arrow (e.g. "e2e4")
  bestMove?: string | null;
  // interactive mode: called when user clicks a square
  onSquareClick?: (square: string) => void;
  // square to highlight as selected (e.g. "e2")
  selectedSquare?: string | null;
};

export function ChessBoard({
  fen,
  orientation = 'white',
  className,
  showCoords = true,
  bestMove = null,
  onSquareClick,
  selectedSquare = null,
}: Props) {
  const squares = React.useMemo(() => getSquares(orientation), [orientation]);
  const pieces = React.useMemo(() => parseFenPieces(fen), [fen]);

  const arrow = bestMove ? parseUci(bestMove) : null;
  const isInteractive = !!onSquareClick;

  return (
    <div className={className}>
      <div className="relative w-full max-w-[560px] aspect-square rounded-2xl border bg-card shadow-sm overflow-hidden">
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

            const isSelected = selectedSquare === square;

            return (
              <div
                key={square}
                onClick={isInteractive ? () => onSquareClick(square) : undefined}
                className={[
                  'relative flex items-center justify-center aspect-square overflow-hidden',
                  light ? 'bg-[#f0d9b5]' : 'bg-[#b58863]',
                  isSelected ? 'ring-4 ring-inset ring-blue-400' : '',
                  isInteractive ? 'cursor-pointer' : '',
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

        {/* best-move arrow overlay — rendered only when bestMove is provided */}
        {arrow ? (() => {
          const from = squareCenter(arrow.from, orientation);
          const to = squareCenter(arrow.to, orientation);
          const tip = shortenEnd(from, to, 0.28);
          return (
            <svg
              viewBox="0 0 8 8"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <defs>
                <marker
                  id="best-move-head"
                  markerWidth="0.5"
                  markerHeight="0.5"
                  refX="0.45"
                  refY="0.25"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <polygon points="0,0 0.5,0.25 0,0.5" fill="rgba(0,200,80,0.9)" />
                </marker>
              </defs>
              {/* highlight from-square */}
              <rect
                x={Math.floor(from.x)}
                y={Math.floor(from.y)}
                width={1}
                height={1}
                fill="rgba(0,200,80,0.25)"
              />
              {/* highlight to-square */}
              <rect
                x={Math.floor(to.x)}
                y={Math.floor(to.y)}
                width={1}
                height={1}
                fill="rgba(0,200,80,0.35)"
              />
              {/* arrow shaft */}
              <line
                x1={from.x}
                y1={from.y}
                x2={tip.x}
                y2={tip.y}
                stroke="rgba(0,200,80,0.9)"
                strokeWidth="0.16"
                strokeLinecap="round"
                markerEnd="url(#best-move-head)"
              />
            </svg>
          );
        })() : null}
      </div>
    </div>
  );
}
