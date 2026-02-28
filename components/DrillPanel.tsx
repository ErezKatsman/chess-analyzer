'use client';

import * as React from 'react';
import { Chess, type Square as ChessSquare } from 'chess.js';
import { ChessBoard } from '@/components/ChessBoard';
import { Button } from '@/components/ui/button';

type DrillStatus = 'idle' | 'wrong' | 'revealed' | 'correct';

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

export type DrillProps = {
  fen: string;              // position before the blunder
  bestMove: string;         // uci e.g. "e2e4" — the engine's best move
  blunderMove?: string;     // uci of what was actually played in the game
  side: 'white' | 'black';
  moveNumber: number;
  oneLineReason: string;
  evalBefore: number | null;
  evalAfter: number | null;
  drillIndex: number;       // 0-based, for "drill 1 of N" display
  totalDrills: number;
  onNext?: () => void;
  onExit: () => void;
};

export function DrillPanel({
  fen,
  bestMove,
  blunderMove,
  side,
  moveNumber,
  oneLineReason,
  evalBefore,
  evalAfter,
  drillIndex,
  totalDrills,
  onNext,
  onExit,
}: DrillProps) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<DrillStatus>('idle');
  const [attempts, setAttempts] = React.useState(0);
  const [hint, setHint] = React.useState('');
  // displayFen changes when the player makes a move, reveals the answer, or replays the blunder
  const [displayFen, setDisplayFen] = React.useState(fen);
  // true while the wrong-move flash animation is running
  const [animating, setAnimating] = React.useState(false);
  // true while the "show my blunder" replay is flashing on the board
  const [blunderFlashing, setBlunderFlashing] = React.useState(false);

  const chess = React.useMemo(() => new Chess(fen), [fen]);
  const playerColor = side === 'white' ? 'w' : 'b';
  const isDone = status === 'correct' || status === 'revealed';
  const boardBusy = animating || blunderFlashing;

  // compute the san of the blunder move for the button label and overlay
  const blunderSan = React.useMemo(() => {
    if (!blunderMove) return null;
    try {
      const tmp = new Chess(fen);
      const result = tmp.move({
        from: blunderMove.slice(0, 2),
        to: blunderMove.slice(2, 4),
        promotion: blunderMove[4] ?? 'q',
      });
      return result.san;
    } catch {
      return null;
    }
  }, [fen, blunderMove]);

  // apply a uci move on top of the original fen and return the resulting fen
  const applyMove = (uci: string): string => {
    const tmp = new Chess(fen);
    tmp.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' });
    return tmp.fen();
  };

  // show the blunder move on the board for 1.2s, then snap back
  const replayBlunder = () => {
    if (!blunderMove || boardBusy) return;
    try {
      const postBlunderFen = applyMove(blunderMove);
      setBlunderFlashing(true);
      setDisplayFen(postBlunderFen);
      setTimeout(() => {
        // snap back to the position the drill is on (fen if idle, else whatever is showing)
        setDisplayFen(isDone ? applyMove(status === 'revealed' ? bestMove : blunderMove) : fen);
        setBlunderFlashing(false);
      }, 1200);
    } catch {
      // invalid move — ignore
    }
  };

  const evaluateAttempt = (uci: string) => {
    // silently ignore illegal moves
    const legal = chess.moves({ verbose: true });
    if (!legal.some((m) => m.from + m.to === uci)) return;

    const isCorrect = uci === bestMove.slice(0, 4);

    if (isCorrect) {
      setDisplayFen(applyMove(uci));
      setStatus('correct');
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    // flash the wrong move on the board, then snap back / reveal
    setAnimating(true);
    setDisplayFen(applyMove(uci));

    setTimeout(() => {
      setAnimating(false);

      if (nextAttempts >= 2) {
        // second wrong attempt — reveal best move with arrow
        setDisplayFen(applyMove(bestMove));
        setStatus('revealed');
        return;
      }

      // first wrong attempt — snap back and show hint
      setDisplayFen(fen);
      const fromSq = bestMove.slice(0, 2) as ChessSquare;
      const piece = chess.get(fromSq);
      const pieceName = piece ? (PIECE_NAMES[piece.type] ?? 'piece') : 'piece';
      setHint(`Not quite. Think about moving your ${pieceName}.`);
      setStatus('wrong');
    }, 500);
  };

  const handleSquareClick = (square: string) => {
    if (isDone || boardBusy) return;

    const piece = chess.get(square as ChessSquare);

    // first click: select a piece of the right color
    if (!selected) {
      if (piece?.color === playerColor) setSelected(square);
      return;
    }

    // re-select own piece
    if (piece?.color === playerColor) {
      setSelected(square);
      return;
    }

    // deselect on same square
    if (selected === square) {
      setSelected(null);
      return;
    }

    // attempt move
    const uci = selected + square;
    setSelected(null);
    evaluateAttempt(uci);
  };

  const reveal = () => {
    setDisplayFen(applyMove(bestMove));
    setStatus('revealed');
  };

  const reset = () => {
    setSelected(null);
    setStatus('idle');
    setAttempts(0);
    setHint('');
    setDisplayFen(fen);
  };

  // compute eval loss in pawn units for display
  const evalLossText = React.useMemo(() => {
    if (evalBefore === null || evalAfter === null) return null;
    const sign = side === 'white' ? 1 : -1;
    const loss = sign * (evalBefore - evalAfter);
    return `${(loss / 100).toFixed(1)} pawns lost`;
  }, [evalBefore, evalAfter, side]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,560px),1fr] items-start">
      {/* left: board */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">drill {drillIndex + 1} of {totalDrills}</p>
            <p className="font-semibold">move {moveNumber} · {side} to move</p>
          </div>
          <Button variant="outline" size="sm" onClick={onExit}>← back</Button>
        </div>

        {/* board with overlays */}
        <div className="relative">
          <ChessBoard
            fen={displayFen}
            orientation={side}
            selectedSquare={selected}
            bestMove={status === 'revealed' ? bestMove : null}
            onSquareClick={isDone || boardBusy ? undefined : handleSquareClick}
          />

          {/* blunder replay overlay — shown when user clicks "show my blunder" */}
          {blunderFlashing && (
            <div
              className="absolute inset-0 rounded-lg bg-red-500/25 pointer-events-none flex items-end justify-center pb-3"
              aria-hidden="true"
            >
              <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow">
                ✗ {blunderSan ?? 'your move'}
              </span>
            </div>
          )}

          {/* wrong-attempt flash overlay */}
          {animating && (
            <div
              className="absolute inset-0 rounded-lg bg-red-500/20 pointer-events-none animate-pulse"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* right: task + feedback */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm flex flex-col gap-4 min-h-[200px]">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">your mistake</p>
          <p className="text-sm">{oneLineReason}</p>
          {evalLossText ? <p className="text-xs text-muted-foreground mt-1">{evalLossText}</p> : null}
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1">task</p>
          <p className="text-sm font-medium">Find the best move for {side}.</p>
          {status === 'idle' && (
            <p className="text-xs text-muted-foreground mt-1">click a piece, then a destination square.</p>
          )}
        </div>

        {status === 'wrong' && (
          <div className="rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 p-3">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">{hint}</p>
            <p className="text-xs text-muted-foreground mt-1">one more attempt before the answer is shown.</p>
          </div>
        )}

        {status === 'correct' && (
          <div className="rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 p-3">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">✓ correct! well done.</p>
          </div>
        )}

        {status === 'revealed' && (
          <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-3">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              best move: {bestMove.slice(0, 2)} → {bestMove.slice(2, 4)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">the arrow shows the correct move on the board.</p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap mt-auto pt-2">
          {/* show my blunder button — available any time blunderMove is known */}
          {blunderMove && (
            <Button
              variant="outline"
              size="sm"
              disabled={boardBusy}
              onClick={replayBlunder}
            >
              show my blunder{blunderSan ? ` (${blunderSan})` : ''}
            </Button>
          )}

          {!isDone && (
            <>
              <Button variant="outline" size="sm" onClick={reveal}>give up</Button>
              {status === 'wrong' && <Button variant="outline" size="sm" onClick={reset}>reset</Button>}
            </>
          )}
          {isDone && onNext && <Button size="sm" onClick={onNext}>next blunder →</Button>}
          {isDone && <Button variant="outline" size="sm" onClick={onExit}>back to game</Button>}
        </div>
      </div>
    </div>
  );
}
