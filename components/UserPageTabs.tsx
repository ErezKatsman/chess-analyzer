'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { IGame } from '@/lib/interfaces/games';
import type { ProgressPoint } from '@/lib/analysis/progressUtils';
import type { PatternSummaryEntry } from '@/lib/analysis/patternSummary';
import { GamesTable } from '@/components/GamesTable';
import { StatsBar } from '@/components/StatsBar';
import { ProgressChart } from '@/components/ProgressChart';
import { PatternSummary } from '@/components/PatternSummary';

type Tab = 'games' | 'progress';

interface Props {
  // games tab
  games: IGame[];
  userName: string;
  archiveYear: number;
  archiveMonth: number;
  analyzedUuidsList: string[]; // array — Set can't cross server/client boundary
  errorMessage: string | null;
  // progress tab
  progressPoints: ProgressPoint[];
  patternEntries: PatternSummaryEntry[];
  // false = public browse mode (no analyze buttons, no personal data)
  isOwner: boolean;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function UserPageTabs({
  games,
  userName,
  archiveYear,
  archiveMonth,
  analyzedUuidsList,
  errorMessage,
  progressPoints,
  patternEntries,
  isOwner,
}: Props) {
  const [tab, setTab] = useState<Tab>('games');
  const analyzedUuids = new Set(analyzedUuidsList);
  const hasInsights = progressPoints.length > 0;

  return (
    <div className="space-y-6">
      {/* tab strip */}
      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'games'} onClick={() => setTab('games')}>
          games
        </TabButton>
        {hasInsights && (
          <TabButton active={tab === 'progress'} onClick={() => setTab('progress')}>
            progress
          </TabButton>
        )}
      </div>

      {/* games tab */}
      {tab === 'games' && (
        <>
          {errorMessage ? (
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
              <div className="text-sm font-semibold text-destructive">error</div>
              <div className="text-sm text-muted-foreground">{errorMessage}</div>
              <div className="text-xs text-muted-foreground">
                tip: if the username exists, chess.com might be rate-limiting or temporarily down.
              </div>
              <Link
                href="/"
                className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                ← back to home
              </Link>
            </div>
          ) : games.length === 0 ? (
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
              <div className="text-sm font-semibold">no games found</div>
              <div className="text-sm text-muted-foreground">
                this user may have no games in the selected archive month.
              </div>
              <Link
                href="/"
                className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                ← back to home
              </Link>
            </div>
          ) : (
            <>
              <StatsBar games={games} userName={userName} />
              <GamesTable
                userName={userName}
                games={games}
                archiveYear={archiveYear}
                archiveMonth={archiveMonth}
                analyzedUuids={analyzedUuids}
                isOwner={isOwner}
              />
            </>
          )}
        </>
      )}

      {/* progress tab */}
      {tab === 'progress' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-semibold mb-1">your progress</h2>
            <p className="text-xs text-muted-foreground mb-4">
              accuracy &amp; rating across {progressPoints.length} analyzed game
              {progressPoints.length !== 1 ? 's' : ''}
              <span className="inline-flex gap-3 ml-2">
                <span>
                  <span className="text-emerald-400">●</span> win
                </span>
                <span>
                  <span className="text-red-400">●</span> loss
                </span>
                <span>
                  <span className="text-slate-400">●</span> draw
                </span>
              </span>
            </p>
            <ProgressChart data={progressPoints} />
          </section>

          <PatternSummary entries={patternEntries} totalGames={progressPoints.length} />
        </div>
      )}
    </div>
  );
}
