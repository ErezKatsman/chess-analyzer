'use client';

// displays a compact progress check-in card on the Coach tab.
// only rendered when all gating conditions pass (computed in UserPageContent).
// no AI — all text is templated from real per-game error rate data.

export type ProgressData = {
  focusLabel: string;
  recentRate: number;      // errors per game, last 5 analyzed games (1 decimal)
  previousRate: number;    // errors per game, previous 5 analyzed games (1 decimal)
  trend: 'improving' | 'holding' | 'needs-attention';
  drillsCompleted: number; // drills solved in last 14 days; 0 = omit from display
};

const BADGE: Record<ProgressData['trend'], { icon: string; label: string; cls: string }> = {
  improving:         { icon: '↑', label: 'Improving',        cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  holding:           { icon: '→', label: 'Holding',          cls: 'bg-muted text-muted-foreground' },
  'needs-attention': { icon: '↓', label: 'Needs attention',  cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-500' },
};

function buildSentence(
  trend: ProgressData['trend'],
  label: string,
  prev: number,
  recent: number,
): string {
  if (trend === 'improving')
    return `Your ${label} errors dropped from ${prev} to ${recent} per game across your last 5 games.`;
  if (trend === 'needs-attention')
    return `Your ${label} errors increased from ${prev} to ${recent} per game in your last 5 games.`;
  return `Your ${label} error rate has stayed around ${recent} per game across your last 10 games.`;
}

export function CoachCheckIn({ progressData }: { progressData: ProgressData | null }) {
  if (!progressData) return null;

  const { focusLabel, recentRate, previousRate, trend, drillsCompleted } = progressData;
  const badge = BADGE[trend];

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
      {/* header: trend badge + focus label */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
          {badge.icon} {badge.label}
        </span>
        <span className="text-sm font-medium text-muted-foreground capitalize">{focusLabel}</span>
      </div>

      {/* error rate comparison: previous 5 → last 5 */}
      <div className="flex items-center gap-3">
        <div className="text-center min-w-[48px]">
          <p className="text-3xl font-bold tabular-nums leading-none">{previousRate}</p>
          <p className="text-xs text-muted-foreground mt-1">prev 5</p>
        </div>
        <span className="text-xl text-muted-foreground">→</span>
        <div className="text-center min-w-[48px]">
          <p className="text-3xl font-bold tabular-nums leading-none">{recentRate}</p>
          <p className="text-xs text-muted-foreground mt-1">last 5</p>
        </div>
        <p className="text-xs text-muted-foreground ml-1">errors / game</p>
      </div>

      {/* templated sentence */}
      <p className="text-sm text-muted-foreground">
        {buildSentence(trend, focusLabel, previousRate, recentRate)}
      </p>

      {/* drill count — omitted when zero */}
      {drillsCompleted > 0 && (
        <p className="text-xs text-muted-foreground border-t pt-3">
          {drillsCompleted} {drillsCompleted === 1 ? 'drill' : 'drills'} completed recently
        </p>
      )}
    </div>
  );
}
