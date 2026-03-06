'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { ChessBoard } from '@/components/ChessBoard';
import { EvalGraph } from '@/components/EvalGraph';
import { DrillPanel } from '@/components/DrillPanel';
import { PaywallModal } from '@/components/PaywallModal';
import { Button } from '@/components/ui/button';
import { FREE_LIMIT } from '@/lib/hooks/useAnalysisQuota';
import type {
  AnalysisState,
  AnalysisResult,
  PlyEval,
  QuotaState,
  GameOption,
  GameReplayProps as Props,
  TurningPoint,
  Pattern,
  BlunderExplanation,
} from '@/components/game-replay/types';
import { formatEndTime, groupMoves, computeMoveQuality, computeAccuracy, type MoveQuality } from '@/components/game-replay/utils';
import { MovesList } from '@/components/game-replay/MovesList';
import { AnalysisPanel } from '@/components/game-replay/AnalysisPanel';
import { LessonCard } from '@/components/LessonCard';
import type { Lesson } from '@/lib/interfaces/analysis';

export function GameReplay({
  userName,
  uuid,
  initialAnalysis,
  isStale,
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

  // paywall shown when server returns 402 (quota exceeded)
  const [showPaywall, setShowPaywall] = React.useState(false);
  // live quota fetched from the server — null until loaded
  const [quota, setQuota] = React.useState<QuotaState>(null);

  // fetch quota once on mount so the hint reflects real usage
  React.useEffect(() => {
    fetch('/api/user/quota')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: QuotaState) => { if (data) setQuota(data); })
      .catch(() => {});
  }, []);

  const maxIndex = Math.max(0, fenArr.length - 1);
  const [index, setIndex] = React.useState(0);
  // lazy initializer avoids the react 18 strict-mode double-invoke problem:
  // with useRef + useEffect the second effect run would overwrite 'done' → 'idle'.
  // by initializing state directly from the server-provided prop, the state is set
  // exactly once and strict-mode re-invocations have no effect.
  const [analysis, setAnalysis] = React.useState<AnalysisState>(() =>
    initialAnalysis ? { status: 'done', result: initialAnalysis } : { status: 'idle' },
  );

  const [showBestMove, setShowBestMove] = React.useState(false);
  // null = replay mode; number = active drill index
  const [drillIndex, setDrillIndex] = React.useState<number | null>(null);
  // 0-100 progress for the analysis progress bar (timer-driven estimate)
  const [analysisProgress, setAnalysisProgress] = React.useState(0);
  // ai-generated explanations keyed by `${moveNumber}-${side}`
  // lazy-init from server-provided explanations if available (same strict-mode-safe pattern)
  const [explanations, setExplanations] = React.useState<Map<string, BlunderExplanation>>(() => {
    if (!initialAnalysis?.explanations?.length) return new Map();
    const map = new Map<string, BlunderExplanation>();
    for (const exp of initialAnalysis.explanations) map.set(exp.id, exp);
    return map;
  });
  const [explanationsLoading, setExplanationsLoading] = React.useState(false);
  // ai-generated lessons derived from detected patterns
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = React.useState(false);
  // 'moves' by default; auto-init to 'analysis' when opening an already-analyzed game
  const [activeTab, setActiveTab] = React.useState<'moves' | 'analysis' | 'lessons'>(() =>
    initialAnalysis ? 'analysis' : 'moves',
  );

  // reset non-analysis state on game change.
  // key={uuid} in the parent (game/page.tsx) guarantees a fresh component instance
  // per game, so we never need to reset analysis or explanations here — they are
  // already correct from the useState lazy initializers above.
  React.useEffect(() => {
    setIndex(0);
    setShowBestMove(false);
    setDrillIndex(null);
    setExplanationsLoading(false);
  }, [uuid]); // eslint-disable-line react-hooks/exhaustive-deps

  // load or fetch ai explanations when analysis completes
  React.useEffect(() => {
    if (analysis.status !== 'done') return;

    const { turningPoints, explanations: savedExplanations } = analysis.result;

    // if the analyze response already included saved explanations, use them directly
    if (savedExplanations && savedExplanations.length > 0) {
      const map = new Map<string, BlunderExplanation>();
      for (const exp of savedExplanations) map.set(exp.id, exp);
      setExplanations(map);
      return;
    }

    // only request explanations for the player's own errors, not opponent's
    const playerSide = isWhite ? 'white' : 'black';
    const blundersAndMistakes = turningPoints.filter(
      (tp) => (tp.type === 'blunder' || tp.type === 'mistake') && tp.side === playerSide,
    );
    if (blundersAndMistakes.length === 0) return;

    setExplanationsLoading(true);

    fetch('/api/explain', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ turningPoints: blundersAndMistakes, gameUuid: uuid }),
    })
      .then((res) => res.json())
      .then((data: { explanations?: BlunderExplanation[] }) => {
        if (!data.explanations) return;
        const map = new Map<string, BlunderExplanation>();
        for (const exp of data.explanations) map.set(exp.id, exp);
        setExplanations(map);
      })
      .catch(() => {
        // silent fail — ui falls back to one-liner
      })
      .finally(() => setExplanationsLoading(false));
  }, [analysis.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // fetch lessons when analysis completes — one call per pattern set, cached in mongo
  React.useEffect(() => {
    if (analysis.status !== 'done') return;
    const { patterns, turningPoints } = analysis.result;
    if (!patterns || patterns.length === 0) return;

    setLessonsLoading(true);
    fetch('/api/lessons', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ patterns, turningPoints, gameUuid: uuid }),
    })
      .then((res) => res.json())
      .then((data: { lessons?: Lesson[] }) => {
        if (data.lessons && data.lessons.length > 0) setLessons(data.lessons);
      })
      .catch(() => {})
      .finally(() => setLessonsLoading(false));
  }, [analysis.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // animate progress bar while stockfish is running — fills to 90% over estimated time,
  // then snaps to 100% once analysis completes
  React.useEffect(() => {
    if (analysis.status === 'done') {
      setAnalysisProgress(100);
      return;
    }
    if (analysis.status !== 'loading') {
      setAnalysisProgress(0);
      return;
    }
    // estimated total: ~500ms per position (movetime budget)
    const totalPositions = sanMoves.length + 1;
    const estimatedMs = totalPositions * 500;
    const tickMs = 250;
    // fill to 90% over estimated time; the last 10% waits for the real response
    const incrementPerTick = (tickMs / estimatedMs) * 90;

    setAnalysisProgress(0);
    const id = setInterval(() => {
      setAnalysisProgress((prev) => Math.min(90, prev + incrementPerTick));
    }, tickMs);
    return () => clearInterval(id);
  }, [analysis.status, sanMoves.length]);

  const clampedIndex = Math.max(0, Math.min(index, maxIndex));
  const fen = fenArr[clampedIndex] ?? '';

  const moveRows = React.useMemo(() => groupMoves(sanMoves), [sanMoves]);

  const canPrev = clampedIndex > 0;
  const canNext = clampedIndex < maxIndex;

  // plies by severity — used by EvalGraph to draw colored markers
  const markedPlies = React.useMemo(() => {
    if (analysis.status !== 'done') return { blunder: new Set<number>(), mistake: new Set<number>(), inaccuracy: new Set<number>() };
    const blunder = new Set<number>();
    const mistake = new Set<number>();
    const inaccuracy = new Set<number>();
    for (const tp of analysis.result.turningPoints) {
      const ply =
        tp.side === 'white'
          ? (tp.moveNumber - 1) * 2 + 1
          : (tp.moveNumber - 1) * 2 + 2;
      if (tp.type === 'blunder') blunder.add(ply);
      else if (tp.type === 'mistake') mistake.add(ply);
      else if (tp.type === 'inaccuracy') inaccuracy.add(ply);
    }
    return { blunder, mistake, inaccuracy };
  }, [analysis]);

  // build drill list from player's own blunders that have a bestMove from the engine
  const drills = React.useMemo(() => {
    if (analysis.status !== 'done') return [];
    return analysis.result.turningPoints
      .filter((tp) => tp.type === 'blunder' && tp.side === (isWhite ? 'white' : 'black'))
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
          blunderMove: tp.movePlayed,
          side: tp.side,
          moveNumber: tp.moveNumber,
          oneLineReason: tp.oneLineReason,
          evalBefore: tp.evalBefore,
          evalAfter: tp.evalAfter,
        }];
      });
  }, [analysis]);

  // keyboard navigation — arrow keys for prev/next ply
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // skip if focused in an input / select to avoid hijacking typing
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') setIndex((v) => Math.max(0, v - 1));
      if (e.key === 'ArrowRight') setIndex((v) => Math.min(maxIndex, v + 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [maxIndex]);

  // accuracy % per side — computed from avg cp loss using chess.com formula
  const accuracy = React.useMemo(() => {
    if (analysis.status !== 'done') return null;
    const ev = analysis.result.evals;
    return {
      player: computeAccuracy(ev, isWhite ? 'white' : 'black'),
      opponent: computeAccuracy(ev, isWhite ? 'black' : 'white'),
    };
  }, [analysis, isWhite]);

  // quality annotation for every ply — derived from evals[], shown in move list
  const moveQualityMap = React.useMemo(() => {
    const map = new Map<number, MoveQuality>();
    if (analysis.status !== 'done') return map;
    const ev = analysis.result.evals;
    for (let p = 1; p < ev.length; p++) {
      // ply 1 = white's first move, ply 2 = black's, etc.
      const side: 'white' | 'black' = p % 2 === 1 ? 'white' : 'black';
      map.set(p, computeMoveQuality(ev[p - 1], ev[p], side));
    }
    return map;
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

  // seek to the position before a blunder, then animate the blunder move after a short delay
  const handleSeekAndPlay = React.useCallback((plyBefore: number) => {
    setIndex(plyBefore);
    setTimeout(() => setIndex(plyBefore + 1), 350);
  }, []);

  const handleSelectGame = (nextUuid: string) => {
    if (!nextUuid || nextUuid === uuid) return;
    const params = new URLSearchParams({ userName, uuid: nextUuid });
    if (archiveYear && archiveMonth) {
      params.set('year', String(archiveYear));
      params.set('month', String(archiveMonth));
    }
    router.push(`/game?${params.toString()}`);
  };

  const handleAnalyze = async (force = false) => {
    if (analysis.status === 'loading') return;
    setAnalysis({ status: 'loading' });

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn, playerSide: isWhite ? 'white' : 'black', gameUuid: uuid, ...(force ? { force: true } : {}) }),
      });

      const data = (await res.json()) as {
        evals?: PlyEval[];
        turningPoints?: TurningPoint[];
        patterns?: Pattern[];
        explanations?: BlunderExplanation[];
        error?: string;
        fromCache?: boolean;
      };

      // quota exceeded — show paywall (server-enforced)
      if (res.status === 402 || data.error === 'quota_exceeded') {
        setAnalysis({ status: 'idle' });
        setShowPaywall(true);
        setQuota((q) => q ? { ...q, remaining: 0, used: q.limit } : q);
        return;
      }

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
          explanations: data.explanations ?? [],
        },
      });
      // switch to analysis tab so results are immediately visible
      setActiveTab('analysis');

      // refresh quota after a fresh analysis (not needed for cached results)
      if (!data.fromCache) {
        fetch('/api/user/quota')
          .then((r) => (r.ok ? r.json() : null))
          .then((q: QuotaState) => { if (q) setQuota(q); })
          .catch(() => {});
        // clear next.js router cache so the games-table "✓ analyzed" badge is visible
        // immediately when the user navigates back — without this, next.js may serve
        // the stale pre-analysis snapshot from its client-side cache.
        router.refresh();
      }
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
        key={drillIndex}
        {...drill}
        drillIndex={drillIndex}
        totalDrills={drills.length}
        gameUuid={uuid}
        onNext={drillIndex < drills.length - 1 ? () => setDrillIndex(drillIndex + 1) : undefined}
        onExit={() => setDrillIndex(null)}
      />
    );
  }

  return (
    <>
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
            markedPlies={markedPlies}
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

      {/* right panel: tabbed moves / analysis */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        {/* header: tab switcher (left) + action button (right) */}
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <div className="flex gap-1">
            {(['moves', 'analysis', 'lessons'] as const).map((tab) => {
              const badge =
                tab === 'analysis' && analysis.status === 'done'
                  ? analysis.result.turningPoints.length
                  : tab === 'lessons' && lessons.length > 0
                    ? lessons.length
                    : 0;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  disabled={tab === 'lessons' && analysis.status !== 'done'}
                  className={[
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    tab === 'lessons' && analysis.status !== 'done'
                      ? 'opacity-40 cursor-not-allowed'
                      : '',
                  ].join(' ')}
                >
                  {tab}
                  {badge > 0 ? (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-end gap-0.5">
            {analysis.status === 'done' ? (
              <span className="text-xs font-semibold text-emerald-500">✓ analyzed</span>
            ) : (
              <>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => { void handleAnalyze(); }}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'analyzing…' : 'analyze'}
                </Button>
                {/* quota hint — live from server, falls back to static limit */}
                <span className={[
                  'text-[10px]',
                  quota && quota.remaining === 0 ? 'text-destructive font-semibold' : 'text-muted-foreground',
                ].join(' ')}>
                  {quota
                    ? `${quota.remaining} of ${quota.limit} analyses left`
                    : `${FREE_LIMIT} free analyses/month`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* error banner — always visible regardless of active tab */}
        {analysis.status === 'error' ? (
          <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {analysis.message}
          </div>
        ) : null}

        {/* stale analysis banner — shown when stored result is from an older pipeline version */}
        {isStale && analysis.status !== 'loading' && analysis.status !== 'idle' ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <span>results from an older analysis — re-analyze free</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/40"
              onClick={() => { void handleAnalyze(true); }}
            >
              re-analyze
            </Button>
          </div>
        ) : null}

        {/* analysis progress bar — always visible */}
        {analysis.status === 'loading' ? (
          <div className="mt-3 rounded-lg border bg-muted/50 px-3 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>analyzing {sanMoves.length} moves with stockfish…</span>
              <span>{Math.round(analysisProgress)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* ── moves tab ── */}
        {activeTab === 'moves' ? (
          <MovesList
            moveRows={moveRows}
            clampedIndex={clampedIndex}
            maxIndex={maxIndex}
            tpMap={tpMap}
            moveQualityMap={moveQualityMap}
            onSeek={setIndex}
          />
        ) : null /* end moves tab */}

        {/* ── analysis tab ── */}
        {activeTab === 'analysis' ? (
          <AnalysisPanel
            analysisState={analysis}
            drillCount={drills.length}
            explanations={explanations}
            explanationsLoading={explanationsLoading}
            maxIndex={maxIndex}
            onSeek={setIndex}
            onSeekAndPlay={handleSeekAndPlay}
            onStartDrills={() => setDrillIndex(0)}
            playerSide={isWhite ? 'white' : 'black'}
            accuracy={accuracy}
          />
        ) : null /* end analysis tab */}

        {/* ── lessons tab ── */}
        {activeTab === 'lessons' ? (
          <div className="mt-4 space-y-2">
            {lessonsLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
                generating lessons…
              </div>
            ) : lessons.length > 0 ? (
              lessons.map((lesson, i) => <LessonCard key={i} lesson={lesson} />)
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                no lessons available — run analysis first
              </div>
            )}
          </div>
        ) : null /* end lessons tab */}
      </div>
    </div>

    {/* paywall modal — shown when user has used all free analyses */}
    <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}
