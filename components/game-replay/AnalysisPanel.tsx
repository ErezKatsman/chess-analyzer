'use client';

// components/game-replay/AnalysisPanel.tsx
// analysis tab content: stat pills, key errors with ai explanations, patterns detected

import { Button } from '@/components/ui/button';
import type { AnalysisState, BlunderExplanation } from './types';
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
};

export function AnalysisPanel({
  analysisState,
  drillCount,
  explanations,
  explanationsLoading,
  maxIndex,
  onSeek,
  onSeekAndPlay,
  onStartDrills,
}: AnalysisPanelProps) {
  return (
    <div className="mt-3 grid max-h-[calc(100vh-300px)] gap-3 overflow-y-auto">
      {analysisState.status === 'done' ? (
        <>
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
