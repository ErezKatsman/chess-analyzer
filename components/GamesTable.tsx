import Link from 'next/link';
import type { IGame } from '@/lib/interfaces/games';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatEndTime,
  resultBadgeClass,
  colorBadgeClass,
  buildAnalyzeHref,
  safeOpening,
} from '@/lib/utils/game';

type GamesTableProps = {
  userName: string;
  games: IGame[];
  archiveYear: number;
  archiveMonth: number; // 1-12
  analyzedUuids?: Set<string>;
};

export function GamesTable({ userName, games, archiveYear, archiveMonth, analyzedUuids }: GamesTableProps) {
  const sortedGames = [...games].sort((a, b) => b.endTime - a.endTime);

  return (
    <section className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="p-5 border-b flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-base font-semibold tracking-tight">games</div>
          <div className="text-xs text-muted-foreground">{sortedGames.length} total</div>
        </div>

        <div className="text-xs text-muted-foreground">
          analyzing <span className="font-semibold text-foreground">{userName}</span>
          {archiveYear && archiveMonth ? (
            <>
              <span className="mx-2">·</span>
              <span>
                {archiveYear}-{String(archiveMonth).padStart(2, '0')}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="w-full overflow-auto">
        <Table className="min-w-[1020px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">result</TableHead>
              <TableHead className="w-[110px]">color</TableHead>
              <TableHead>opponent</TableHead>
              <TableHead className="w-[320px]">opening</TableHead>
              <TableHead className="w-[140px]">time</TableHead>
              <TableHead className="w-[190px] text-right">ended</TableHead>
              <TableHead className="w-[120px] text-right">actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedGames.map((game) => {
              const opponentName = game.opponent.name;
              const opponentRating = game.opponent.rating;
              const myRating = game.isWhite ? game.players.white.rating : game.players.black.rating;

              const opening = safeOpening(game.gameDetails.opening);
              const analyzeHref = buildAnalyzeHref(userName, game, archiveYear, archiveMonth);
              const isAnalyzed = analyzedUuids?.has(game.uuid) ?? false;

              return (
                <TableRow
                  key={game.uuid}
                  className="odd:bg-muted/30 hover:bg-muted/40 transition-colors"
                >
                  <TableCell>
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold',
                        resultBadgeClass(game.isWon, game.isDraw),
                      ].join(' ')}
                      title={game.gameDetails.result}
                    >
                      {game.isDraw ? 'draw' : game.isWon ? 'win' : 'loss'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold',
                        colorBadgeClass(game.isWhite),
                      ].join(' ')}
                    >
                      {game.isWhite ? 'white' : 'black'}
                    </span>
                  </TableCell>

                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{opponentName}</span>
                        <span className="text-xs text-muted-foreground">({opponentRating})</span>
                        <span className="text-xs text-muted-foreground">· you {myRating}</span>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <Link
                          href={game.opponent.profile}
                          target="_blank"
                          className="underline underline-offset-2 hover:opacity-80"
                        >
                          profile
                        </Link>
                        <span className="mx-2">·</span>
                        <Link
                          href={game.url}
                          target="_blank"
                          className="underline underline-offset-2 hover:opacity-80"
                        >
                          game
                        </Link>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="max-w-[320px] truncate" title={opening}>
                      {opening}
                    </div>

                    {game.gameDetails.ecoUrl ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <Link
                          href={game.gameDetails.ecoUrl}
                          target="_blank"
                          className="underline underline-offset-2 hover:opacity-80"
                        >
                          eco
                        </Link>
                      </div>
                    ) : null}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">{game.timeClass}</div>
                    <div className="text-xs text-muted-foreground">{game.timeControl}</div>
                  </TableCell>

                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatEndTime(game.endTime)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      {isAnalyzed && (
                        <span className="text-[10px] font-semibold text-emerald-500">
                          ✓ analyzed
                        </span>
                      )}
                      <Link
                        href={analyzeHref}
                        className={[
                          'inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                          isAnalyzed
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
                            : 'hover:bg-muted/50',
                        ].join(' ')}
                        aria-label={`${isAnalyzed ? 'view analysis' : 'analyze'} game vs ${opponentName}`}
                      >
                        {isAnalyzed ? 'view analysis' : 'analyze'}
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 border-t text-xs text-muted-foreground">
        next step: open a game → we’ll add move grading + best-move suggestions
      </div>
    </section>
  );
}
