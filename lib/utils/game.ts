// lib/utils/game.ts
// pure helpers for rendering game data in tables and lists

import type { IGame } from '@/lib/interfaces/games';

export function formatEndTime(endTime: number): string {
  const date = new Date(endTime * 1000);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function resultBadgeClass(isWon: boolean, isDraw: boolean): string {
  if (isDraw) return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/25';
  return isWon
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25';
}

export function colorBadgeClass(isWhite: boolean): string {
  return isWhite
    ? 'bg-slate-950/5 text-slate-900 dark:bg-white/10 dark:text-white border-slate-900/10 dark:border-white/20'
    : 'bg-slate-500/10 text-slate-700 dark:text-slate-200 border-slate-500/20';
}

export function buildAnalyzeHref(
  userName: string,
  game: IGame,
  archiveYear: number,
  archiveMonth: number,
): string {
  const params = new URLSearchParams({
    userName,
    uuid: game.uuid,
    year: String(archiveYear),
    month: String(archiveMonth),
  });
  return `/game?${params.toString()}`;
}

export function safeOpening(opening: IGame['gameDetails']['opening']): string {
  const value = (opening ?? '').trim();
  return value.length ? value : 'unknown opening';
}
