// app/game/page.tsx
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import type { IGame } from '@/lib/interfaces/games';
import type { TurningPoint, Pattern, BlunderExplanation } from '@/lib/interfaces/analysis';
import { fetchGamesWithArchive, fetchMonthlyGames } from '@/lib/userUtils';
import { connectDB } from '@/lib/db/mongo';
import { GameAnalysis } from '@/lib/db/schemas';
import { GameReplay } from '@/components/GameReplay';
import { getSanMovesFromPgn } from '@/lib/chess/moves';

type PlyEval = { ply: number; fen: string; cp: number | null; mate: number | null; bestMove: string | null };

export const dynamic = 'force-dynamic';

type SearchParam = string | string[] | undefined;

type GamePageProps = {
  searchParams: {
    userName?: SearchParam;
    uuid?: SearchParam;
    year?: SearchParam;
    month?: SearchParam;
  };
};

function normalizeValue(raw: SearchParam): string {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const value = (first ?? '').trim();
  if (!value) return '';

  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value;
  }
}

function parseIntSafe(raw: string): number {
  const value = raw.trim();
  if (!value) return 0;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function PageCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {title ? <h1 className="text-2xl font-semibold">{title}</h1> : null}
          {children}
        </div>
      </div>
    </main>
  );
}

export default async function GamePage({ searchParams }: GamePageProps) {
  const userName = normalizeValue(searchParams.userName);
  const uuid = normalizeValue(searchParams.uuid);

  const year = parseIntSafe(normalizeValue(searchParams.year));
  const month = parseIntSafe(normalizeValue(searchParams.month));

  if (!userName || !uuid) {
    return (
      <PageCard title="missing params">
        <p className="mt-2 text-sm text-muted-foreground">
          open this page from the games list (analyze button).
        </p>
        <div className="mt-4">
          <Link className="text-sm underline underline-offset-4" href="/">
            back home
          </Link>
        </div>
      </PageCard>
    );
  }

  let games: IGame[] = [];
  let archiveYear = year;
  let archiveMonth = month;
  let errorMessage: string | null = null;

  try {
    if (archiveYear && archiveMonth) {
      games = await fetchMonthlyGames({ userName, year: archiveYear, month: archiveMonth });
    } else {
      const latest = await fetchGamesWithArchive(userName);
      games = latest.games;
      archiveYear = latest.year;
      archiveMonth = latest.month;
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'failed to fetch games';
  }

  if (errorMessage) {
    return (
      <PageCard>
        <div className="text-sm font-semibold text-destructive">error</div>
        <div className="mt-2 text-sm text-muted-foreground">{errorMessage}</div>
        <div className="mt-4">
          <Link
            className="text-sm underline underline-offset-4"
            href={`/user?userName=${encodeURIComponent(userName)}`}
          >
            back to games list
          </Link>
        </div>
      </PageCard>
    );
  }

  const game = games.find((g) => g.uuid === uuid);

  if (!game) {
    return (
      <PageCard title="game not found">
        <p className="mt-2 text-sm text-muted-foreground">
          this can happen if the game is not in the selected archive month.
        </p>
        <div className="mt-4">
          <Link
            className="text-sm underline underline-offset-4"
            href={`/user?userName=${encodeURIComponent(userName)}`}
          >
            back to games list
          </Link>
        </div>
      </PageCard>
    );
  }

  const sanMoves = getSanMovesFromPgn(game.pgn);

  const gameOptions = games.map((g) => ({
    uuid: g.uuid,
    label: `${g.opponent.name} • ${g.timeClass} • ${g.gameDetails.result}`,
  }));

  // load cached analysis server-side so already-analyzed games show results immediately
  // keep in sync with CURRENT_VERSION in app/api/analyze/route.ts
  const CURRENT_VERSION = 1;
  const { userId } = await auth();
  let initialAnalysis: {
    evals: PlyEval[];
    turningPoints: TurningPoint[];
    patterns: Pattern[];
    explanations: BlunderExplanation[];
  } | null = null;
  let isStale = false;

  if (userId) {
    try {
      await connectDB();
      const cached = await GameAnalysis.findOne(
        { clerkUserId: userId, gameUuid: uuid },
        { evals: 1, turningPoints: 1, patterns: 1, explanations: 1, analysisVersion: 1 },
      ).lean();

      if (cached) {
        initialAnalysis = {
          evals: (cached.evals ?? []) as PlyEval[],
          turningPoints: (cached.turningPoints ?? []) as TurningPoint[],
          patterns: (cached.patterns ?? []) as Pattern[],
          explanations: (cached.explanations ?? []) as BlunderExplanation[],
        };
        // mark stale when stored version is behind the current pipeline version
        isStale = ((cached.analysisVersion as number | undefined) ?? 0) < CURRENT_VERSION;
      }
    } catch {
      // non-fatal — page renders with analyze button if db unavailable
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* back link — proper next.js navigation so the games table always re-fetches */}
        <div className="mb-4">
          <Link
            href={`/user?userName=${encodeURIComponent(userName)}${archiveYear && archiveMonth ? `&year=${archiveYear}&month=${archiveMonth}` : ''}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← back to games list
          </Link>
        </div>
        <GameReplay
          key={game.uuid}
          userName={userName}
          uuid={game.uuid}
          initialAnalysis={initialAnalysis}
          isStale={isStale}
          opponentName={game.opponent.name}
          resultText={game.gameDetails.result}
          gameUrl={game.url}
          ecoUrl={game.gameDetails.ecoUrl}
          opening={game.gameDetails.opening}
          endTime={game.endTime}
          timeClass={game.timeClass}
          timeControl={game.timeControl}
          pgn={game.pgn}
          fenArr={game.gameDetails.fenArr}
          sanMoves={sanMoves}
          gameOptions={gameOptions}
          isWhite={game.isWhite}
          archiveYear={archiveYear}
          archiveMonth={archiveMonth}
        />
      </div>
    </main>
  );
}
