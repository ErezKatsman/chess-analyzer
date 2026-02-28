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
