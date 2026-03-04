'use client';

import Link from 'next/link';
import type { PatternSummaryEntry } from '@/lib/analysis/patternSummary';
import { TAG_LABEL } from '@/lib/analysis/patternSummary';

const TAG_ICON: Record<string, string> = {
  opening: '♟',
  tactics: '⚔',
  endgame: '♔',
  strategy: '🧠',
  'time-trouble': '⏱',
  calculation: '🔢',
  'king-safety': '🛡',
};

interface Props {
  topPattern: PatternSummaryEntry;
  totalGames: number;
}

export function CoachBanner({ topPattern, totalGames }: Props) {
  const icon = TAG_ICON[topPattern.tag] ?? '♟';
  const label = TAG_LABEL[topPattern.tag] ?? topPattern.tag;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">your coach says</p>
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">{icon}</span>
            <h2 className="text-lg font-semibold">
              Your biggest weakness: <span className="text-primary capitalize">{label}</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Found in <span className="font-medium text-foreground">{topPattern.gameCount}</span> of{' '}
            <span className="font-medium text-foreground">{totalGames}</span> analyzed games
          </p>
          <p className="text-sm text-muted-foreground max-w-lg">{topPattern.topHint}</p>
        </div>
        <Link
          href="/drills"
          className="inline-flex items-center justify-center shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Practice now →
        </Link>
      </div>
    </div>
  );
}
