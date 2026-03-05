'use client';

// components/game-replay/MovesList.tsx
// scrollable move list for the "moves" tab in the game replay right panel

import * as React from 'react';
import type { TurningPoint } from '@/lib/interfaces/analysis';
import type { MoveRow } from './utils';
import {
  tpBadgeClass,
  tpSymbol,
  moveQualitySymbol,
  moveQualityBadgeClass,
  type MoveQuality,
} from './utils';

type MovesListProps = {
  moveRows: MoveRow[];
  clampedIndex: number;
  maxIndex: number;
  // fast lookup: `${moveNumber}-${side}` → TurningPoint (for tooltip text)
  tpMap: Map<string, TurningPoint>;
  // quality for every ply — shown when analysis is available
  moveQualityMap: Map<number, MoveQuality>;
  onSeek: (ply: number) => void;
};

export function MovesList({ moveRows, clampedIndex, maxIndex, tpMap, moveQualityMap, onSeek }: MovesListProps) {
  const hasQuality = moveQualityMap.size > 0;

  // scroll active row into view when the current ply changes
  const activeRowRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [clampedIndex]);

  return (
    <div className="mt-3 max-h-[calc(100vh-300px)] overflow-auto rounded-xl border bg-background">
      <div className="grid grid-cols-[64px,1fr,1fr] border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
        <div>#</div>
        <div>white</div>
        <div>black</div>
      </div>

      <div className="divide-y">
        {moveRows.map((row) => {
          const whitePly = (row.moveNumber - 1) * 2 + 1;
          const blackPly = (row.moveNumber - 1) * 2 + 2;

          const isWhiteActive = clampedIndex === whitePly;
          const isBlackActive = clampedIndex === blackPly;

          // tooltip text from turningPoints (has oneLineReason)
          const whiteTP = tpMap.get(`${row.moveNumber}-white`);
          const blackTP = tpMap.get(`${row.moveNumber}-black`);

          // quality from eval delta — shown on every move once analysis runs
          const whiteQuality = hasQuality ? (moveQualityMap.get(whitePly) ?? 'normal') : null;
          const blackQuality = hasQuality ? (moveQualityMap.get(blackPly) ?? 'normal') : null;

          // row tint — worst quality in this row
          const qualities = [whiteQuality, blackQuality].filter(Boolean) as MoveQuality[];
          const worstQuality = qualities.includes('blunder') ? 'blunder'
            : qualities.includes('mistake') ? 'mistake'
            : qualities.includes('inaccuracy') ? 'inaccuracy'
            : null;
          const rowTint =
            worstQuality === 'blunder' ? 'bg-red-500/[0.04]'
              : worstQuality === 'mistake' ? 'bg-orange-500/[0.04]'
              : worstQuality === 'inaccuracy' ? 'bg-yellow-500/[0.03]'
              : '';

          const isActiveRow = isWhiteActive || isBlackActive;
          return (
            <div
              key={row.moveNumber}
              ref={isActiveRow ? activeRowRef : undefined}
              className={['grid grid-cols-[64px,1fr,1fr] items-center px-3 py-2', rowTint].join(' ')}
            >
              <div className="text-xs font-semibold text-muted-foreground">{row.moveNumber}.</div>

              {/* white move */}
              <button
                type="button"
                title={whiteTP?.oneLineReason}
                disabled={!row.white}
                onClick={() => onSeek(Math.min(maxIndex, whitePly))}
                className={[
                  'flex items-center gap-1 rounded-md px-2 py-1 text-left text-sm',
                  row.white ? 'hover:bg-muted' : 'cursor-default opacity-40',
                  isWhiteActive ? 'bg-muted font-semibold' : '',
                ].join(' ')}
              >
                <span>{row.white ?? '—'}</span>
                {whiteQuality && whiteQuality !== 'normal' ? (
                  <span className={moveQualityBadgeClass(whiteQuality)}>
                    {moveQualitySymbol(whiteQuality)}
                  </span>
                ) : whiteTP ? (
                  // fallback: turningPoint badge (missed_win, good_defense, etc.)
                  <span className={tpBadgeClass(whiteTP.type)}>{tpSymbol(whiteTP.type)}</span>
                ) : null}
              </button>

              {/* black move */}
              <button
                type="button"
                title={blackTP?.oneLineReason}
                disabled={!row.black}
                onClick={() => onSeek(Math.min(maxIndex, blackPly))}
                className={[
                  'flex items-center gap-1 rounded-md px-2 py-1 text-left text-sm',
                  row.black ? 'hover:bg-muted' : 'cursor-default opacity-40',
                  isBlackActive ? 'bg-muted font-semibold' : '',
                ].join(' ')}
              >
                <span>{row.black ?? '—'}</span>
                {blackQuality && blackQuality !== 'normal' ? (
                  <span className={moveQualityBadgeClass(blackQuality)}>
                    {moveQualitySymbol(blackQuality)}
                  </span>
                ) : blackTP ? (
                  <span className={tpBadgeClass(blackTP.type)}>{tpSymbol(blackTP.type)}</span>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
