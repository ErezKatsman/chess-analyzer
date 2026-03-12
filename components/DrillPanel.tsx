'use client';

import { useState } from 'react';
import { ChessBoard } from '@/components/ChessBoard';
import { Button } from '@/components/ui/button';
import type { DrillProps } from '@/components/drill-panel/types';
import { useDrillState } from '@/components/drill-panel/useDrillState';
import { DRILL_NOTICE_CUE, DRILL_HABIT, getDrillSpecificCue } from '@/lib/analysis/drillContent';

// one-sentence coach framing based on position context before the blunder
function getSetupFraming(evalBefore: number | null): string {
  if (evalBefore === null) return 'Here is the position just before your mistake.';
  if (evalBefore > 150) return 'You were winning when this happened — an extra moment of checking would have kept that advantage.';
  if (evalBefore < -150) return 'You were defending a difficult position — but this mistake made recovery even harder.';
  return 'The game was level when this happened — one unguarded piece was all it took to tip it.';
}

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
  patternTag,
  onNext,
  onExit,
}: DrillProps) {
  const [setupDismissed, setSetupDismissed] = useState(false);
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

  // setup phase — show what happened before the drill starts
  if (!setupDismissed) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(320px,560px),1fr] items-start">
        {/* left: board — visible but not interactive */}
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
          <div className="pointer-events-none opacity-80">
            <ChessBoard
              fen={displayFen}
              orientation={side}
              selectedSquare={null}
              bestMove={null}
              onSquareClick={undefined}
            />
          </div>
          {/* show blunder button — lets user see what they played */}
          {blunderMove && (
            <div className="mt-3">
              <Button variant="outline" size="sm" disabled={boardBusy} onClick={replayBlunder} className="w-full">
                show what I played{blunderSan ? ` (${blunderSan})` : ''}
              </Button>
            </div>
          )}
        </div>

        {/* right: coach setup card */}
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              what happened
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {getSetupFraming(evalBefore)}
            </p>
            <p className="text-base font-medium leading-snug">{oneLineReason}</p>
            {evalLossText && (
              <p className="mt-1 text-xs text-muted-foreground">{evalLossText}</p>
            )}
          </div>

          {patternTag && (
            <div className="rounded-lg border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">
                what to look for
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {getDrillSpecificCue(oneLineReason, patternTag, evalBefore)}
              </p>
            </div>
          )}

          <div className="mt-auto pt-2">
            <Button className="w-full" onClick={() => setSetupDismissed(true)}>
              Ready — find the best move →
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

        {/* pre-drill notice cue — visible while the drill is still active (not yet done) */}
        {!isDone && patternTag && DRILL_NOTICE_CUE[patternTag] && (
          <div className="rounded-lg border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">
              before you move
            </p>
            <p className="text-sm text-amber-900 dark:text-amber-200">
              {DRILL_NOTICE_CUE[patternTag]}
            </p>
          </div>
        )}

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
          <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-950/30 space-y-3">
            {/* answer */}
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-0.5">
                best move
              </p>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {bestMove.slice(0, 2)} → {bestMove.slice(2, 4)}
              </p>
              <p className="text-xs text-muted-foreground">shown with an arrow on the board.</p>
            </div>

            {/* correction card — only when a pattern tag is available */}
            {patternTag && DRILL_NOTICE_CUE[patternTag] && (
              <div className="space-y-2.5 border-t border-blue-200 dark:border-blue-800 pt-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                    what to look for next time
                  </p>
                  <p className="text-sm">{DRILL_NOTICE_CUE[patternTag]}</p>
                </div>
                {DRILL_HABIT[patternTag] && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                      the habit
                    </p>
                    <p className="text-sm">{DRILL_HABIT[patternTag]}</p>
                  </div>
                )}
              </div>
            )}
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
