// lib/interfaces/analysis.ts

export type PositionTimelineItem = {
  ply: number;
  moveNumber: number;
  side: 'white' | 'black';
  san: string;
  from: string;
  to: string;
  promotion?: string;
  fen: string;
};

export type PositionTimeline = {
  startFen: string;
  initialFen?: string;
  items: PositionTimelineItem[];
};

export type TurningPoint = {
  moveNumber: number;
  side: 'white' | 'black';
  type: 'blunder' | 'mistake' | 'inaccuracy' | 'missed_win' | 'good_defense';
  evalBefore: number | null;
  evalAfter: number | null;
  oneLineReason: string;
  positionHint: string;
  // uci notation of the move that was actually played (e.g. "e2e4")
  movePlayed: string;
  // uci best move from the engine at the position before this move (e.g. "d1d5")
  bestMove?: string;
};

export type Pattern = {
  tag:
    | 'opening'
    | 'tactics'
    | 'endgame'
    | 'strategy'
    | 'time-trouble'
    | 'calculation'
    | 'king-safety';
  title: string;
  evidenceMoves: number[];
  coachingHint: string;
  // 0–1 signal strength: min(1, matchingTPs / 3) — used for cross-game recency-weighted scoring
  confidence?: number;
};

export type DrillSeed = {
  theme: 'fork' | 'pin' | 'skewer' | 'mate' | 'endgame-technique' | 'opening-principle';
  fromMove: number;
  prompt: string;
  successCriteria: string;
};

// ai-generated explanation for a single blunder or mistake
export type BlunderExplanation = {
  // matches `${moveNumber}-${side}` on TurningPoint
  id: string;
  // 1-2 sentence plain-english reason why the move was bad
  explanation: string;
  // short rule to remember (≤12 words)
  rule: string;
};

// ai-generated mini-lesson derived from a detected pattern
export type Lesson = {
  // matches Pattern.tag
  patternTag: string;
  title: string;
  // 2-3 sentence overview of the chess concept
  concept: string;
  // 3 concrete principles to remember
  keyPoints: string[];
  // reference to specific moves from this game
  gameReference: string;
  // one actionable practice tip
  practiceTip: string;
};

export type AnalysisSummary = {
  gameId: string;
  meta: {
    white: string;
    black: string;
    resultText?: string;
    timeControl: string;
    playedAt: string;
    rated: boolean;
  };
  turningPoints: TurningPoint[];
  patterns: Pattern[];
  drillSeeds: DrillSeed[];
  nextBestTopics: string[];
};

// --- coaching focus types (Slice G) ---

// mirrors ProgressData from CoachCheckIn.tsx — defined here so server-side lib can reference it
// without importing from a client component. CoachCheckIn.tsx local definition removed in Slice H.
export type ProgressData = {
  focusLabel: string;
  recentRate: number;      // errors per game, last 5 analyzed games (1 decimal)
  previousRate: number;    // errors per game, previous 5 analyzed games (1 decimal)
  trend: 'improving' | 'holding' | 'needs-attention';
  drillsCompleted: number; // drills solved in last 14 days; 0 = omit from display
};

// a single game moment that illustrates the coaching focus
export type FocusExample = {
  gameUuid: string;
  moveNumber: number;
  side: 'white' | 'black';
  oneLineReason: string; // from TurningPoint.oneLineReason — already stored in DB
  tpType: TurningPoint['type'];   // used to pick per-example teaching cue (M3)
  evalBefore: number | null;      // cp from mover perspective — gives position context to cue (M3)
};

// one coaching focus item (primary or secondary)
export type FocusItem = {
  tag: Pattern['tag'];       // internal — used for icons, drill filtering, routing
  behavioralLabel: string;   // user-facing full label: "you leave pieces undefended"
  shortLabel: string;        // compact chip label: "hanging pieces" (≤3 words)
  shortExplanation: string;  // "Came up in X of your Y analyzed games"
  rootCause: string;         // 2 sentences: why this happens + typical context (M2)
  whatToNotice: string;      // 1-sentence cue to build the habit (M2)
  weeklyAction: string;      // 1 concrete sentence, hard-coded per behavioral label
  examples: FocusExample[];  // 2–3 from most recent TPs; empty for secondary items
  score: number;             // decayed score from aggregatePatterns() — higher = more persistent
  gameCount: number;         // raw count from PatternSummaryEntry
  confidence: 'low' | 'medium' | 'high';
};

// full coaching focus object — derived server-side on every render; not stored in DB (v1)
export type CoachingFocus = {
  primary: FocusItem;
  secondary: FocusItem[];     // up to 2; examples array always empty for secondary
  trend: ProgressData | null; // null when < 10 analyzed games or tag not yet established
  hasEnoughData: boolean;     // false when totalAnalyzed < 3; gates assertive phrasing in UI
};

// input slice shape expected by selectCoachingFocus()
// matches fields already projected in UserPageContent's GameAnalysis.find() call
export type CoachingFocusGameSlice = {
  gameUuid: string;
  playerSide: 'white' | 'black';
  patterns: Pattern[];
  turningPoints: TurningPoint[];
  analyzedAt: Date;
};
