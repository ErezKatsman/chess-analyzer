// lib/utils/user.ts
import type { IGame } from '../interfaces/games';
import {
  checkUserExists,
  fetchLatestMonthlyGames,
  fetchLatestMonthlyGamesWithArchive,
  fetchMonthlyGames,
} from '../services/chesscom';

export { checkUserExists, fetchMonthlyGames };

export type LatestArchiveGames = {
  games: IGame[];
  year: number;
  month: number;
};

function normalizeUserName(raw: string): string {
  const value = raw.trim();
  if (!value) return '';

  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value;
  }
}

// generic setter types so this file doesn't need to import react types
type SetBoolean = (next: boolean) => void;
type SetNullableString = (next: string | null) => void;

export async function checkAndSetUserExists(
  setIsClickable: SetBoolean,
  setError: SetNullableString,
  userName: string,
): Promise<void> {
  const normalizedUserName = normalizeUserName(userName);

  if (!normalizedUserName) {
    setIsClickable(false);
    setError(null);
    return;
  }

  try {
    const exists = await checkUserExists(normalizedUserName);

    if (exists) {
      setIsClickable(true);
      setError(null);
      return;
    }

    setIsClickable(false);
    setError('User not found. Please try again.');
  } catch {
    setIsClickable(false);
    setError('User not found. Please try again.');
  }
}

// backward compatible alias used by ConnectAccount
export const checkAndSetUserExist = checkAndSetUserExists;

// backward compatible: now fetches the latest month automatically
export async function fetchGames(userName: string): Promise<IGame[]> {
  return fetchLatestMonthlyGames(normalizeUserName(userName));
}

// new: fetch games + pinned archive year/month
export async function fetchGamesWithArchive(userName: string): Promise<LatestArchiveGames> {
  const normalizedUserName = normalizeUserName(userName);
  const result = await fetchLatestMonthlyGamesWithArchive(normalizedUserName);

  return {
    games: result.games,
    year: result.year,
    month: result.month,
  };
}
