// thin cache layer for chess.com monthly game fetches.
// past months are effectively immutable → 24h TTL.
// current month can gain new games → 15min TTL.

import type { IChessGameRes } from '@/lib/interfaces/games';
import { connectDB } from './mongo';
import { CachedGames } from './schemas';

const PAST_MONTH_TTL_MS = 24 * 60 * 60 * 1000;   // 24 hours
const CURRENT_MONTH_TTL_MS = 15 * 60 * 1000;      // 15 minutes

function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month;
}

function ttlMs(year: number, month: number): number {
  return isCurrentMonth(year, month) ? CURRENT_MONTH_TTL_MS : PAST_MONTH_TTL_MS;
}

export async function getCachedGames(
  userName: string,
  year: number,
  month: number,
): Promise<IChessGameRes[] | null> {
  try {
    await connectDB();
    const doc = await CachedGames.findOne({
      userName: userName.toLowerCase(),
      year,
      month,
    }).lean();

    if (!doc) return null;

    // check if the cache entry is still fresh
    const age = Date.now() - doc.fetchedAt.getTime();
    if (age > ttlMs(year, month)) return null;

    return doc.games as IChessGameRes[];
  } catch {
    // db unavailable — skip cache, fetch live
    return null;
  }
}

export async function setCachedGames(
  userName: string,
  year: number,
  month: number,
  games: IChessGameRes[],
): Promise<void> {
  try {
    await connectDB();
    await CachedGames.findOneAndUpdate(
      { userName: userName.toLowerCase(), year, month },
      { userName: userName.toLowerCase(), year, month, games, fetchedAt: new Date() },
      { upsert: true },
    );
  } catch {
    // non-fatal — if we can't cache, the live fetch still worked
  }
}
