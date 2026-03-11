// lib/analysis/coachingFocus.ts
// derives a CoachingFocus from already-computed pattern + turning point data.
// pure derivation: no DB reads, no AI calls, no new data fetching.
// called server-side in UserPageContent after aggregatePatterns() runs.

import type {
  Pattern,
  TurningPoint,
  FocusExample,
  FocusItem,
  CoachingFocus,
  ProgressData,
  CoachingFocusGameSlice,
} from '@/lib/interfaces/analysis';
import type { PatternSummaryEntry } from '@/lib/analysis/patternSummary';

const MAX_EXAMPLES = 3;   // game moments shown per primary focus item
const RECENCY_WINDOW = 10; // most-recent games used for examples + label derivation

// --- confidence gate ---

function getConfidence(gameCount: number): 'low' | 'medium' | 'high' {
  if (gameCount >= 5) return 'high';
  if (gameCount >= 3) return 'medium';
  return 'low';
}

// --- behavioral label derivation ---
// picks the most accurate user-facing label for a tag given the actual TPs.
// for tags with multiple sub-labels (tactics, opening), uses TP data to distinguish.
// for single-mapping tags, returns a hard-coded label/action pair.

type BehavioralMapping = { label: string; shortLabel: string; weeklyAction: string };

function deriveBehavioralLabel(
  entry: PatternSummaryEntry,
  recentTPs: TurningPoint[], // player-side TPs for this tag from most-recent games
): BehavioralMapping {
  const { tag, topHint } = entry;

  if (tag === 'tactics') {
    // "overlook opponent threats" when blunder occurred in a roughly balanced position
    // (evalBefore ≤ ±50cp means the position was fine — player missed a simple threat)
    const inBalancedPosition = recentTPs.some(
      (tp) =>
        (tp.type === 'blunder' || tp.type === 'missed_win') &&
        tp.evalBefore !== null &&
        Math.abs(tp.evalBefore) <= 50,
    );
    if (inBalancedPosition) {
      return {
        label: 'you overlook your opponent\'s threats',
        shortLabel: 'missed threats',
        weeklyAction: 'After your opponent moves, ask: what are they threatening?',
      };
    }
    return {
      label: 'you leave pieces undefended',
      shortLabel: 'hanging pieces',
      weeklyAction: 'Before each move, ask: can my opponent take anything for free?',
    };
  }

  if (tag === 'opening') {
    // "development falls behind" when errors cluster in the late opening phase (moves 10–15)
    const hasLateOpeningError = recentTPs.some(
      (tp) => tp.moveNumber >= 10 && tp.moveNumber <= 15,
    );
    if (hasLateOpeningError) {
      return {
        label: 'your development falls behind',
        shortLabel: 'piece development',
        weeklyAction: 'Castle before move 12. Uncastled kings in the middlegame are a liability.',
      };
    }
    return {
      label: 'you fall behind in the opening',
      shortLabel: 'opening play',
      weeklyAction:
        'Focus on developing pieces, controlling the center, and castling before move 12.',
    };
  }

  // single-mapping tags — one label per tag regardless of TP sub-type
  const FIXED: Partial<Record<Pattern['tag'], BehavioralMapping>> = {
    'king-safety': {
      label: 'you castle too late',
      shortLabel: 'king safety',
      weeklyAction: 'Make castling your top priority unless you are winning material.',
    },
    strategy: {
      label: 'your plans drift in quiet positions',
      shortLabel: 'quiet positions',
      weeklyAction:
        'In quiet positions, name your plan before choosing a move. Aimless moves hand the initiative to your opponent.',
    },
    endgame: {
      label: 'your technique slips in endgames',
      shortLabel: 'endgame technique',
      weeklyAction: 'Activate your king immediately in endgames — passive kings lose won positions.',
    },
    'time-trouble': {
      label: 'your accuracy drops late in the game',
      shortLabel: 'time pressure',
      weeklyAction:
        'Use your first moves faster to save time for complex middlegame positions.',
    },
    calculation: {
      label: 'you miss key moves in sharp positions',
      shortLabel: 'sharp positions',
      weeklyAction:
        "Before a sharp move, verify: does my opponent have a forcing reply I haven't considered?",
    },
  };

  // fallback: use tag display name + existing coaching hint as weekly action
  return FIXED[tag] ?? { label: tag, shortLabel: tag, weeklyAction: topHint };
}

// --- internal helpers ---

