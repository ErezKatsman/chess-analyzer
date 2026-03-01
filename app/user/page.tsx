import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import type { IGame } from '@/lib/interfaces/games';
import { fetchUserArchives } from '@/lib/services/chesscom';
import { fetchMonthlyGamesCached, fetchLatestMonthlyGamesCached } from '@/lib/db/cachedChesscom';
import { connectDB } from '@/lib/db/mongo';
import { GameAnalysis } from '@/lib/db/schemas';
import { GamesTable } from '@/components/GamesTable';
import { MonthPicker } from '@/components/MonthPicker';
import { StatsBar } from '@/components/StatsBar';

interface UserPageProps {
  searchParams: {
    userName?: string;
    year?: string;
    month?: string;
  };
}

// make sure this page is always dynamic (because we fetch external data)
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function normalizeUserName(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '';

  // next.js usually already decodes search params, but keep this safe + defensive
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value;
  }
}

function parseIntParam(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      {children}
      <div className="mt-5">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          ← back to home
        </Link>
      </div>
    </div>
  );
}

export default async function UserPage({ searchParams }: UserPageProps) {
  const userName = normalizeUserName(searchParams.userName);
  const { userId } = await auth();

  if (!userName) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <CardShell>
            <h1 className="text-2xl font-semibold">missing username</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              go back and enter a chess.com username.
            </p>
          </CardShell>
        </div>
      </main>
    );
  }

  const requestedYear = parseIntParam(searchParams.year);
  const requestedMonth = parseIntParam(searchParams.month);
  const hasExplicitMonth = requestedYear !== null && requestedMonth !== null;

  let games: IGame[] = [];
  let archiveYear = 0;
  let archiveMonth = 0;
  let errorMessage: string | null = null;

  // fetch archives and games in parallel; archives power the month picker
  const [archivesResult, gamesResult] = await Promise.allSettled([
    fetchUserArchives(userName),
    hasExplicitMonth
      ? fetchMonthlyGamesCached({ userName, year: requestedYear, month: requestedMonth })
      : fetchLatestMonthlyGamesCached(userName),
  ]);

  const archives = archivesResult.status === 'fulfilled' ? archivesResult.value : [];

  if (gamesResult.status === 'rejected') {
    errorMessage =
      gamesResult.reason instanceof Error
        ? gamesResult.reason.message
        : 'failed to fetch games';
  } else {
    if (hasExplicitMonth) {
      games = gamesResult.value as IGame[];
      archiveYear = requestedYear;
      archiveMonth = requestedMonth;
    } else {
      const result = gamesResult.value as { games: IGame[]; year: number; month: number };
      games = result.games;
      archiveYear = result.year;
      archiveMonth = result.month;
    }
  }

  // fetch which game UUIDs this user has already analyzed (empty set when signed out)
  let analyzedUuids = new Set<string>();
  if (userId && games.length > 0) {
    try {
      await connectDB();
      const analyzed = await GameAnalysis.find(
        { clerkUserId: userId, gameUuid: { $in: games.map((g) => g.uuid) } },
        { gameUuid: 1 },
      ).lean();
      analyzedUuids = new Set(analyzed.map((a) => a.gameUuid));
    } catch {
      // non-fatal — table still renders without badges
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        <header className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{userName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                games fetched from chess.com monthly archive
                {archiveYear && archiveMonth
                  ? ` • ${archiveYear}-${String(archiveMonth).padStart(2, '0')}`
                  : ''}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <MonthPicker
                userName={userName}
                archives={archives}
                selectedYear={archiveYear}
                selectedMonth={archiveMonth}
              />
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {errorMessage ? 0 : games.length} games
              </div>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <CardShell>
            <div className="text-sm font-semibold text-destructive">error</div>
            <div className="mt-2 text-sm text-muted-foreground">{errorMessage}</div>
            <div className="mt-3 text-xs text-muted-foreground">
              tip: if the username exists, chess.com might be rate-limiting or temporarily down.
            </div>
          </CardShell>
        ) : games.length === 0 ? (
          <CardShell>
            <div className="text-sm font-semibold">no games found</div>
            <div className="mt-2 text-sm text-muted-foreground">
              this user may have no games in the selected archive month.
            </div>
          </CardShell>
        ) : (
          <>
            <StatsBar games={games} userName={userName} />
            <GamesTable
              userName={userName}
              games={games}
              archiveYear={archiveYear}
              archiveMonth={archiveMonth}
              analyzedUuids={analyzedUuids}
            />
          </>
        )}
      </div>
    </main>
  );
}
