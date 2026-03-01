'use client';

import { ChessBoard } from '@/components/ChessBoard';
import { Button } from '@/components/ui/button';
import type { DrillProps } from '@/components/drill-panel/types';
import { useDrillState } from '@/components/drill-panel/useDrillState';

export type { DrillProps };

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
  gameUuid,
  onNext,
  onExit,
}: DrillProps) {
  const {
    selected,
    status,
    hint,
    displayFen,
    animating,
    blunderFlashing,
    isDone,
    boardBusy,
    blunderSan,
    evalLossText,
    replayBlunder,
    handleSquareClick,
    reveal,
    reset,
  } = useDrillState({ fen, bestMove, blunderMove, side, moveNumber, gameUuid }, evalBefore, evalAfter);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,560px),1fr] items-start">
      {/* left: board */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              drill {drillIndex + 1} of {totalDrills}
            </p>
            <p className="font-semibold">
              move {moveNumber} · {side} to move
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onExit}>
            ← back
          </Button>
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
              className="pointer-events-none absolute inset-0 flex items-end justify-center rounded-lg bg-red-500/25 pb-3"
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
              className="pointer-events-none absolute inset-0 animate-pulse rounded-lg bg-red-500/20"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* right: task + feedback */}
      <div className="flex min-h-[200px] flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">your mistake</p>
          <p className="text-sm">{oneLineReason}</p>
          {evalLossText ? (
            <p className="mt-1 text-xs text-muted-foreground">{evalLossText}</p>
          ) : null}
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">task</p>
          <p className="text-sm font-medium">Find the best move for {side}.</p>
          {status === 'idle' && (
            <p className="mt-1 text-xs text-muted-foreground">
              click a piece, then a destination square.
            </p>
          )}
        </div>

        {status === 'wrong' && (
          <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 dark:border-orange-700 dark:bg-orange-950/30">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">{hint}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              one more attempt before the answer is shown.
            </p>
          </div>
        )}

        {status === 'correct' && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 dark:border-green-700 dark:bg-green-950/30">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              ✓ correct! well done.
            </p>
          </div>
        )}

        {status === 'revealed' && (
          <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-950/30">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              best move: {bestMove.slice(0, 2)} → {bestMove.slice(2, 4)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              the arrow shows the correct move on the board.
            </p>
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {/* show my blunder button — available any time blunderMove is known */}
          {blunderMove && (
            <Button variant="outline" size="sm" disabled={boardBusy} onClick={replayBlunder}>
              show my blunder{blunderSan ? ` (${blunderSan})` : ''}
            </Button>
          )}

          {!isDone && (
            <>
              <Button variant="outline" size="sm" onClick={reveal}>
                give up
              </Button>
              {status === 'wrong' && (
                <Button variant="outline" size="sm" onClick={reset}>
                  reset
                </Button>
              )}
            </>
          )}
          {isDone && onNext && (
            <Button size="sm" onClick={onNext}>
              next blunder →
            </Button>
          )}
          {isDone && (
            <Button variant="outline" size="sm" onClick={onExit}>
              back to game
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