// returns player-side TPs that contributed to a given pattern tag,
// limited to the most recent RECENCY_WINDOW games.
// uses Pattern.evidenceMoves to cross-reference TurningPoints by move number.
function getRecentTPsForTag(
  tag: Pattern['tag'],
  sortedGames: CoachingFocusGameSlice[],
): TurningPoint[] {
  const tps: TurningPoint[] = [];
  sortedGames.forEach((game) => {
    const pattern = game.patterns.find((p) => p.tag === tag);
    if (!pattern) return;
    pattern.evidenceMoves.forEach((moveNumber) => {
      const tp = game.turningPoints.find(
        (t) => t.moveNumber === moveNumber && t.side === game.playerSide,
      );
      if (tp) tps.push(tp);
    });
  });
  return tps;
}

// pulls up to MAX_EXAMPLES game moments for a tag from most-recent games.
// cross-references Pattern.evidenceMoves → TurningPoint.oneLineReason.
function getExamplesForTag(
  tag: Pattern['tag'],
  sortedGames: CoachingFocusGameSlice[],
): FocusExample[] {
  const examples: FocusExample[] = [];
  for (const game of sortedGames) {
    if (examples.length >= MAX_EXAMPLES) break;
    const pattern = game.patterns.find((p) => p.tag === tag);
    if (!pattern) continue;
    pattern.evidenceMoves.forEach((moveNumber) => {
      if (examples.length >= MAX_EXAMPLES) return;
      const tp = game.turningPoints.find(
        (t) => t.moveNumber === moveNumber && t.side === game.playerSide,
      );
      if (tp?.oneLineReason) {
        examples.push({
          gameUuid: game.gameUuid,
          moveNumber: tp.moveNumber,
          side: tp.side,
          oneLineReason: tp.oneLineReason,
        });
      }
    });
  }
  return examples;
}

// builds a FocusItem from a PatternSummaryEntry.
// includeExamples=false for secondary items (simpler display, no game moments shown).
function buildFocusItem(
  entry: PatternSummaryEntry,
  sortedGames: CoachingFocusGameSlice[],
  totalAnalyzedCount: number,
  includeExamples: boolean,
): FocusItem {
  const recentTPs = getRecentTPsForTag(entry.tag, sortedGames);
  const { label, shortLabel, weeklyAction } = deriveBehavioralLabel(entry, recentTPs);
  // windowSize = how many games were actually in the aggregation window
  // displayCount = capped so we never say "X of last Y" where X > Y
  const windowSize = Math.min(totalAnalyzedCount, RECENCY_WINDOW);
  const displayCount = Math.min(entry.gameCount, windowSize);
  // omit "last" when the window covers all the player's analyzed games
  const shortExplanation =
    totalAnalyzedCount > RECENCY_WINDOW
      ? `Came up in ${displayCount} of your last ${windowSize} analyzed games.`
      : `Came up in ${displayCount} of your ${windowSize} analyzed games.`;
  return {
    tag: entry.tag,
    behavioralLabel: label,
    shortLabel,
    shortExplanation,
    weeklyAction,
    examples: includeExamples ? getExamplesForTag(entry.tag, sortedGames) : [],
    score: entry.score,
    gameCount: entry.gameCount,
    confidence: getConfidence(entry.gameCount),
  };
}

// --- public API ---

// selectCoachingFocus — the main entry point for Slice H (UserPageContent wiring).
// returns null when there is not enough data (< 3 total analyzed games or no patterns).
// patternEntries must already be sorted by decayed score (output of aggregatePatterns()).
export function selectCoachingFocus(
  patternEntries: PatternSummaryEntry[],  // sorted by decayed score — do not re-sort
  allAnalyzed: CoachingFocusGameSlice[],  // all analyzed games for this user
  totalAnalyzedCount: number,             // total for hasEnoughData + explanation text
  progressData: ProgressData | null,      // from computeProgressData() — may be null
): CoachingFocus | null {
  if (patternEntries.length === 0 || totalAnalyzedCount < 3) return null;

  // sort by most recent for consistent example + label derivation
  const sortedGames = [...allAnalyzed]
    .sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime())
    .slice(0, RECENCY_WINDOW);

  const [primaryEntry, ...rest] = patternEntries;
  const secondaryEntries = rest.slice(0, 2);

  return {
    primary: buildFocusItem(primaryEntry, sortedGames, totalAnalyzedCount, true),
    secondary: secondaryEntries.map((entry) =>
      buildFocusItem(entry, sortedGames, totalAnalyzedCount, false),
    ),
    trend: progressData,
    hasEnoughData: totalAnalyzedCount >= 3,
  };
}
