'use client';

import { LineChart, Line, ResponsiveContainer, Dot } from 'recharts';
import type { ProgressPoint } from '@/lib/analysis/progressUtils';

interface Props {
  progressPoints: ProgressPoint[];
}

const RESULT_COLOR: Record<string, string> = {
  win: '#34d399',
  loss: '#f87171',
  draw: '#94a3b8',
};

function RatingDot(props: { cx?: number; cy?: number; payload?: ProgressPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return <Dot cx={cx} cy={cy} r={3.5} fill={RESULT_COLOR[payload.result]} stroke="transparent" />;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RatingHeroCard({ progressPoints }: Props) {
  const withRating = progressPoints.filter(p => p.rating != null);
  const sorted = [...withRating].sort((a, b) => a.date - b.date);

  const currentRating = sorted.at(-1)?.rating ?? null;
  const firstRating = sorted.at(0)?.rating ?? null;
  const delta = currentRating != null && firstRating != null ? currentRating - firstRating : null;
  const lastDate = sorted.at(-1)?.date;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">current rating</p>
          <div className="flex items-baseline gap-3">
            {currentRating != null ? (
              <span className="text-4xl font-bold tracking-tight">{currentRating}</span>
            ) : (
              <span className="text-2xl text-muted-foreground">—</span>
            )}
            {delta != null && delta !== 0 && (
              <span className={`text-sm font-semibold ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {delta > 0 ? '+' : ''}{delta}
              </span>
            )}
          </div>
          {lastDate && (
            <p className="text-xs text-muted-foreground mt-1">
              {progressPoints.length} analyzed game{progressPoints.length !== 1 ? 's' : ''} · last: {formatDate(lastDate)}
            </p>
          )}
        </div>
      </div>

      {/* rating sparkline */}
      {sorted.length >= 2 ? (
        <ResponsiveContainer width="100%" height={72}>
          <LineChart data={sorted} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <Line
              type="monotone"
              dataKey="rating"
              stroke="#818cf8"
              strokeWidth={1.5}
              dot={<RatingDot />}
              isAnimationActive={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-muted-foreground">analyze more games to see your rating trend.</p>
      )}
    </div>
  );
}
