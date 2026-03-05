import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { connectDB } from '@/lib/db/mongo';
import { DrillSession, UserProfile } from '@/lib/db/schemas';
import { WeaknessDrills } from '@/components/WeaknessDrills';

export const dynamic = 'force-dynamic';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

type GameStat = {
  uuid: string;
  total: number;
  solved: number;
  accuracy: number;
  lastAttempt: Date;
};

export default async function DrillsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  await connectDB();

  const [sessions, profile] = await Promise.all([
    DrillSession.find({ clerkUserId: userId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    UserProfile.findOne({ clerkUserId: userId }).lean(),
  ]);

  const userName = profile?.chessUsername ?? '';
  const solvedSessions = sessions.filter((s) => s.solved);

  // group sessions by game to compute per-game accuracy
  type LeanSession = (typeof sessions)[number];
  const byGame = sessions.reduce<Record<string, LeanSession[]>>((acc, s) => {
    if (!acc[s.gameUuid]) acc[s.gameUuid] = [];
    acc[s.gameUuid].push(s);
    return acc;
  }, {});

  const gameStats: GameStat[] = Object.entries(byGame)
    .map(([uuid, gs]) => {
      const solvedCount = gs.filter((s) => s.solved).length;
      const total = gs.length;
      const accuracy = total > 0 ? Math.round((solvedCount / total) * 100) : 0;
      // find the most recent attempt across all drills in this game
      const lastAttempt = gs.reduce<Date>(
        (latest, s) => (new Date(s.createdAt) > new Date(latest) ? s.createdAt : latest),
        gs[0].createdAt,
      );
      return { uuid, total, solved: solvedCount, accuracy, lastAttempt };
    })
    .sort((a, b) => a.accuracy - b.accuracy); // weakest first

  const accuracyColor = (pct: number) =>
    pct < 50 ? 'text-red-500 font-semibold' : pct < 80 ? 'text-yellow-500' : 'text-green-500';

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">

        {/* header */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">drill history</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {sessions.length} drills attempted · {solvedSessions.length} solved · {sessions.length - solvedSessions.length} missed
              </p>
            </div>
            <Link
              href="/?tab=games"
              className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
            >
              ← back to games
            </Link>
          </div>

          {/* overall accuracy pills */}
          {sessions.length > 0 && (
            <div className="flex gap-3 mt-4">
              <div className="flex flex-col items-center rounded-lg bg-green-500/10 px-4 py-2 min-w-[56px]">
                <span className="text-lg font-bold text-green-500">{solvedSessions.length}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">solved</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-red-500/10 px-4 py-2 min-w-[56px]">
                <span className="text-lg font-bold text-red-500">{sessions.length - solvedSessions.length}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">missed</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-muted/40 px-4 py-2 min-w-[56px]">
                <span className="text-lg font-bold">
                  {sessions.length > 0 ? Math.round((solvedSessions.length / sessions.length) * 100) : 0}%
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">accuracy</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-muted/40 px-4 py-2 min-w-[56px]">
                <span className="text-lg font-bold">{gameStats.length}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">games</span>
              </div>
            </div>
          )}
        </div>

        {/* cross-game weakness drill practice — fetches its own data client-side */}
        <WeaknessDrills />

        {sessions.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 shadow-sm text-center">
            <p className="text-2xl mb-2">♟</p>
            <p className="font-semibold">no drills yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              analyze a game and click &quot;practice blunders&quot; to start drilling.
            </p>
            <Link
              href="/?tab=games"
              className="mt-4 inline-block text-sm underline underline-offset-4"
            >
              go to my games →
            </Link>
          </div>
        ) : (
          <>
            {/* accuracy by game — weakest first */}
            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold">accuracy by game</h2>
                <p className="text-xs text-muted-foreground">weakest games first — retry to practice again</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">game</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">drills</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">solved</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">accuracy</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">last tried</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {gameStats.map((g) => (
                    <tr key={g.uuid} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {g.uuid.slice(0, 10)}…
                      </td>
                      <td className="px-4 py-3">{g.total}</td>
                      <td className="px-4 py-3">
                        <span className="text-green-500">{g.solved}</span>
                        <span className="text-muted-foreground"> / {g.total}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={accuracyColor(g.accuracy)}>{g.accuracy}%</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(g.lastAttempt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {userName ? (
                          <Link
                            href={`/game?uuid=${g.uuid}&userName=${encodeURIComponent(userName)}`}
                            className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground"
                          >
                            retry →
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* drill log — flat session list */}
            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold">drill log</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">result</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">move</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">attempts</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">date</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">game</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sessions.map((s) => (
                    <tr key={String(s._id)} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        {s.solved ? (
                          <span className="inline-flex items-center gap-1 text-green-500 font-semibold text-xs">
                            ✓ solved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500 font-semibold text-xs">
                            ✗ missed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        move {s.moveNumber} · {s.side}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.attempts}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {userName ? (
                          <Link
                            href={`/game?uuid=${s.gameUuid}&userName=${encodeURIComponent(userName)}`}
                            className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground"
                          >
                            open game →
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">
                            {s.gameUuid.slice(0, 8)}…
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
