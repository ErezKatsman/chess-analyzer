// lib/analysis/patternSummary.ts
// aggregates Pattern[] across analyzed games into a ranked weakness list.
// applies: 60-day window, 20-game cap, 0.9^i recency decay, confidence weighting.

import type { Pattern } from '@/lib/interfaces/analysis';

export type PatternSummaryEntry = {
  tag: Pattern['tag'];
  gameCount: number; // raw count of distinct games showing this tag (no decay)
  topHint: string;   // most recent coaching hint for this tag
  score: number;     // recency-decayed confidence score from aggregatePatterns()
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

export type GamePatternEntry = {
  patterns: Pattern[];
  // unix timestamp (ms) or Date — when the analysis was stored
  date: number | Date;
};

const WINDOW_MS = 60 * 24 * 60 * 60 * 1000; // 60 days in ms
const GAME_CAP = 20;

// given analyzed game pattern entries (each = one game), returns entries ranked
// by decayed confidence score descending.
// selfReportedWeakness is used as a tie-breaker when two tags are within 0.05 score.
export function aggregatePatterns(
  allGamePatterns: Pattern[][] | GamePatternEntry[],
  selfReportedWeakness?: string,
): PatternSummaryEntry[] {
  // support legacy call signature (Pattern[][]) by wrapping without dates
  const isLegacy = allGamePatterns.length === 0 || Array.isArray(allGamePatterns[0]);
  const entries: GamePatternEntry[] = isLegacy
    ? (allGamePatterns as Pattern[][]).map((patterns) => ({ patterns, date: 0 }))
    : (allGamePatterns as GamePatternEntry[]);

  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // filter to 60-day window (entries with date=0 from legacy path are always included)
  const windowed = entries.filter((e) => {
    const ts = e.date instanceof Date ? e.date.getTime() : e.date;
    return ts === 0 || ts >= cutoff;
  });

  // sort descending by date, cap at 20 most recent
  const sorted = windowed
    .slice()
    .sort((a, b) => {
      const ta = a.date instanceof Date ? a.date.getTime() : a.date;
      const tb = b.date instanceof Date ? b.date.getTime() : b.date;
      return tb - ta;
    })
    .slice(0, GAME_CAP);

  const scoreMap = new Map<Pattern['tag'], number>();
  const countMap = new Map<Pattern['tag'], number>();
  const hintMap = new Map<Pattern['tag'], string>();
  // track whether the hint for this tag has been set (most-recent game wins)
  const hintSet = new Set<Pattern['tag']>();

  sorted.forEach((entry, gameIndex) => {
    const decay = Math.pow(0.9, gameIndex);
    // collect unique tags per game so multiple patterns of same tag count once per game
    const seenTags = new Set<Pattern['tag']>();
    entry.patterns.forEach((p) => {
      const contribution = (p.confidence ?? 1) * decay;
      scoreMap.set(p.tag, (scoreMap.get(p.tag) ?? 0) + contribution);
      if (!seenTags.has(p.tag)) {
        seenTags.add(p.tag);
        countMap.set(p.tag, (countMap.get(p.tag) ?? 0) + 1);
      }
      // most-recent game hint wins — only write if not yet set for this tag
      if (!hintSet.has(p.tag)) {
        hintMap.set(p.tag, p.coachingHint);
        hintSet.add(p.tag);
      }
    });
  });

  const result: PatternSummaryEntry[] = [];
  scoreMap.forEach((score, tag) => {
    result.push({
      tag,
      gameCount: countMap.get(tag) ?? 0,
      topHint: hintMap.get(tag) ?? '',
      score,
    });
  });

  return result.sort((a, b) => {
    const sa = scoreMap.get(a.tag) ?? 0;
    const sb = scoreMap.get(b.tag) ?? 0;
    const diff = sb - sa;
    // tie-breaker: within 0.05 score, prefer selfReportedWeakness match, else higher gameCount
    if (Math.abs(diff) <= 0.05) {
      if (selfReportedWeakness) {
        if (a.tag === selfReportedWeakness && b.tag !== selfReportedWeakness) return -1;
        if (b.tag === selfReportedWeakness && a.tag !== selfReportedWeakness) return 1;
      }
      return b.gameCount - a.gameCount;
    }
    return diff;
  });
}
