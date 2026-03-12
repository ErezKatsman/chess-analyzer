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

type BehavioralMapping = {
  label: string;
  shortLabel: string;
  weeklyAction: string;
  rootCause: string;
  whatToNotice: string;
};

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
        rootCause: "You're reacting to your own plans without checking what your opponent just set up. In balanced positions, a single missed threat is usually all it takes to lose material.",
        whatToNotice: 'After your opponent moves, pause and ask: what changed? Is anything now under attack?',
      };
    }
    return {
      label: 'you leave pieces undefended',
      shortLabel: 'hanging pieces',
      weeklyAction: 'Before each move, ask: can my opponent take anything for free?',
      rootCause: "You're moving pieces to active squares without checking if they're safe. A hanging piece is an invitation your opponent rarely declines.",
      whatToNotice: 'After placing a piece, scan every opponent piece and ask: can any of them take mine for free?',
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
        rootCause: "You're making moves that don't develop pieces or improve coordination in the late opening. This leaves your king exposed and your pieces passive entering the middlegame.",
        whatToNotice: 'By move 10, count your undeveloped pieces. If more than one is still on its starting square, prioritize development over any other plan.',
      };
    }
    return {
      label: 'you fall behind in the opening',
      shortLabel: 'opening play',
      weeklyAction:
        'Focus on developing pieces, controlling the center, and castling before move 12.',
      rootCause: "Early moves that skip development or ignore the center hand your opponent a free advantage. Small opening mistakes compound quickly because you enter the middlegame already behind.",
      whatToNotice: 'On each of your first 10 moves, ask: am I developing a piece, contesting the center, or preparing to castle?',
    };
  }

  // single-mapping tags — one label per tag regardless of TP sub-type
  const FIXED: Partial<Record<Pattern['tag'], BehavioralMapping>> = {
    'king-safety': {
      label: 'you castle too late',
      shortLabel: 'king safety',
      weeklyAction: 'Make castling your top priority unless you are winning material.',
      rootCause: "Your king stays in the center too long, giving your opponent targets to attack before your rooks are connected. Most middlegame attacks exploit an uncastled king.",
      whatToNotice: 'Before any middlegame plan, ask: is my king safe? If not, castling is almost always the right move first.',
    },
    strategy: {
      label: 'your plans drift in quiet positions',
      shortLabel: 'quiet positions',
      weeklyAction:
        'In quiet positions, name your plan before choosing a move. Aimless moves hand the initiative to your opponent.',
      rootCause: "Without forcing moves to react to, it's easy to make plausible but aimless moves that slowly worsen your position. Your opponent improves their pieces while you drift.",
      whatToNotice: "In any quiet position, finish this sentence before moving: 'My plan is to...'. If you can't, find a plan first.",
    },
    endgame: {
      label: 'your technique slips in endgames',
      shortLabel: 'endgame technique',
      weeklyAction: 'Activate your king immediately in endgames — passive kings lose won positions.',
      rootCause: "Good positions in the endgame are often lost through passive play and poor king use. The endgame rewards precision and king activity above everything else.",
      whatToNotice: 'When pieces come off the board, immediately ask: where should my king go? An active king is the most important endgame piece.',
    },
    'time-trouble': {
      label: 'your accuracy drops late in the game',
      shortLabel: 'time pressure',
      weeklyAction:
        'Use your first moves faster to save time for complex middlegame positions.',
      rootCause: "Running low on time forces quick decisions in positions that need the most thought. Time trouble turns winnable games into coin flips.",
      whatToNotice: 'In the first 10 moves, try to move faster than feels comfortable. Every minute saved early is available when the position gets complicated.',
    },
    calculation: {
      label: 'you miss key moves in sharp positions',
      shortLabel: 'sharp positions',
      weeklyAction:
        "Before a sharp move, verify: does my opponent have a forcing reply I haven't considered?",
      rootCause: "In sharp positions, the difference between winning and losing is often one forcing reply you didn't calculate. Stopping your analysis one move too early is the main culprit.",
      whatToNotice: "Before a sharp exchange or sacrifice, ask: what is my opponent's single most forcing reply? Calculate that line fully before committing.",
    },
  };

  // fallback: use tag display name + existing coaching hint as weekly action
  return FIXED[tag] ?? { label: tag, shortLabel: tag, weeklyAction: topHint, rootCause: '', whatToNotice: '' };
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
          tpType: tp.type,
          evalBefore: tp.evalBefore,
        });
      }
    });
  }
  return examples;
}

// returns a short "what you should have noticed" cue for a single example moment.
// uses evalBefore (position context) to produce a different cue per example even when
// the tag and tpType are the same — avoids repeating identical text for every blunder.
export function getExampleCue(
  tag: Pattern['tag'],
  tpType: TurningPoint['type'],
  evalBefore?: number | null,
): string {
  if (tag === 'tactics') {
    if (tpType === 'missed_win') return 'A winning capture or forcing move was available here.';
    // use position context to vary the cue
    if (evalBefore !== null && evalBefore !== undefined) {
      if (evalBefore > 150) {
        return 'You had a clear advantage — one scan for free captures would have kept it.';
      }
      if (evalBefore < -150) {
        return 'Even when defending, loose pieces make a bad position worse. Check before every move.';
      }
      // balanced position (|eval| ≤ 150)
      return 'The position was level — one hanging piece was all it took to tip it.';
    }
    return 'Before this move: can my opponent take anything for free?';
  }
  if (tag === 'opening') {
    if (tpType === 'blunder' || tpType === 'mistake') {
      return 'A big early mistake — development and center control had to come first here.';
    }
    return 'Ask: am I developing a piece, controlling the center, or preparing to castle?';
  }
  if (tag === 'king-safety') {
    return 'Your king was still exposed here — castling before this move would have changed the game.';
  }
  if (tag === 'strategy') {
    return "There was no clear plan here. Ask: 'what am I trying to achieve in the next 3 moves?'";
  }
  if (tag === 'endgame') {
    return 'King activation was the priority — where should it have gone from here?';
  }
  if (tag === 'time-trouble') {
    return 'Low on time at this moment — saving a minute earlier would have helped here.';
  }
  if (tag === 'calculation') {
    return "Before committing: what is your opponent's single most forcing reply?";
  }
  return 'What should you have considered before this move?';
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
  const { label, shortLabel, weeklyAction, rootCause, whatToNotice } = deriveBehavioralLabel(entry, recentTPs);
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
    rootCause,
    whatToNotice,
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
