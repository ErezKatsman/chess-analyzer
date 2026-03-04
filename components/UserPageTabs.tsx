'use client';

import Link from 'next/link';
import type { IGame } from '@/lib/interfaces/games';
import type { ProgressPoint } from '@/lib/analysis/progressUtils';
import type { PatternSummaryEntry } from '@/lib/analysis/patternSummary';
import { GamesTable } from '@/components/GamesTable';
import { StatsBar } from '@/components/StatsBar';
import { ProgressChart } from '@/components/ProgressChart';
import { PatternSummary } from '@/components/PatternSummary';
import { ChangeUsernameButton } from '@/components/ChangeUsernameButton';
import { RatingHeroCard } from '@/components/RatingHeroCard';
import { CoachBanner } from '@/components/CoachBanner';

type Tab = 'coach' | 'progress' | 'games' | 'profile' | 'settings';

interface Props {
  games: IGame[];
  userName: string;
  archiveYear: number;
  archiveMonth: number;
  analyzedUuidsList: string[]; // array — Set can't cross server/client boundary
  errorMessage: string | null;
  progressPoints: ProgressPoint[];
  patternEntries: PatternSummaryEntry[];
  drillMarkers: number[]; // unix timestamps (day-level) when user drilled
  isOwner: boolean;
  activeTab: string;
}

const OWNER_TABS: { key: Tab; label: string }[] = [
  { key: 'coach',    label: 'Coach'      },
  { key: 'progress', label: 'Progress'   },
  { key: 'games',    label: 'Games'      },
  { key: 'profile',  label: 'My Profile' },
  { key: 'settings', label: 'Settings'   },
];

export function UserPageTabs({
  games,
  userName,
  archiveYear,
  archiveMonth,
  analyzedUuidsList,
  errorMessage,
  progressPoints,
  patternEntries,
  drillMarkers,
  isOwner,
  activeTab,
}: Props) {
  const VALID_TABS = OWNER_TABS.map(t => t.key);
  const tab: Tab = (VALID_TABS.includes(activeTab as Tab) ? activeTab : 'coach') as Tab;
  const analyzedUuids = new Set(analyzedUuidsList);
  const hasInsights = progressPoints.length > 0;

  return (
    <div className="space-y-6">
      {/* tab strip */}
      <div className="flex gap-0.5 border-b overflow-x-auto">
        {(isOwner ? OWNER_TABS : [{ key: 'games' as Tab, label: 'Games' }]).map(({ key, label }) => (
          <Link
            key={key}
            href={`/?tab=${key}`}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Coach tab ── */}
      {tab === 'coach' && isOwner && (
        <div className="space-y-6">
          {hasInsights ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <RatingHeroCard progressPoints={progressPoints} />
                {patternEntries[0] && (
                  <CoachBanner topPattern={patternEntries[0]} totalGames={progressPoints.length} />
                )}
              </div>
              <PatternSummary entries={patternEntries} totalGames={progressPoints.length} />
            </>
          ) : (
            <div className="rounded-2xl border bg-card p-6 shadow-sm text-center space-y-2">
              <p className="text-sm font-semibold">no coaching data yet</p>
              <p className="text-sm text-muted-foreground">
                analyze a game to see your patterns and get personalized coaching.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Progress tab ── */}
      {tab === 'progress' && isOwner && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-semibold mb-1">your progress</h2>
            <p className="text-xs text-muted-foreground mb-4">
              accuracy &amp; rating across {progressPoints.length} analyzed game
              {progressPoints.length !== 1 ? 's' : ''}
              <span className="inline-flex gap-3 ml-2">
                <span><span className="text-emerald-400">●</span> win</span>
                <span><span className="text-red-400">●</span> loss</span>
                <span><span className="text-slate-400">●</span> draw</span>
              </span>
            </p>
            {hasInsights ? (
              <ProgressChart data={progressPoints} drillMarkers={drillMarkers} />
            ) : (
              <p className="text-sm text-muted-foreground">analyze games to see your progress.</p>
            )}
          </section>
          <PatternSummary entries={patternEntries} totalGames={progressPoints.length} />
        </div>
      )}

      {/* ── Games tab ── */}
      {(tab === 'games' || !isOwner) && (
        <>
          {errorMessage ? (
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
              <div className="text-sm font-semibold text-destructive">error</div>
              <div className="text-sm text-muted-foreground">{errorMessage}</div>
              <div className="text-xs text-muted-foreground">
                tip: if the username exists, chess.com might be rate-limiting or temporarily down.
              </div>
            </div>
          ) : games.length === 0 ? (
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
              <div className="text-sm font-semibold">no games found</div>
              <div className="text-sm text-muted-foreground">
                this user may have no games in the selected archive month.
              </div>
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

      {/* ── Profile tab ── */}
      {tab === 'profile' && isOwner && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 max-w-md">
          <h2 className="text-sm font-semibold">chess.com account</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">linked chess.com username</p>
            </div>
            <ChangeUsernameButton />
          </div>
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === 'settings' && isOwner && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold">settings</h2>
          <p className="text-sm text-muted-foreground">more options coming soon.</p>
        </div>
      )}
    </div>
  );
}
