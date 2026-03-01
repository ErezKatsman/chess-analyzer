'use client';

// per-month stats bar shown above the games table.
// computes wins / draws / losses + breakdown by time class from the games prop.
// pure client component — no fetching, all derived from props.

import * as React from 'react';
import type { IGame } from '@/lib/interfaces/games';

type Props = {
  games: IGame[];
  userName: string;
};

type TimeClassStats = {
  label: string;
  wins: number;
  draws: number;
  losses: number;
  total: number;
};

const TIME_CLASS_LABELS: Record<string, string> = {
  bullet: '🔴 bullet',
  blitz: '⚡ blitz',
  rapid: '🕐 rapid',
  daily: '📅 daily',
};

// tiny svg donut — three arcs for wins / draws / losses
function DonutChart({
  wins,
  draws,
  losses,
}: {
  wins: number;
  draws: number;
  losses: number;
}) {
  const total = wins + draws + losses;
  if (total === 0) return null;

  const size = 56;
  const r = 20;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const winFrac = wins / total;
  const drawFrac = draws / total;
  const lossFrac = losses / total;

  // arc lengths
  const winLen = winFrac * circumference;
  const drawLen = drawFrac * circumference;
  const lossLen = lossFrac * circumference;

  // each segment is a stroke-dasharray trick rotated around the circle
  const winOffset = 0;
  const drawOffset = winLen;
  const lossOffset = winLen + drawLen;

  // rotate so 12-o-clock is the start
  const rotate = -90;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {/* background track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-muted/30" />

      {/* losses (red) */}
      {lossLen > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={8}
          strokeDasharray={`${lossLen} ${circumference - lossLen}`}
          strokeDashoffset={-lossOffset}
          transform={`rotate(${rotate} ${cx} ${cy})`}
          className="text-red-500"
        />
      )}
      {/* draws (yellow) */}
      {drawLen > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={8}
          strokeDasharray={`${drawLen} ${circumference - drawLen}`}
          strokeDashoffset={-drawOffset}
          transform={`rotate(${rotate} ${cx} ${cy})`}
          className="text-yellow-400"
        />
      )}
      {/* wins (green) */}
      {winLen > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={8}
          strokeDasharray={`${winLen} ${circumference - winLen}`}
          strokeDashoffset={-winOffset}
          transform={`rotate(${rotate} ${cx} ${cy})`}
          className="text-green-500"
        />
      )}

      {/* center label — win % */}
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="10"
        fontWeight="600"
        className="fill-foreground"
      >
        {Math.round((wins / total) * 100)}%
      </text>
    </svg>
  );
}

export function StatsBar({ games, userName }: Props) {
  const stats = React.useMemo(() => {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    const byClass: Record<string, TimeClassStats> = {};

    for (const g of games) {
      // result from the perspective of the viewed user
      const w = g.isWon;
      const d = g.isDraw;
      const l = !w && !d;

      if (w) wins += 1;
      else if (d) draws += 1;
      else losses += 1;

      // per time-class breakdown
      const tc = g.timeClass || 'other';
      if (!byClass[tc]) {
        byClass[tc] = { label: TIME_CLASS_LABELS[tc] ?? tc, wins: 0, draws: 0, losses: 0, total: 0 };
      }
      const bucket = byClass[tc]!;
      bucket.total += 1;
      if (w) bucket.wins += 1;
      else if (d) bucket.draws += 1;
      else bucket.losses += 1;
    }

    return { wins, draws, losses, total: games.length, byClass };
  }, [games]);

  if (stats.total === 0) return null;

  const { wins, draws, losses, total, byClass } = stats;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        {userName} · this month
      </p>

      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        {/* donut + total */}
        <div className="flex items-center gap-3 shrink-0">
          <DonutChart wins={wins} draws={draws} losses={losses} />
          <div className="text-sm">
            <div className="font-semibold text-lg leading-tight">{total}</div>
            <div className="text-xs text-muted-foreground">games</div>
          </div>
        </div>

        {/* divider */}
        <div className="hidden sm:block h-12 w-px bg-border" />

        {/* W / D / L pills */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex flex-col items-center rounded-lg bg-green-500/10 px-4 py-2 min-w-[56px]">
            <span className="text-lg font-bold text-green-500">{wins}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">wins</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-yellow-400/10 px-4 py-2 min-w-[56px]">
            <span className="text-lg font-bold text-yellow-400">{draws}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">draws</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-red-500/10 px-4 py-2 min-w-[56px]">
            <span className="text-lg font-bold text-red-500">{losses}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">losses</span>
          </div>
        </div>

        {/* divider */}
        {Object.keys(byClass).length > 0 && (
          <div className="hidden sm:block h-12 w-px bg-border" />
        )}

        {/* time-class breakdown */}
        <div className="flex gap-3 flex-wrap">
          {Object.entries(byClass)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([tc, s]) => {
              const winRate = s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0;
              return (
                <div key={tc} className="flex flex-col rounded-lg border bg-muted/40 px-3 py-2 min-w-[72px]">
                  <span className="text-[11px] font-semibold">{s.label}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {s.total} games · {winRate}% W
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
