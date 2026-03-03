// lib/analysis/patternSummary.ts
// aggregates Pattern[] across all analyzed games into a ranked weakness list.

import type { Pattern } from '@/lib/interfaces/analysis';

export type PatternSummaryEntry = {
  tag: Pattern['tag'];
  gameCount: number; // how many distinct games showed this pattern
  topHint: string;   // most recent coaching hint for this tag
};

// tag display labels — ordered for rendering
export const TAG_LABEL: Record<Pattern['tag'], string> = {
  opening: 'opening',
  tactics: 'tactics',
  endgame: 'endgame',
  strategy: 'strategy',
  'time-trouble': 'time trouble',
  calculation: 'calculation',
  'king-safety': 'king safety',
};

// given all patterns from all analyzed games (each element = patterns for one game),
// returns entries ranked by game count descending.
export function aggregatePatterns(allGamePatterns: Pattern[][]): PatternSummaryEntry[] {
  const countMap = new Map<Pattern['tag'], number>();
  const hintMap = new Map<Pattern['tag'], string>();

  allGamePatterns.forEach((patterns) => {
    // collect unique tags per game so one game with 3 endgame patterns still counts once
    const seenTags = new Set<Pattern['tag']>();
    patterns.forEach((p) => {
      if (!seenTags.has(p.tag)) {
        seenTags.add(p.tag);
        countMap.set(p.tag, (countMap.get(p.tag) ?? 0) + 1);
      }
      // always overwrite hint so we keep the most recent game's coaching hint
      hintMap.set(p.tag, p.coachingHint);
    });
  });

  const entries: PatternSummaryEntry[] = [];
  countMap.forEach((gameCount, tag) => {
    entries.push({ tag, gameCount, topHint: hintMap.get(tag) ?? '' });
  });

  return entries.sort((a, b) => b.gameCount - a.gameCount);
}
