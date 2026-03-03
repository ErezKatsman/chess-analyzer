'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// stable identity for a piece across fen changes — keeps the same DOM element as it moves
type TrackedPiece = { id: string; piece: Piece; square: Square };

// convert a square to absolute % position over the board (each square = 12.5%)
function squareToPos(square: Square, orientation: Orientation): { left: string; top: string } {
  const col = files.indexOf(square[0] as (typeof files)[number]);
  const rank = parseInt(square[1], 10);
  const x = orientation === 'white' ? col : 7 - col;
  const y = orientation === 'white' ? 8 - rank : rank - 1;
  return { left: `${x * 12.5}%`, top: `${y * 12.5}%` };
}

// manhattan distance between two squares (used for nearest-neighbour piece matching)
function squareDist(a: Square, b: Square): number {
  const af = files.indexOf(a[0] as (typeof files)[number]);
  const ar = parseInt(a[1], 10);
  const bf = files.indexOf(b[0] as (typeof files)[number]);
  const br = parseInt(b[1], 10);
  return Math.abs(af - bf) + Math.abs(ar - br);
}

// diff old squares vs new squares for one piece type to find exactly what moved.
// squares present in both = unmoved (keep id). squares only in new = arrived.
// squares only in old = departed. pair departed→arrived to animate the move.
// this is unambiguous for any legal chess move (at most 1-2 pieces change square).
function reconcile(
  prev: TrackedPiece[],
  next: Map<Square, Piece>,
  nextId: () => string,
): TrackedPiece[] {
  // bucket previous tracked pieces by piece key (color + type)
  const prevByKey = new Map<string, TrackedPiece[]>();
  for (const tp of prev) {
    const k = tp.piece.color + tp.piece.type;
    const arr = prevByKey.get(k) ?? [];
    arr.push(tp);
    prevByKey.set(k, arr);
  }

  // bucket new squares by piece key
  const nextByKey = new Map<string, Square[]>();
  next.forEach((piece, sq) => {
    const k = piece.color + piece.type;
    const arr = nextByKey.get(k) ?? [];
    arr.push(sq);
    nextByKey.set(k, arr);
  });

  const result: TrackedPiece[] = [];
  nextByKey.forEach((newSquares, k) => {
    const piece = next.get(newSquares[0])!;
    const prevGroup = prevByKey.get(k) ?? [];

    const newSet = new Set(newSquares);
    const prevSet = new Set(prevGroup.map((tp) => tp.square));

    // pieces whose square exists in both old and new — they didn't move
    const stayed = newSquares.filter((sq) => prevSet.has(sq));
    // squares that appear in new but not old — a piece arrived here
    const arrived = newSquares.filter((sq) => !prevSet.has(sq));
    // tracked pieces whose old square is gone from new — they departed
    const departed = prevGroup.filter((tp) => !newSet.has(tp.square));

    // stayed: find the matching prev tracked piece and reuse its id
    for (const square of stayed) {
      const tp = prevGroup.find((p) => p.square === square)!;
      result.push({ id: tp.id, piece, square });
    }

    // arrived squares: pair with departed pieces in order (typically 1:1 per move).
    // the departed piece's id makes framer-motion animate from the old square.
    for (let i = 0; i < arrived.length; i++) {
      const square = arrived[i]!;
      if (i < departed.length) {
        result.push({ id: departed[i]!.id, piece, square });
      } else {
        // more arrivals than departures = promotion or first appearance
        result.push({ id: nextId(), piece, square });
      }
    }
    // departed pieces with no matching arrival simply fall out of result —
    // AnimatePresence will fade them out as captures
  });
  return result;
}

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

  // monotonic counter for assigning stable piece ids
  const idCounter = React.useRef(0);
  const nextId = React.useCallback(() => String(idCounter.current++), []);

  // tracked pieces — stable identity list updated on every fen / orientation change
  const [tracked, setTracked] = React.useState<TrackedPiece[]>(() => {
    const pieces: TrackedPiece[] = [];
    parseFenPieces(fen).forEach((piece, sq) => {
      pieces.push({ id: String(idCounter.current++), piece, square: sq });
    });
    return pieces;
  });

  // reconcile on fen change: reuse ids for moved pieces, drop captured, add new
  React.useEffect(() => {
    setTracked((prev) => reconcile(prev, parseFenPieces(fen), nextId));
  }, [fen, nextId]);

  // reset (no animation) when orientation flips — pieces teleport to mirrored positions
  React.useEffect(() => {
    idCounter.current = 0;
    const pieces: TrackedPiece[] = [];
    parseFenPieces(fen).forEach((piece, sq) => {
      pieces.push({ id: String(idCounter.current++), piece, square: sq });
    });
    setTracked(pieces);
  }, [orientation]); // eslint-disable-line react-hooks/exhaustive-deps

  const arrow = bestMove ? parseUci(bestMove) : null;
  const isInteractive = !!onSquareClick;

  return (
    <div className={className}>
      <div className="relative w-full max-w-[560px] aspect-square rounded-2xl border bg-card shadow-sm overflow-hidden">

        {/* grid: square backgrounds, coord labels, and click targets — no pieces here */}
        <div className="grid grid-cols-8 h-full">
          {squares.map((square) => {
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
                  'relative flex items-center justify-center aspect-square',
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
              </div>
            );
          })}
        </div>

        {/* animated piece layer — absolutely positioned over the grid.
            each piece is a motion.span with a stable key (its tracked id).
            framer-motion's layout prop detects left/top changes and animates
            the transition using FLIP (first-last-invert-play). */}
        <AnimatePresence initial={false}>
          {tracked.map(({ id, piece, square }) => {
            const { left, top } = squareToPos(square, orientation);
            return (
              <motion.span
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.75 }}
                transition={{
                  layout: { duration: 0.16, ease: 'easeOut' },
                  opacity: { duration: 0.1 },
                  scale: { duration: 0.1 },
                }}
                className="absolute w-[12.5%] h-[12.5%] flex items-center justify-center leading-none select-none pointer-events-none"
                style={{
                  left,
                  top,
                  fontSize: 'clamp(22px, 5vw, 44px)',
                  fontFamily:
                    'ui-sans-serif, system-ui, -apple-system, Segoe UI Symbol, Apple Color Emoji, Noto Color Emoji',
                  color: piece.color === 'w' ? '#ffffff' : '#1a1a1a',
                  textShadow:
                    piece.color === 'w'
                      ? '0 0 2px #000, 0 1px 3px rgba(0,0,0,0.9)'
                      : '0 0 2px rgba(255,255,255,0.9), 0 1px 3px rgba(255,255,255,0.6)',
                }}
              >
                {pieceToUnicode(piece)}
              </motion.span>
            );
          })}
        </AnimatePresence>

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
              <rect x={Math.floor(from.x)} y={Math.floor(from.y)} width={1} height={1} fill="rgba(0,200,80,0.25)" />
              <rect x={Math.floor(to.x)} y={Math.floor(to.y)} width={1} height={1} fill="rgba(0,200,80,0.35)" />
              <line
                x1={from.x} y1={from.y}
                x2={tip.x} y2={tip.y}
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
