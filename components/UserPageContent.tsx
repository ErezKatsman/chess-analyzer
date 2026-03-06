// server component — shared between app/page.tsx (home) and app/user/page.tsx (public browse)
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import type { IGame } from '@/lib/interfaces/games';
import { fetchUserArchives } from '@/lib/services/chesscom';
import { fetchMonthlyGamesCached, fetchLatestMonthlyGamesCached } from '@/lib/db/cachedChesscom';
import { connectDB } from '@/lib/db/mongo';
import { GameAnalysis, DrillSession, UserProfile } from '@/lib/db/schemas';
import { MonthPicker } from '@/components/MonthPicker';
import { UserPageTabs } from '@/components/UserPageTabs';
import type { ProfileData } from '@/components/UserPageTabs';
import { ChangeUsernameButton } from '@/components/ChangeUsernameButton';
import { buildProgressPoint } from '@/lib/analysis/progressUtils';
import { aggregatePatterns } from '@/lib/analysis/patternSummary';
import type { ProgressPoint } from '@/lib/analysis/progressUtils';
import type { PatternSummaryEntry, GamePatternEntry } from '@/lib/analysis/patternSummary';
import type { PositionEval } from '@/lib/analysis/stockfish';
import type { TurningPoint, Pattern } from '@/lib/interfaces/analysis';

interface Props {
  userName: string;
  year: number | null;
  month: number | null;
  // '/' = home (month picker stays at /); '/user' = public browse page
  basePath?: string;
  // active dashboard tab (coach | progress | games | profile | settings)
  tab?: string;
}

export async function UserPageContent({ userName, year, month, basePath = '/user', tab = 'coach' }: Props) {
  const { userId } = await auth();

  const hasExplicitMonth = year !== null && month !== null;

  let games: IGame[] = [];
  let archiveYear = 0;
  let archiveMonth = 0;
  let errorMessage: string | null = null;

  const [archivesResult, gamesResult] = await Promise.allSettled([
    fetchUserArchives(userName),
    hasExplicitMonth
      ? fetchMonthlyGamesCached({ userName, year: year as number, month: month as number })
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
      archiveYear = year as number;
      archiveMonth = month as number;
    } else {
      const result = gamesResult.value as { games: IGame[]; year: number; month: number };
      games = result.games;
      archiveYear = result.year;
      archiveMonth = result.month;
    }
  }

  let analyzedUuids = new Set<string>();
  let progressPoints: ProgressPoint[] = [];
  let patternEntries: PatternSummaryEntry[] = [];
  let drillMarkers: number[] = []; // unix timestamps (day-level) when user practiced drills
  let profileData: ProfileData | null = null;
  let accuracyRecord: Record<string, { white: number; black: number }> = {};

  // only load personal analysis on the home dashboard, not on public browse pages
  if (userId && basePath === '/') {
    try {
      await connectDB();
      const [allAnalyzed, drillDocs, profileDoc] = await Promise.all([
        GameAnalysis.find(
          { clerkUserId: userId },
          { gameUuid: 1, pgn: 1, playerSide: 1, evals: 1, turningPoints: 1, patterns: 1, accuracy: 1, analyzedAt: 1 },
        ).lean(),
        DrillSession.find(
          { clerkUserId: userId, solved: true },
          { createdAt: 1 },
        ).lean(),
        UserProfile.findOne(
          { clerkUserId: userId },
          { plan: 1, targetRating: 1, timePreference: 1, experience: 1, selfReportedWeakness: 1 },
        ).lean(),
      ]);

      profileData = {
        plan: (profileDoc?.plan ?? 'free') as 'free' | 'paid',
        ...(profileDoc?.targetRating != null ? { targetRating: profileDoc.targetRating as number } : {}),
        ...(profileDoc?.timePreference ? { timePreference: profileDoc.timePreference as string } : {}),
        ...(profileDoc?.experience ? { experience: profileDoc.experience as string } : {}),
        ...(profileDoc?.selfReportedWeakness ? { selfReportedWeakness: profileDoc.selfReportedWeakness as string } : {}),
      };

      analyzedUuids = new Set(allAnalyzed.map((a) => a.gameUuid as string));

      // build uuid → accuracy lookup for GamesTable badges
      allAnalyzed.forEach((a) => {
        const acc = a.accuracy as { white: number; black: number } | undefined;
        if (acc) accuracyRecord[a.gameUuid as string] = acc;
      });

      progressPoints = allAnalyzed
        .map((a) => {
          const side = a.playerSide as 'white' | 'black';
          const acc = a.accuracy as { white: number; black: number } | undefined;
          const storedAccuracy = acc ? acc[side] : undefined;
          return buildProgressPoint(
            a.gameUuid as string,
            a.pgn as string,
            side,
            (a.evals ?? []) as PositionEval[],
            (a.turningPoints ?? []) as TurningPoint[],
            storedAccuracy,
          );
        })
        .filter((p): p is ProgressPoint => p !== null);

      const gamePatternEntries: GamePatternEntry[] = allAnalyzed.map((a) => ({
        patterns: (a.patterns ?? []) as Pattern[],
        date: a.analyzedAt instanceof Date ? a.analyzedAt : new Date(a.analyzedAt as Date),
      }));
      patternEntries = aggregatePatterns(
        gamePatternEntries,
        profileData?.selfReportedWeakness,
      );

      // group drill sessions by day — one marker per day practiced
      const seenDays = new Set<number>();
      drillDocs.forEach((d) => {
        if (d.createdAt) {
          const dayTs = Math.floor(new Date(d.createdAt as Date).getTime() / 1000 / 86400) * 86400;
          seenDays.add(dayTs);
        }
      });
      seenDays.forEach((day) => drillMarkers.push(day));
    } catch {
      // non-fatal
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        <header className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-baseline gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{userName}</h1>
                {basePath === '/' && <ChangeUsernameButton />}
              </div>
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
                basePath={basePath}
              />
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {errorMessage ? 0 : games.length} games
              </div>
            </div>
          </div>
        </header>

        <UserPageTabs
          games={games}
          userName={userName}
          archiveYear={archiveYear}
          archiveMonth={archiveMonth}
          analyzedUuidsList={Array.from(analyzedUuids)}
          errorMessage={errorMessage}
          progressPoints={progressPoints}
          patternEntries={patternEntries}
          drillMarkers={drillMarkers}
          isOwner={Boolean(userId && basePath === '/')}
          activeTab={basePath === '/' ? tab : 'games'}
          profileData={profileData}
          accuracyRecord={accuracyRecord}
        />
      </div>
    </main>
  );
}

// standalone "missing username" card used by /user page
export function MissingUsernamePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <h1 className="text-2xl font-semibold">missing username</h1>
          <p className="text-sm text-muted-foreground">
            go back and enter a chess.com username.
          </p>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            ← back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
