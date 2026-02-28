'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { ChessBoard } from '@/components/ChessBoard';
import { EvalGraph } from '@/components/EvalGraph';
import { DrillPanel } from '@/components/DrillPanel';
import { Button } from '@/components/ui/button';
import type { TurningPoint, Pattern } from '@/lib/interfaces/analysis';

type GameOption = { uuid: string; label: string };

type PlyEval = {
  ply: number;
  fen: string;
  cp: number | null;
  mate: number | null;
  bestMove: string | null;
};

type AnalysisResult = {
  evals: PlyEval[];
  turningPoints: TurningPoint[];
  patterns: Pattern[];
};

type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; result: AnalysisResult };

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
  archiveMonth?: number;

  pgn: string;
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

function tpBadgeClass(type: TurningPoint['type']): string {
  switch (type) {
    case 'blunder':
      return 'text-red-500 font-bold text-xs';
    case 'mistake':
      return 'text-orange-400 font-semibold text-xs';
    case 'inaccuracy':
      return 'text-yellow-500 text-xs';
    case 'missed_win':
      return 'text-purple-400 font-semibold text-xs';
    default:
      return 'text-muted-foreground text-xs';
  }
}

function tpSymbol(type: TurningPoint['type']): string {
  switch (type) {
    case 'blunder':
      return '??';
    case 'mistake':
      return '?';
    case 'inaccuracy':
      return '?!';
    case 'missed_win':
      return '⁉';
    default:
      return '';
  }
}

