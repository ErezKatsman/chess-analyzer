// lib/services/chesscom.ts
import type { IChessGameRes, IGame, IUserGamesRes } from '../interfaces/games';
import { transformChessComGames } from '../mappers/chesscom';

type ArchivesRes = {
  archives?: string[];
};

type FetchMonthlyGamesArgs = {
  userName: string;
  year: number;
  month: number; // 1-12
};

export type LatestMonthlyGamesWithArchive = {
  games: IGame[];
  year: number;
  month: number; // 1-12
  archiveUrl: string;
};

function normalizeUserName(userName: string): string {
  return userName.trim();
}

function encodeUserName(userName: string): string {
  return encodeURIComponent(userName);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function assertValidYearMonth(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    throw new Error(`invalid year: ${year}`);
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`invalid month: ${month}`);
  }
}

function parseArchiveYearMonth(archiveUrl: string): { year: number; month: number } | null {
  // archive urls end with /games/yyyy/mm
  const match = archiveUrl.match(/\/games\/(\d{4})\/(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;

  return { year, month };
}

async function fetchJson<T>(url: string): Promise<{ res: Response; data: T | null }> {
  const res = await fetch(url, { cache: 'no-store' });

  try {
    const data = (await res.json()) as T;
    return { res, data };
  } catch {
    return { res, data: null };
  }
}

export async function checkUserExists(userName: string): Promise<boolean> {
  const normalizedUserName = normalizeUserName(userName);
  if (!normalizedUserName) return false;

  const url = `https://api.chess.com/pub/player/${encodeUserName(normalizedUserName)}`;
  const { res, data } = await fetchJson<{ player_id?: number }>(url);

  if (!res.ok) return false;
  return Boolean(data?.player_id);
}

export async function fetchMonthlyGamesRaw({
  userName,
  year,
  month,
}: FetchMonthlyGamesArgs): Promise<IChessGameRes[]> {
  const normalizedUserName = normalizeUserName(userName);
  if (!normalizedUserName) return [];

  assertValidYearMonth(year, month);

  const monthStr = pad2(month);
  const url = `https://api.chess.com/pub/player/${encodeUserName(normalizedUserName)}/games/${year}/${monthStr}`;

  const { res, data } = await fetchJson<IUserGamesRes>(url);

  // chess.com returns 404 if that month has no archive / no games
  if (res.status === 404) return [];

  if (!res.ok) {
    throw new Error(`failed to fetch games: ${res.status}`);
  }

  const games = data?.games;
  return Array.isArray(games) ? games : [];
}

export async function fetchMonthlyGames(args: FetchMonthlyGamesArgs): Promise<IGame[]> {
  const games = await fetchMonthlyGamesRaw(args);
  return transformChessComGames(games, args.userName);
}

export async function fetchLatestMonthlyGamesWithArchive(
  userName: string,
): Promise<LatestMonthlyGamesWithArchive> {
  const normalizedUserName = normalizeUserName(userName);
  if (!normalizedUserName) {
    return { games: [], year: 0, month: 0, archiveUrl: '' };
  }

  const archivesUrl = `https://api.chess.com/pub/player/${encodeUserName(normalizedUserName)}/games/archives`;
  const { res: archivesRes, data: archivesData } = await fetchJson<ArchivesRes>(archivesUrl);

  // if user has no archives endpoint response, treat as no games
  if (archivesRes.status === 404) {
    return { games: [], year: 0, month: 0, archiveUrl: '' };
  }

  if (!archivesRes.ok) {
    throw new Error(`failed to fetch archives: ${archivesRes.status}`);
  }

  const archives = Array.isArray(archivesData?.archives) ? archivesData?.archives : [];
  if (archives.length === 0) {
    return { games: [], year: 0, month: 0, archiveUrl: '' };
  }

  // chess.com usually returns sorted, but be safe anyway
  // pick the lexicographically max url (yyyy/mm at the end makes this work)
  const latestArchiveUrl = [...archives].sort().at(-1);
  if (!latestArchiveUrl) {
    return { games: [], year: 0, month: 0, archiveUrl: '' };
  }

  const parsed = parseArchiveYearMonth(latestArchiveUrl);
  if (!parsed) {
    throw new Error('failed to parse latest archive year/month');
  }

  const { res: gamesRes, data } = await fetchJson<IUserGamesRes>(latestArchiveUrl);

  if (gamesRes.status === 404) {
    return { games: [], year: parsed.year, month: parsed.month, archiveUrl: latestArchiveUrl };
  }

  if (!gamesRes.ok) {
    throw new Error(`failed to fetch latest games: ${gamesRes.status}`);
  }

  const games = Array.isArray(data?.games) ? data.games : [];
  return {
    games: transformChessComGames(games, normalizedUserName),
    year: parsed.year,
    month: parsed.month,
    archiveUrl: latestArchiveUrl,
  };
}

// backward compatible: keep existing signature
export async function fetchLatestMonthlyGames(userName: string): Promise<IGame[]> {
  const result = await fetchLatestMonthlyGamesWithArchive(userName);
  return result.games;
}
