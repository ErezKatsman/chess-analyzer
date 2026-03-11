'use client';

// ImprovementStory — narrative header for the Progress tab.
// shows training score trajectory + current focus error rate trend.
// all data derived from existing props — no new DB reads, no AI calls.

import type { CoachingFocus } from '@/lib/interfaces/analysis';
import type { ProgressPoint } from '@/lib/analysis/progressUtils';

// returns first and last training scores across all analyzed games, sorted by date.
// needs at least 2 points to produce a range; single-game players get the current only.
function scoreRange(points: ProgressPoint[]): { first: number; last: number } | null {
  const sorted = [...points].sort((a, b) => a.date - b.date);
  if (sorted.length < 2) return null;
  return {
    first: Math.round(sorted[0].trainingScore),
    last:  Math.round(sorted.at(-1)!.trainingScore),
  };
}

const TREND_COLOR: Record<string, string> = {
  improving:        'text-emerald-500',
  holding:          'text-amber-500',
  'needs-attention': 'text-red-500',
};

const TREND_LABEL: Record<string, string> = {
  improving:        '↓ improving',
  holding:          '→ holding steady',
  'needs-attention': '↑ needs attention',
};

interface Props {
  coachingFocus: CoachingFocus | null;
  progressPoints: ProgressPoint[];
}

export function ImprovementStory({ coachingFocus, progressPoints }: Props) {
  // no analyzed games yet
  if (progressPoints.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground text-center py-2">
          analyze games to see your improvement story.
        </p>
      </div>
    );
  }

  const range  = scoreRange(progressPoints);
  const latest = Math.round([...progressPoints].sort((a, b) => b.date - a.date)[0].trainingScore);
  const delta  = range ? range.last - range.first : null;

  // coaching focus fields — null when totalAnalyzed < 3 or no patterns
  const focus = coachingFocus?.hasEnoughData ? coachingFocus.primary : null;
  const trend = coachingFocus?.trend ?? null;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-5">
        your improvement
      </p>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">

        {/* ── column 1: training score ── */}
        <div className="space-y-1 shrink-0">
          <p className="text-xs text-muted-foreground">training score</p>
          {range ? (
            <p className="text-3xl font-bold tabular-nums leading-none">
              {range.first}
              <span className="mx-2 text-xl text-muted-foreground font-normal">→</span>
              {range.last}
            </p>
          ) : (
            <p className="text-3xl font-bold tabular-nums leading-none">{latest}</p>
          )}
          {delta !== null && delta !== 0 && progressPoints.length >= 5 && (
            <p className={`text-xs font-medium ${delta > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
              {delta > 0 ? '+' : ''}{delta} since you started
            </p>
          )}
          {delta === 0 && range && (
            <p className="text-xs text-muted-foreground">holding steady</p>
          )}
        </div>

        {/* ── column 2: focus error rate (when trend is available) ── */}
        {focus && trend && (
          <div className="space-y-1 shrink-0">
            <p className="text-xs text-muted-foreground">focus errors per game</p>
            <p className="text-3xl font-bold tabular-nums leading-none">
              {trend.previousRate.toFixed(1)}
              <span className="mx-2 text-xl text-muted-foreground font-normal">→</span>
              {trend.recentRate.toFixed(1)}
            </p>
            <p className={`text-xs font-medium ${TREND_COLOR[trend.trend] ?? ''}`}>
              {TREND_LABEL[trend.trend]}
            </p>
          </div>
        )}

        {/* ── column 2 alt: focus label without trend (3–9 analyzed games) ── */}
        {focus && !trend && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">coaching focus</p>
            <p className="text-sm font-medium">{focus.behavioralLabel}</p>
            <p className="text-xs text-muted-foreground">
              analyze 10+ games to track your error rate on this focus.
            </p>
          </div>
        )}

        {/* ── column 2 alt: no focus yet (< 3 games) ── */}
        {!focus && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">coaching focus</p>
            <p className="text-sm text-muted-foreground">
              analyze at least 3 games to unlock focus tracking.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
