'use client';

// shown once after first-session analysis completes.
// presents the user's top weakness, coaching hint, 3 drill cards, and CTAs.
// dismissed via sessionStorage flag — returning users never see this.

import * as React from 'react';
import Link from 'next/link';
import type { PatternSummaryEntry } from '@/lib/analysis/patternSummary';
import type { GeneratedDrill } from '@/app/api/drills/generated/route';

export const COACHING_SUMMARY_KEY = 'chess_coaching_summary';

interface Props {
  topPattern: PatternSummaryEntry;
  totalAnalyzedGames: number;
  recentTrainingScore: number | null;
  onDismiss: () => void;
}

type DrillsState =
  | { status: 'loading' }
  | { status: 'done'; drills: GeneratedDrill[] }
  | { status: 'empty' };

export function CoachingSummary({ topPattern, totalAnalyzedGames, recentTrainingScore, onDismiss }: Props) {
  const [drillsState, setDrillsState] = React.useState<DrillsState>({ status: 'loading' });

  React.useEffect(() => {
    fetch('/api/drills/generated')
      .then(r => r.json())
      .then((data: { drills?: GeneratedDrill[] }) => {
        const drills = data.drills ?? [];
        setDrillsState(
          drills.length > 0
            ? { status: 'done', drills: drills.slice(0, 3) }
            : { status: 'empty' },
        );
      })
      .catch(() => setDrillsState({ status: 'empty' }));
  }, []);

  const weaknessLabel = topPattern.tag.replace(/-/g, ' ');

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-4">
      {/* weakness summary card */}
      <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          your coaching plan
        </p>

        <div className="flex items-start gap-4">
          <div className="text-4xl select-none shrink-0">🎯</div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold">
              top weakness:{' '}
              <span className="capitalize">{weaknessLabel}</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {topPattern.topHint}
            </p>
            <p className="text-xs text-muted-foreground">
              spotted in {topPattern.gameCount} of {totalAnalyzedGames} analyzed game
              {totalAnalyzedGames !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {recentTrainingScore !== null && (
          <div className="border-t pt-3">
            <p className="text-sm text-muted-foreground">
              starting training score:{' '}
              <span className="font-bold text-foreground">
                {Math.round(recentTrainingScore)}
              </span>
              <span className="ml-1.5 text-xs">
                — come back after drilling to watch it rise
              </span>
            </p>
          </div>
        )}
      </div>

      {/* drill preview */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">your first drills</h3>

        {drillsState.status === 'loading' && (
          <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground animate-pulse">
            loading drills…
          </div>
        )}

        {drillsState.status === 'empty' && (
          <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
            no drills ready yet — check back after more games are analyzed.
          </div>
        )}

        {drillsState.status === 'done' &&
          drillsState.drills.map((drill, i) => (
            <div
              key={`${drill.gameUuid}-${drill.moveNumber}-${drill.side}`}
              className="rounded-xl border bg-card p-4 flex items-start gap-3"
            >
              <span className="shrink-0 text-xs font-bold text-muted-foreground bg-muted rounded-full w-6 h-6 flex items-center justify-center">
                {i + 1}
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{drill.oneLineReason}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  move {drill.moveNumber} · {drill.side}
                </p>
              </div>
            </div>
          ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/drills"
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          practice now →
        </Link>
        <button
          onClick={onDismiss}
          className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl border bg-card text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          go to full dashboard
        </button>
      </div>
    </div>
  );
}
