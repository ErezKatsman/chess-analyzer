'use client';

// components/game-replay/AnalysisPanel.tsx
// analysis tab content: stat pills, key errors with ai explanations, patterns detected

import { Button } from '@/components/ui/button';
import type { AnalysisState, BlunderExplanation, TurningPoint } from './types';
import { tpBadgeClass, tpSymbol, patternTagClass } from './utils';

type AnalysisPanelProps = {
  analysisState: AnalysisState;
  // number of drillable blunders — drives the "practice N blunders" button
  drillCount: number;
  explanations: Map<string, BlunderExplanation>;
  explanationsLoading: boolean;
  maxIndex: number;
  onSeek: (ply: number) => void;
  // seek to plyBefore then animate the blunder move (plyBefore + 1)
  onSeekAndPlay: (plyBefore: number) => void;
  onStartDrills: () => void;
  // whose game we are viewing — determines narrative framing
  playerSide: 'white' | 'black';
  // accuracy % per side — null until analysis runs
  accuracy?: { player: number; opponent: number } | null;
};

// ── game narrative ──────────────────────────────────────────────────────────
// produces a 1-2 sentence plain-english summary of the game arc

function buildNarrative(
  turningPoints: TurningPoint[],
  playerSide: 'white' | 'black',
): string {
  const playerBlunders = turningPoints.filter(
    (tp) => tp.side === playerSide && tp.type === 'blunder',
  );
  const opponentBlunders = turningPoints.filter(
    (tp) => tp.side !== playerSide && tp.type === 'blunder',
  );

  if (turningPoints.length === 0) return 'clean game — no major errors detected.';

  const firstBlunder = turningPoints.find(
    (tp) => tp.type === 'blunder' && tp.side === playerSide,
  );

  if (playerBlunders.length === 0) {
    return opponentBlunders.length > 0
      ? `you played a clean game — your opponent made ${opponentBlunders.length} blunder${opponentBlunders.length > 1 ? 's' : ''}.`
      : 'you played a solid game with no blunders.';
  }

  const pivot = firstBlunder
    ? `the key moment was move ${firstBlunder.moveNumber}`
    : null;

  const total =
    playerBlunders.length === 1
      ? '1 critical blunder'
      : `${playerBlunders.length} blunders`;

  return pivot
    ? `you made ${total} — ${pivot} changed the course of the game.`
    : `you made ${total} that shifted the advantage.`;
}

export function AnalysisPanel({
  analysisState,
  drillCount,
  explanations,
  explanationsLoading,
  maxIndex,
  onSeek,
  onSeekAndPlay,
  onStartDrills,
  playerSide,
  accuracy,
}: AnalysisPanelProps) {
  return (
    <div className="mt-3 grid max-h-[calc(100vh-300px)] gap-3 overflow-y-auto">
      {analysisState.status === 'done' ? (
        <>
          {/* game narrative — one-line story of the game */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-foreground">
            {buildNarrative(analysisState.result.turningPoints, playerSide)}
          </div>

          {/* accuracy scores — the headline metric players care about most */}
          {accuracy ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-background px-3 py-2 text-center">
                <div
                  className={[
                    'text-2xl font-bold tabular-nums',
                    accuracy.player >= 85
                      ? 'text-green-600 dark:text-green-400'
                      : accuracy.player >= 70
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-500',
                  ].join(' ')}
                >
                  {accuracy.player}%
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">your accuracy</div>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2 text-center">
                <div
                  className={[
                    'text-2xl font-bold tabular-nums',
                    accuracy.opponent >= 85
                      ? 'text-green-600 dark:text-green-400'
                      : accuracy.opponent >= 70
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-500',
                  ].join(' ')}
                >
                  {accuracy.opponent}%
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">opponent accuracy</div>
              </div>
            </div>
          ) : null}

          {/* stat pills — colored pill per category for quick scanning */}
          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const blunders = analysisState.result.turningPoints.filter(
                (t) => t.type === 'blunder',
              ).length;
              const mistakes = analysisState.result.turningPoints.filter(
                (t) => t.type === 'mistake',
              ).length;
              const inaccuracies = analysisState.result.turningPoints.filter(
                (t) => t.type === 'inaccuracy',
              ).length;
              return (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500">
                    <span className="text-sm font-bold">{blunders}</span> blunder
                    {blunders !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/10 px-2.5 py-1 text-xs font-semibold text-orange-400">
                    <span className="text-sm font-bold">{mistakes}</span> mistake
                    {mistakes !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-600 dark:text-yellow-500">
                    <span className="text-sm font-bold">{inaccuracies}</span> inaccurac
                    {inaccuracies !== 1 ? 'ies' : 'y'}
                  </span>
                  {drillCount > 0 && (
                    <Button type="button" size="sm" className="ml-auto" onClick={onStartDrills}>
                      practice {drillCount} blunder{drillCount > 1 ? 's' : ''}
                    </Button>
                  )}
                </>
              );
            })()}
          </div>

          {/* blunder + mistake list with ai explanations */}
          {analysisState.result.turningPoints.filter(
            (tp) => tp.type === 'blunder' || tp.type === 'mistake',
          ).length > 0 ? (
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span>key errors</span>
                {explanationsLoading ? (
                  <span className="animate-pulse text-muted-foreground/60">
                    — ai coach thinking…
                  </span>
                ) : null}
              </div>
              {analysisState.result.turningPoints
                .filter((tp) => tp.type === 'blunder' || tp.type === 'mistake')
                .map((tp) => {
                  const expId = `${tp.moveNumber}-${tp.side}`;
                  const exp = explanations.get(expId);
                  return (
                    <div
                      key={expId}
                      className={[
                        'cursor-pointer rounded-lg border bg-background p-3 text-sm transition-colors hover:bg-muted/30',
                        // colored left border for instant severity scan
                        'border-l-2',
                        tp.type === 'blunder' ? 'border-l-red-500' : 'border-l-orange-400',
                      ].join(' ')}
                      onClick={() => {
                        // ply of the position before this error (0-indexed into fenArr)
                        const ply =
                          tp.side === 'white'
                            ? (tp.moveNumber - 1) * 2
                            : (tp.moveNumber - 1) * 2 + 1;
                        // seek to pre-move position then animate the blunder move
                        onSeekAndPlay(Math.min(maxIndex - 1, ply));
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className={tpBadgeClass(tp.type)}>
                          {tpSymbol(tp.type)} move {tp.moveNumber} ({tp.side})
                        </span>
                      </div>
                      {exp ? (
                        <>
                          <p className="mt-1.5 text-sm leading-snug text-foreground">
                            {exp.explanation}
                          </p>
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            💡 {exp.rule}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {explanationsLoading ? (
                            <span className="animate-pulse">generating explanation…</span>
                          ) : (
                            tp.oneLineReason
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : null}

          {/* patterns detected */}
          {analysisState.result.patterns.length > 0 ? (
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-muted-foreground">patterns detected</div>
              {analysisState.result.patterns.map((p) => (
                <div key={p.tag} className="rounded-lg border bg-background p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        patternTagClass(p.tag),
                      ].join(' ')}
                    >
                      {p.tag}
                    </span>
                    <span className="font-medium">{p.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.coachingHint}</p>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        /* analysis not yet run */
        <div className="py-12 text-center text-sm text-muted-foreground">
          run analysis to see insights
        </div>
      )}
    </div>
  );
}
