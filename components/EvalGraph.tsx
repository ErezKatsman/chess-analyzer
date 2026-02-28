'use client';

import * as React from 'react';

type PlyEval = {
  ply: number;
  cp: number | null;
  mate: number | null;
};

type Props = {
  evals: PlyEval[];
  currentPly: number;
  onSeek: (ply: number) => void;
  blunderPlies?: Set<number>;
};

// clamp centipawn value to display range and convert mate scores
function toDisplayCp(cp: number | null, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 800 : -800;
  if (cp === null) return 0;
  return Math.max(-800, Math.min(800, cp));
}

// format eval as human-readable string: "+1.2", "-0.8", "M3", "-M3"
function formatEval(cp: number | null, mate: number | null): string {
  if (mate !== null) return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  if (cp === null) return '0.0';
  const pawns = cp / 100;
  return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

// color class based on who has advantage
function evalColorClass(cp: number | null, mate: number | null): string {
  if (mate !== null) return mate > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500';
  if (cp === null || Math.abs(cp) < 20) return 'text-muted-foreground';
  return cp > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500';
}

const VIEW_W = 400;
const VIEW_H = 72;
const HALF_H = VIEW_H / 2;
const PADDING_X = 4;
const USABLE_W = VIEW_W - PADDING_X * 2;

export function EvalGraph({ evals, currentPly, onSeek, blunderPlies }: Props) {
  const svgRef = React.useRef<SVGSVGElement>(null);

  const totalPlies = evals.length;

  // convert eval array to svg points
  const points = React.useMemo(() => {
    return evals.map((e, i) => {
      const displayCp = toDisplayCp(e.cp, e.mate);
      const x = totalPlies <= 1 ? PADDING_X : PADDING_X + (i / (totalPlies - 1)) * USABLE_W;
      // y: 0cp = HALF_H, +800cp = 0, -800cp = VIEW_H
      const y = HALF_H - (displayCp / 800) * HALF_H;
      return { x, y, ply: e.ply };
    });
  }, [evals, totalPlies]);

  // build svg path strings for white (above zero) and black (below zero) fills
  const { whiteArea, blackArea, linePath } = React.useMemo(() => {
    if (points.length === 0) return { whiteArea: '', blackArea: '', linePath: '' };

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

    // white fill: area above the zero line (y < HALF_H means positive eval)
    const wArea =
      `M${points[0].x},${HALF_H} ` +
      points.map((p) => `L${p.x},${Math.min(p.y, HALF_H)}`).join(' ') +
      ` L${points[points.length - 1].x},${HALF_H} Z`;

    // black fill: area below the zero line (y > HALF_H means negative eval)
    const bArea =
      `M${points[0].x},${HALF_H} ` +
      points.map((p) => `L${p.x},${Math.max(p.y, HALF_H)}`).join(' ') +
      ` L${points[points.length - 1].x},${HALF_H} Z`;

    return { whiteArea: wArea, blackArea: bArea, linePath: line };
  }, [points]);

  // cursor x position for the current ply
  const cursorX = React.useMemo(() => {
    if (totalPlies <= 1) return PADDING_X;
    const i = Math.max(0, Math.min(currentPly, totalPlies - 1));
    return PADDING_X + (i / (totalPlies - 1)) * USABLE_W;
  }, [currentPly, totalPlies]);

  // eval for the current ply (used for numeric display)
  const currentEval = evals[Math.max(0, Math.min(currentPly, evals.length - 1))];

  // handle click: map svg x coordinate to ply and seek
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || totalPlies <= 1) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = (clickX - (PADDING_X / VIEW_W) * rect.width) / ((USABLE_W / VIEW_W) * rect.width);
    const ply = Math.round(Math.max(0, Math.min(1, ratio)) * (totalPlies - 1));
    onSeek(ply);
  };

  if (evals.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border bg-background overflow-hidden">
      {/* numeric eval header */}
      <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
        <span
          className={[
            'text-xs font-mono font-semibold tabular-nums',
            evalColorClass(currentEval?.cp ?? null, currentEval?.mate ?? null),
          ].join(' ')}
        >
          {formatEval(currentEval?.cp ?? null, currentEval?.mate ?? null)}
        </span>
        <span className="text-xs text-muted-foreground">eval</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="w-full h-16 cursor-pointer"
        onClick={handleClick}
      >
        {/* white advantage fill */}
        <path d={whiteArea} fill="rgba(255,255,255,0.85)" />

        {/* black advantage fill */}
        <path d={blackArea} fill="rgba(60,60,60,0.75)" />

        {/* eval line */}
        <path d={linePath} fill="none" stroke="rgba(120,120,120,0.6)" strokeWidth="0.8" />

        {/* zero line */}
        <line
          x1={PADDING_X}
          y1={HALF_H}
          x2={VIEW_W - PADDING_X}
          y2={HALF_H}
          stroke="rgba(120,120,120,0.4)"
          strokeWidth="0.5"
        />

        {/* blunder markers */}
        {blunderPlies &&
          points
            .filter((p) => blunderPlies.has(p.ply))
            .map((p) => (
              <circle
                key={p.ply}
                cx={p.x}
                cy={p.y}
                r="2.5"
                fill="#ef4444"
                stroke="white"
                strokeWidth="0.5"
              />
            ))}

        {/* current ply cursor */}
        <line
          x1={cursorX}
          y1={0}
          x2={cursorX}
          y2={VIEW_H}
          stroke="#3b82f6"
          strokeWidth="1.2"
          strokeDasharray="3,2"
        />
      </svg>
    </div>
  );
}
