import Link from 'next/link';

import type { IGame } from '@/lib/interfaces/games';
import { fetchGamesWithArchive } from '@/lib/userUtils';
import { GamesTable } from '@/components/GamesTable';

interface UserPageProps {
  searchParams: {
    userName?: string;
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

  let games: IGame[] = [];
  let archiveYear = 0;
  let archiveMonth = 0;
  let errorMessage: string | null = null;

  try {
    const result = await fetchGamesWithArchive(userName);
    games = result.games;
    archiveYear = result.year;
    archiveMonth = result.month;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'failed to fetch games';
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        <header className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{userName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                games fetched from chess.com monthly archive
                {archiveYear && archiveMonth
                  ? ` • ${archiveYear}-${String(archiveMonth).padStart(2, '0')}`
                  : ''}
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              {errorMessage ? 0 : games.length} games
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
              this user may have no games in the latest archive month.
            </div>
          </CardShell>
        ) : (
          <GamesTable
            userName={userName}
            games={games}
            archiveYear={archiveYear}
            archiveMonth={archiveMonth}
          />
        )}
      </div>
    </main>
  );
}
