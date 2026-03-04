'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Dot,
  ReferenceLine,
} from 'recharts';
import type { ProgressPoint } from '@/lib/analysis/progressUtils';

interface Props {
  data: ProgressPoint[];
  drillMarkers?: number[]; // unix timestamps (day-level) when user practiced drills
}

const RESULT_COLOR: Record<string, string> = {
  win: '#34d399',
  loss: '#f87171',
  draw: '#94a3b8',
};

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// custom dot colored by game result
function AccuracyDot(props: {
  cx?: number;
  cy?: number;
  payload?: ProgressPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return <Dot cx={cx} cy={cy} r={4} fill={RESULT_COLOR[payload.result]} stroke="transparent" />;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ProgressPoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;

  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md space-y-1">
      <div className="font-medium">{formatDate(point.date)}</div>
      <div className="flex gap-3">
        <span>accuracy <span className="font-semibold text-foreground">{point.accuracy}%</span></span>
        {point.rating != null && (
          <span>rating <span className="font-semibold text-foreground">{point.rating}</span></span>
        )}
      </div>
      <div className="flex gap-3 text-muted-foreground">
        <span>{point.blunders} blunders</span>
        <span>{point.mistakes} mistakes</span>
      </div>
      <div
        className="capitalize font-medium"
        style={{ color: RESULT_COLOR[point.result] }}
      >
        {point.result}
      </div>
    </div>
  );
}

export function ProgressChart({ data, drillMarkers = [] }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        analyze games to see your progress
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.date - b.date);
  const hasRating = sorted.some((p) => p.rating != null);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={sorted} margin={{ top: 8, right: hasRating ? 48 : 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        {/* left axis — accuracy */}
        <YAxis
          yAxisId="acc"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
          width={36}
        />
        {/* right axis — rating (only when we have data) */}
        {hasRating && (
          <YAxis
            yAxisId="rating"
            orientation="right"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
        )}
        {/* drill practice markers — amber dashed vertical lines */}
        {drillMarkers.map(dayTs => (
          <ReferenceLine
            key={dayTs}
            x={dayTs}
            yAxisId="acc"
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="3 3"
            label={{ value: '⚡', position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }}
          />
        ))}
        <Tooltip content={<CustomTooltip />} />
        <Line
          yAxisId="acc"
          type="monotone"
          dataKey="accuracy"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={<AccuracyDot />}
          activeDot={{ r: 6 }}
          isAnimationActive={false}
        />
        {hasRating && (
          <Line
            yAxisId="rating"
            type="monotone"
            dataKey="rating"
            stroke="#818cf8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
