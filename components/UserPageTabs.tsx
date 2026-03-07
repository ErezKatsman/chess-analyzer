'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { IGame } from '@/lib/interfaces/games';
import type { ProgressPoint } from '@/lib/analysis/progressUtils';
import type { PatternSummaryEntry } from '@/lib/analysis/patternSummary';
import { GamesTable } from '@/components/GamesTable';
import { StatsBar } from '@/components/StatsBar';
import { ProgressChart, type ChartPoint } from '@/components/ProgressChart';
import { PatternSummary } from '@/components/PatternSummary';
import { ChangeUsernameButton } from '@/components/ChangeUsernameButton';
import { RatingHeroCard } from '@/components/RatingHeroCard';
import { CoachBanner } from '@/components/CoachBanner';
import { PaywallModal } from '@/components/PaywallModal';
import { QuickAnalysisLoader, QUICK_ANALYSIS_KEY } from '@/components/QuickAnalysisLoader';

export type ProfileData = {
  plan: 'free' | 'paid';
  targetRating?: number;
  timePreference?: string;
  experience?: string;
  selfReportedWeakness?: string;
};

type Tab = 'coach' | 'progress' | 'games' | 'profile';

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
  profileData?: ProfileData | null;
  // per-game player accuracy: uuid → { white, black }
  accuracyRecord?: Record<string, { white: number; black: number }>;
  // per-game player training score: uuid → { white, black } — derived from avgCpLoss
  trainingScoreRecord?: Record<string, { white: number; black: number }>;
}

const OWNER_TABS: { key: Tab; label: string }[] = [
  { key: 'coach',    label: 'Coach'      },
  { key: 'progress', label: 'Progress'   },
  { key: 'games',    label: 'Games'      },
  { key: 'profile',  label: 'My Profile' },
];

