// server-only — do not import from client components.
// wraps chess.com fetch functions with mongodb caching.

import type { IGame } from '@/lib/interfaces/games';
import { transformChessComGames } from '@/lib/mappers/chesscom';
import {
  fetchMonthlyGamesRaw,
  fetchUserArchives,
} from '@/lib/services/chesscom';
import { getCachedGames, setCachedGames } from './gamesCache';

type FetchMonthlyArgs = { userName: string; year: number; month: number };

export type CachedMonthResult = {
  games: IGame[];
  year: number;
  month: number;
};

// cached version of fetchMonthlyGames — checks mongodb first, falls back to chess.com
export async function fetchMonthlyGamesCached({
  userName,
  year,
  month,
}: FetchMonthlyArgs): Promise<IGame[]> {
  const cached = await getCachedGames(userName, year, month);
  if (cached) return transformChessComGames(cached, userName);

  const raw = await fetchMonthlyGamesRaw({ userName, year, month });
  void setCachedGames(userName, year, month, raw);
  return transformChessComGames(raw, userName);
}

// fetches the latest archive month, checks cache before hitting chess.com for games
export async function fetchLatestMonthlyGamesCached(
  userName: string,
): Promise<CachedMonthResult> {
  // archives call is cheap — just a small json list of urls
  const archives = await fetchUserArchives(userName);
  if (!archives.length) return { games: [], year: 0, month: 0 };

  const { year, month } = archives[0]!; // sorted newest first

  const games = await fetchMonthlyGamesCached({ userName, year, month });
  return { games, year, month };
}