function patternTagClass(tag: Pattern['tag']): string {
  switch (tag) {
    case 'tactics':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'opening':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'endgame':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'king-safety':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'time-trouble':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'strategy':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
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
  pgn,
}: Props) {
  const router = useRouter();

  const maxIndex = Math.max(0, fenArr.length - 1);
  const [index, setIndex] = React.useState(0);
  const [analysis, setAnalysis] = React.useState<AnalysisState>({ status: 'idle' });
  const [showBestMove, setShowBestMove] = React.useState(false);
  // null = replay mode; number = active drill index
  const [drillIndex, setDrillIndex] = React.useState<number | null>(null);

  // reset board position, analysis, best-move toggle, and drill mode when game changes
  React.useEffect(() => {
    setIndex(0);
    setAnalysis({ status: 'idle' });
    setShowBestMove(false);
    setDrillIndex(null);
  }, [uuid]);

  const clampedIndex = Math.max(0, Math.min(index, maxIndex));
  const fen = fenArr[clampedIndex] ?? '';

  const moveRows = React.useMemo(() => groupMoves(sanMoves), [sanMoves]);

  const canPrev = clampedIndex > 0;
  const canNext = clampedIndex < maxIndex;

  // set of plies where a blunder occurred — used by EvalGraph to draw red markers
  const blunderPlies = React.useMemo(() => {
    if (analysis.status !== 'done') return new Set<number>();
    const set = new Set<number>();
    for (const tp of analysis.result.turningPoints) {
      if (tp.type !== 'blunder') continue;
      const ply =
        tp.side === 'white'
          ? (tp.moveNumber - 1) * 2 + 1
          : (tp.moveNumber - 1) * 2 + 2;
      set.add(ply);
    }
    return set;
  }, [analysis]);

  // build drill list from blunders that have a bestMove from the engine
  const drills = React.useMemo(() => {
    if (analysis.status !== 'done') return [];
    return analysis.result.turningPoints
      .filter((tp) => tp.type === 'blunder')
      .flatMap((tp) => {
        // ply index of the position BEFORE the blunder
        const plyBefore = tp.side === 'white'
          ? (tp.moveNumber - 1) * 2
          : (tp.moveNumber - 1) * 2 + 1;
        const bestMove = analysis.result.evals[plyBefore]?.bestMove;
        if (!bestMove) return [];
        return [{
          fen: tp.positionHint,
          bestMove,
          side: tp.side,
          moveNumber: tp.moveNumber,
          oneLineReason: tp.oneLineReason,
          evalBefore: tp.evalBefore,
          evalAfter: tp.evalAfter,
        }];
      });
  }, [analysis]);

  // fast lookup: `${moveNumber}-${side}` → TurningPoint
  const tpMap = React.useMemo(() => {
    const map = new Map<string, TurningPoint>();
    if (analysis.status !== 'done') return map;
    for (const tp of analysis.result.turningPoints) {
      map.set(`${tp.moveNumber}-${tp.side}`, tp);
    }
    return map;
  }, [analysis]);

  const handleSelectGame = (nextUuid: string) => {
    if (!nextUuid || nextUuid === uuid) return;
    const params = new URLSearchParams({ userName, uuid: nextUuid });
    if (archiveYear && archiveMonth) {
      params.set('year', String(archiveYear));
      params.set('month', String(archiveMonth));
    }
    router.push(`/game?${params.toString()}`);
  };

  const handleAnalyze = async () => {
    if (analysis.status === 'loading') return;
    setAnalysis({ status: 'loading' });

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn, playerSide: isWhite ? 'white' : 'black' }),
      });

      const data = (await res.json()) as {
        evals?: PlyEval[];
        turningPoints?: TurningPoint[];
        patterns?: Pattern[];
        error?: string;
      };

      if (!res.ok || data.error) {
        setAnalysis({ status: 'error', message: data.error ?? 'analysis failed' });
        return;
      }

      setAnalysis({
        status: 'done',
        result: {
          evals: data.evals ?? [],
          turningPoints: data.turningPoints ?? [],
          patterns: data.patterns ?? [],
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'network error';
      setAnalysis({ status: 'error', message });
    }
  };

  const isAnalyzing = analysis.status === 'loading';

  // drill mode: render DrillPanel instead of the normal replay UI
  if (drillIndex !== null && drills[drillIndex]) {
    const drill = drills[drillIndex];
    return (
      <DrillPanel
        {...drill}
        drillIndex={drillIndex}
        totalDrills={drills.length}
        onNext={drillIndex < drills.length - 1 ? () => setDrillIndex(drillIndex + 1) : undefined}
        onExit={() => setDrillIndex(null)}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,560px),1fr] items-start">
      {/* left panel: board + controls */}
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
          <ChessBoard
            fen={fen}
            orientation={isWhite ? 'white' : 'black'}
            bestMove={
              showBestMove && analysis.status === 'done'
                ? (analysis.result.evals[clampedIndex]?.bestMove ?? null)
                : null
            }
          />
        </div>

        {/* eval graph — shown after analysis completes */}
        {analysis.status === 'done' ? (
          <EvalGraph
            evals={analysis.result.evals}
            currentPly={clampedIndex}
            onSeek={setIndex}
            blunderPlies={blunderPlies}
          />
        ) : null}

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

            <div className="ml-auto flex items-center gap-2">
              {analysis.status === 'done' ? (
                <Button
                  type="button"
                  variant={showBestMove ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowBestMove((v) => !v)}
                  title="toggle best move arrow"
                >
                  best move
                </Button>
              ) : null}
              <span className="text-xs text-muted-foreground">
                ply <span className="font-semibold text-foreground">{clampedIndex}</span>/{maxIndex}
              </span>
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

      {/* right panel: moves + analysis */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">moves</div>
            <div className="text-xs text-muted-foreground">click a move to jump</div>
          </div>

          <Button
            type="button"
            variant={analysis.status === 'done' ? 'outline' : 'default'}
            size="sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'analyzing…' : analysis.status === 'done' ? 're-analyze' : 'analyze'}
          </Button>
        </div>

        {/* error banner */}
        {analysis.status === 'error' ? (
          <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {analysis.message}
          </div>
        ) : null}

        {/* loading banner */}
        {analysis.status === 'loading' ? (
          <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground animate-pulse">
            running stockfish analysis — this takes a few seconds…
          </div>
        ) : null}

        {/* move list */}
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

              const whiteTP = tpMap.get(`${row.moveNumber}-white`);
              const blackTP = tpMap.get(`${row.moveNumber}-black`);

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
                    title={whiteTP?.oneLineReason}
                    disabled={!row.white}
                    onClick={() => setIndex(Math.min(maxIndex, whitePly))}
                    className={[
                      'text-left rounded-md px-2 py-1 text-sm flex items-center gap-1',
                      row.white ? 'hover:bg-muted' : 'opacity-40 cursor-default',
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
                    onClick={() => setIndex(Math.min(maxIndex, blackPly))}
                    className={[
                      'text-left rounded-md px-2 py-1 text-sm flex items-center gap-1',
                      row.black ? 'hover:bg-muted' : 'opacity-40 cursor-default',
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

        <div className="mt-3 text-xs text-muted-foreground">
          current fen:{' '}
          <span className="font-mono break-all text-foreground">{fen || '(empty)'}</span>
        </div>

        {/* analysis summary — only shown when done */}
        {analysis.status === 'done' ? (
          <div className="mt-4 grid gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-red-500 font-semibold">
                {analysis.result.turningPoints.filter((t) => t.type === 'blunder').length} blunders
              </span>
              <span className="text-orange-400 font-semibold">
                {analysis.result.turningPoints.filter((t) => t.type === 'mistake').length} mistakes
              </span>
              <span className="text-yellow-500">
                {analysis.result.turningPoints.filter((t) => t.type === 'inaccuracy').length}{' '}
                inaccuracies
              </span>
              {drills.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setDrillIndex(0)}
                >
                  practice {drills.length} blunder{drills.length > 1 ? 's' : ''}
                </Button>
              )}
            </div>

            {analysis.result.patterns.length > 0 ? (
              <div className="grid gap-2">
                <div className="text-xs font-semibold text-muted-foreground">patterns detected</div>
                {analysis.result.patterns.map((p) => (
                  <div key={p.tag} className="rounded-lg border bg-background p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          patternTagClass(p.tag),
                        ].join(' ')}
                      >
                        {p.tag}
                      </span>
                      <span className="font-medium">{p.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.coachingHint}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
