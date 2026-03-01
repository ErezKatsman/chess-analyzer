'use client';

// components/game-replay/MovesList.tsx
// scrollable move list for the "moves" tab in the game replay right panel

import type { TurningPoint } from '@/lib/interfaces/analysis';
import type { MoveRow } from './utils';
import { tpBadgeClass, tpSymbol } from './utils';

type MovesListProps = {
  moveRows: MoveRow[];
  clampedIndex: number;
  maxIndex: number;
  // fast lookup: `${moveNumber}-${side}` → TurningPoint
  tpMap: Map<string, TurningPoint>;
  onSeek: (ply: number) => void;
};

export function MovesList({ moveRows, clampedIndex, maxIndex, tpMap, onSeek }: MovesListProps) {
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

          const whiteTP = tpMap.get(`${row.moveNumber}-white`);
          const blackTP = tpMap.get(`${row.moveNumber}-black`);

          // subtle background tint for rows containing a turning point
          const worstType = [whiteTP?.type, blackTP?.type].includes('blunder')
            ? 'blunder'
            : [whiteTP?.type, blackTP?.type].includes('mistake')
              ? 'mistake'
              : [whiteTP?.type, blackTP?.type].includes('inaccuracy')
                ? 'inaccuracy'
                : null;
          const rowTint =
            worstType === 'blunder'
              ? 'bg-red-500/[0.04]'
              : worstType === 'mistake'
                ? 'bg-orange-500/[0.04]'
                : worstType === 'inaccuracy'
                  ? 'bg-yellow-500/[0.03]'
                  : '';

          return (
            <div
              key={row.moveNumber}
              className={['grid grid-cols-[64px,1fr,1fr] items-center px-3 py-2', rowTint].join(' ')}
            >
              <div className="text-xs font-semibold text-muted-foreground">{row.moveNumber}.</div>

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
                {whiteTP ? (
                  <span className={tpBadgeClass(whiteTP.type)}>{tpSymbol(whiteTP.type)}</span>
                ) : null}
              </button>

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
                {blackTP ? (
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
