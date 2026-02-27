'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { ChessBoard } from '@/components/ChessBoard';
import { Button } from '@/components/ui/button';

type GameOption = {
  uuid: string;
  label: string;
};

type Props = {
  userName: string;
  uuid: string;

  opponentName: string;
  resultText: string;

  gameUrl: string;
  ecoUrl?: string;
  opening?: string;

  endTime: number;
  timeClass: string;
  timeControl: string;

  fenArr: string[];
  sanMoves: string[];
  gameOptions: GameOption[];

  isWhite: boolean;
  archiveYear?: number;
  archiveMonth?: number; // 1-12
};

function formatEndTime(endTimeSeconds: number): string {
  if (!Number.isFinite(endTimeSeconds) || endTimeSeconds <= 0) return '';
  const date = new Date(endTimeSeconds * 1000);
  return date.toLocaleString();
}

function groupMoves(sanMoves: string[]) {
  const rows: Array<{ moveNumber: number; white?: string; black?: string }> = [];
  for (let i = 0; i < sanMoves.length; i += 2) {
    rows.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: sanMoves[i],
      black: sanMoves[i + 1],
    });
  }
  return rows;
}

export function GameReplay({
  userName,
  uuid,
  opponentName,
  resultText,
  gameUrl,
  ecoUrl,
  opening,
  endTime,
  timeClass,
  timeControl,
  fenArr,
  sanMoves,
  gameOptions,
  isWhite,
  archiveYear,
  archiveMonth,
}: Props) {
  const router = useRouter();

  const maxIndex = Math.max(0, fenArr.length - 1);
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
  }, [uuid]);

  const clampedIndex = Math.max(0, Math.min(index, maxIndex));
  const fen = fenArr[clampedIndex] ?? '';

  const moveRows = React.useMemo(() => groupMoves(sanMoves), [sanMoves]);

  const canPrev = clampedIndex > 0;
  const canNext = clampedIndex < maxIndex;

  const handleSelectGame = (nextUuid: string) => {
    if (!nextUuid || nextUuid === uuid) return;

    const params = new URLSearchParams({
      userName,
      uuid: nextUuid,
    });

    if (archiveYear && archiveMonth) {
      params.set('year', String(archiveYear));
      params.set('month', String(archiveMonth));
    }

    router.push(`/game?${params.toString()}`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,560px),1fr] items-start">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">game replay</div>
            <div className="text-sm text-muted-foreground">
              {userName} vs {opponentName} ·{' '}
              <span className="text-foreground font-semibold">{resultText}</span>
            </div>
          </div>

          <div className="text-right text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">
              {timeClass} · {timeControl}
            </div>
            <div>{formatEndTime(endTime)}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground">switch game</label>
          <select
            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={uuid}
            onChange={(e) => handleSelectGame(e.target.value)}
          >
            {gameOptions.map((opt) => (
              <option key={opt.uuid} value={opt.uuid}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <ChessBoard fen={fen} orientation={isWhite ? 'white' : 'black'} />
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setIndex(0)} disabled={!canPrev}>
              start
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIndex((v) => Math.max(0, v - 1))}
              disabled={!canPrev}
            >
              prev
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIndex((v) => Math.min(maxIndex, v + 1))}
              disabled={!canNext}
            >
              next
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIndex(maxIndex)}
              disabled={!canNext}
            >
              end
            </Button>

            <div className="ml-auto text-xs text-muted-foreground">
              ply <span className="font-semibold text-foreground">{clampedIndex}</span>/{maxIndex}
            </div>
          </div>

          <input
            className="w-full"
            type="range"
            min={0}
            max={maxIndex}
            value={clampedIndex}
            onChange={(e) => setIndex(Number(e.target.value))}
            disabled={!fenArr.length}
          />

          <div className="flex items-center gap-3 text-sm">
            <a
              className="underline underline-offset-4"
              href={gameUrl}
              target="_blank"
              rel="noreferrer"
            >
              open on chess.com
            </a>

            {opening ? (
              <span className="text-muted-foreground">
                opening: <span className="text-foreground">{opening}</span>{' '}
                {ecoUrl ? (
                  <a
                    className="underline underline-offset-4"
                    href={ecoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    eco
                  </a>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">moves</div>
            <div className="text-xs text-muted-foreground">click a move to jump</div>
          </div>
        </div>

        <div className="mt-3 max-h-[720px] overflow-auto rounded-xl border bg-background">
          <div className="grid grid-cols-[64px,1fr,1fr] text-xs font-semibold text-muted-foreground px-3 py-2 border-b">
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

              return (
                <div
                  key={row.moveNumber}
                  className="grid grid-cols-[64px,1fr,1fr] items-center px-3 py-2"
                >
                  <div className="text-xs font-semibold text-muted-foreground">
                    {row.moveNumber}.
                  </div>

                  <button
                    type="button"
                    disabled={!row.white}
                    onClick={() => setIndex(Math.min(maxIndex, whitePly))}
                    className={[
                      'text-left rounded-md px-2 py-1 text-sm',
                      row.white ? 'hover:bg-muted' : 'opacity-40 cursor-default',
                      isWhiteActive ? 'bg-muted font-semibold' : '',
                    ].join(' ')}
                  >
                    {row.white ?? '—'}
                  </button>

                  <button
                    type="button"
                    disabled={!row.black}
                    onClick={() => setIndex(Math.min(maxIndex, blackPly))}
                    className={[
                      'text-left rounded-md px-2 py-1 text-sm',
                      row.black ? 'hover:bg-muted' : 'opacity-40 cursor-default',
                      isBlackActive ? 'bg-muted font-semibold' : '',
                    ].join(' ')}
                  >
                    {row.black ?? '—'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          current fen:{' '}
          <span className="font-mono break-all text-foreground">{fen || '(empty)'}</span>
        </div>
      </div>
    </div>
  );
}