// drills tab links out to /drills — separate route, not a dashboard sub-tab
const DRILLS_HREF = '/drills';

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
  profileData,
  accuracyRecord,
  trainingScoreRecord,
}: Props) {
  const searchParams = useSearchParams();
  const [showPaywall, setShowPaywall] = useState(false);
  // null = not yet fetched or fetch failed; 0 = no drills due; >0 = show badge
  const [dueCount, setDueCount] = useState<number | null>(null);
  // true when user just connected for the first time and has no analyzed games yet
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (analyzedUuidsList.length === 0 && sessionStorage.getItem(QUICK_ANALYSIS_KEY) === '1') {
      setShowLoader(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    fetch('/api/drills/generated')
      .then(r => r.json())
      .then((data: { dueCount?: number }) => {
        if (typeof data.dueCount === 'number') setDueCount(data.dueCount);
      })
      .catch(() => {
        // silently ignore — badge just won't show
      });
  }, [isOwner]);
  const VALID_TABS = OWNER_TABS.map(t => t.key);
  const tab: Tab = (VALID_TABS.includes(activeTab as Tab) ? activeTab : 'coach') as Tab;
  const analyzedUuids = new Set(analyzedUuidsList);

  // count rated games per time class → default to the most-played one
  const tcCounts: Record<string, number> = {};
  games.filter(g => g.rated).forEach(g => {
    tcCounts[g.timeClass] = (tcCounts[g.timeClass] ?? 0) + 1;
  });
  // sorted descending by count so default is the most-played time class
  const availableTcs = Object.keys(tcCounts).sort((a, b) => tcCounts[b] - tcCounts[a]);
  const [selectedTc, setSelectedTc] = useState<string>(() => availableTcs[0] ?? 'blitz');

  // build tab href preserving current year/month params
  function tabHref(key: string): string {
    const params = new URLSearchParams({ tab: key });
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    return `/?${params.toString()}`;
  }
  const hasInsights = progressPoints.length > 0;

  // merge all games' ratings with analysis data — filtered to selected time class
  const analysisMap = new Map(progressPoints.map(p => [p.gameUuid, p]));
  const allChartPoints: ChartPoint[] = games
    .filter(g => g.rated && g.timeClass === selectedTc)
    .map(g => {
      const rating = g.isWhite ? g.players.white.rating : g.players.black.rating;
      const result: 'win' | 'loss' | 'draw' = g.isWon ? 'win' : g.isDraw ? 'draw' : 'loss';
      const analyzed = analysisMap.get(g.uuid);
      return {
        date: g.endTime,
        rating,
        result,
        ...(analyzed ? { accuracy: analyzed.accuracy, trainingScore: analyzed.trainingScore, blunders: analyzed.blunders, mistakes: analyzed.mistakes } : {}),
      };
    })
    .filter(p => p.rating > 0)
    .sort((a, b) => a.date - b.date);

  // first-time connect: show progress loader, then redirect to Coach tab
  if (showLoader) {
    return <QuickAnalysisLoader games={games} userName={userName} />;
  }

  return (
    <div className="space-y-6">
      {/* tab strip */}
      <div className="flex gap-0.5 border-b overflow-x-auto">
        {(isOwner ? OWNER_TABS : [{ key: 'games' as Tab, label: 'Games' }]).map(({ key, label }) => (
          <Link
            key={key}
            href={tabHref(key)}
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
        {/* drills tab — links to /drills (separate protected route) */}
        {isOwner && (
          <Link
            href={DRILLS_HREF}
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap inline-flex items-center"
          >
            Drills
            {dueCount !== null && dueCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {dueCount}
              </span>
            )}
          </Link>
        )}
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
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <div className="flex flex-col items-center text-center px-8 py-14 space-y-6">
                {/* bouncing chess piece */}
                <motion.div
                  animate={{ y: [0, -14, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-7xl select-none"
                >
                  ♟
                </motion.div>

                <div className="space-y-2 max-w-sm">
                  <h2 className="text-xl font-bold">your coach is waiting</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    analyze a game and unlock your personal coaching plan — see your patterns,
                    prove your progress, and sharpen the skills that matter most.
                  </p>
                </div>

                {/* feature pills */}
                <div className="flex flex-wrap justify-center gap-2">
                  {['📊 track your patterns', '📈 prove you\'re improving', '🎯 targeted drills'].map(f => (
                    <motion.span
                      key={f}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 * ['📊 track your patterns', '📈 prove you\'re improving', '🎯 targeted drills'].indexOf(f) }}
                      className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground"
                    >
                      {f}
                    </motion.span>
                  ))}
                </div>

                <Link
                  href={tabHref('games')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  analyze your first game →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Progress tab ── */}
      {tab === 'progress' && isOwner && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-1">
              <h2 className="text-sm font-semibold">your progress</h2>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* time-class filter pills */}
                {availableTcs.length > 1 && (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {availableTcs.map(tc => (
                      <button
                        key={tc}
                        onClick={() => setSelectedTc(tc)}
                        className={[
                          'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors capitalize',
                          selectedTc === tc
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                      >
                        {tc} <span className="opacity-60">({tcCounts[tc]})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>{/* end metric + time-class controls */}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {selectedTc} — training score &amp; rating across {allChartPoints.filter(p => p.trainingScore != null).length} analyzed game
              {allChartPoints.filter(p => p.trainingScore != null).length !== 1 ? 's' : ''} of {allChartPoints.length} total
              <span className="inline-flex gap-3 ml-2">
                <span><span className="text-emerald-400">●</span> win</span>
                <span><span className="text-red-400">●</span> loss</span>
                <span><span className="text-slate-400">●</span> draw</span>
              </span>
            </p>
            <ProgressChart data={allChartPoints} drillMarkers={drillMarkers} />
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
                accuracyRecord={accuracyRecord}
                trainingScoreRecord={trainingScoreRecord}
                isOwner={isOwner}
              />
            </>
          )}
        </>
      )}

      {/* ── Profile tab ── */}
      {tab === 'profile' && isOwner && (
        <>
          <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
          <div className="grid gap-6 lg:grid-cols-2 max-w-2xl">
            {/* account section */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold">account</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">chess.com username</p>
                </div>
                <ChangeUsernameButton />
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                {profileData?.plan === 'paid' ? (
                  <p className="text-sm font-medium text-emerald-500">✓ premium · unlimited</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">free · 10 lifetime analyses</p>
                    <button
                      onClick={() => setShowPaywall(true)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      upgrade →
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* goals section */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold">your goals</h2>
              {profileData?.targetRating || profileData?.timePreference || profileData?.experience || profileData?.selfReportedWeakness ? (
                <dl className="space-y-3 text-sm">
                  {profileData?.targetRating && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">target rating</dt>
                      <dd className="font-medium">{profileData.targetRating}</dd>
                    </div>
                  )}
                  {profileData?.timePreference && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">time preference</dt>
                      <dd className="font-medium capitalize">{profileData.timePreference}</dd>
                    </div>
                  )}
                  {profileData?.experience && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">experience</dt>
                      <dd className="font-medium capitalize">{profileData.experience}</dd>
                    </div>
                  )}
                  {profileData?.selfReportedWeakness && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">top weakness</dt>
                      <dd className="font-medium capitalize">{profileData.selfReportedWeakness}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  no goals set. complete onboarding to add goals.
                </p>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
