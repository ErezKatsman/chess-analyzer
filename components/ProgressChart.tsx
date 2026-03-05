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

// ChartPoint covers all games (rating always present) + analyzed games (accuracy optional)
export type ChartPoint = {
  date: number;       // unix timestamp seconds
  rating: number;     // user rating at game time — available for all games
  result: 'win' | 'loss' | 'draw';
  accuracy?: number;  // only present for analyzed games
  blunders?: number;
  mistakes?: number;
};

interface Props {
  data: ChartPoint[];
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

// colored dot on the rating line — shows for every game
function RatingDot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return <Dot cx={cx} cy={cy} r={3} fill={RESULT_COLOR[payload.result]} stroke="transparent" />;
}

// colored dot on the accuracy line — only renders when accuracy is present
function AccuracyDot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload || payload.accuracy == null) return null;
  return <Dot cx={cx} cy={cy} r={5} fill={RESULT_COLOR[payload.result]} stroke="transparent" />;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;

  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md space-y-1">
      <div className="font-medium">{formatDate(point.date)}</div>
      <div className="flex gap-3">
        <span>rating <span className="font-semibold text-foreground">{point.rating}</span></span>
        {point.accuracy != null && (
          <span>accuracy <span className="font-semibold text-foreground">{point.accuracy}%</span></span>
        )}
      </div>
      {point.blunders != null && (
        <div className="flex gap-3 text-muted-foreground">
          <span>{point.blunders} blunders</span>
          <span>{point.mistakes} mistakes</span>
        </div>
      )}
      <div className="capitalize font-medium" style={{ color: RESULT_COLOR[point.result] }}>
        {point.result}
      </div>
    </div>
  );
}

export function ProgressChart({ data, drillMarkers = [] }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        no rated games found for this period
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.date - b.date);
  const hasAccuracy = sorted.some(p => p.accuracy != null);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={sorted} margin={{ top: 8, right: 48, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        {/* left axis — accuracy (only analyzed games) */}
        {hasAccuracy && (
          <YAxis
            yAxisId="acc"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
            width={36}
          />
        )}
        {/* right axis — rating (all games) */}
        <YAxis
          yAxisId="rating"
          orientation="right"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        {/* drill practice markers */}
        {drillMarkers.map(dayTs => (
          <ReferenceLine
            key={dayTs}
            x={dayTs}
            yAxisId="rating"
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="3 3"
            label={{ value: '⚡', position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }}
          />
        ))}
        <Tooltip content={<CustomTooltip />} />
        {/* rating line — solid, all games, dots colored by result */}
        <Line
          yAxisId="rating"
          type="monotone"
          dataKey="rating"
          stroke="#818cf8"
          strokeWidth={1.5}
          dot={<RatingDot />}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
        {/* accuracy line — only appears for analyzed games, connectNulls skips gaps */}
        {hasAccuracy && (
          <Line
            yAxisId="acc"
            type="monotone"
            dataKey="accuracy"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            connectNulls={false}
            dot={<AccuracyDot />}
            activeDot={false}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
