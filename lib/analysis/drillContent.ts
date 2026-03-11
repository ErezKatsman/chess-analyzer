// lib/analysis/drillContent.ts
// static coaching content for the drill teaching loop.
// two maps keyed by pattern tag:
//   NOTICE_CUE  — shown pre-drill (before the user interacts) AND in the correction card
//   HABIT       — shown only in the correction card after the user fails

// pre-drill cue: one sentence telling the player what to look for in this position.
// also reused in the correction card as "what to look for next time" — so the correction
// reinforces exactly what the pre-drill told them to watch for.
export const DRILL_NOTICE_CUE: Record<string, string> = {
  tactics:
    'Before choosing, check whether any piece on either side can be captured in one move.',
  opening:
    'Before choosing, ask: are my pieces developed and is my king safe?',
  endgame:
    'Before choosing, ask: is my king heading toward the action, or sitting passively?',
  strategy:
    'Before choosing, name your plan. What is this move supposed to achieve?',
  'time-trouble':
    'Before choosing, slow down. When accuracy matters most, speed costs the most.',
  'king-safety':
    'Before choosing, check whether your king is safe enough for the idea you have in mind.',
  calculation:
    'Before choosing, work out your opponent\'s best reply to this move.',
};

// habit reinforcement: one sentence shown after the user fails.
// goal: leave the player with one concrete thing to internalize before the next drill.
export const DRILL_HABIT: Record<string, string> = {
  tactics:
    'After your opponent moves, always ask: what can they take, and what can I take?',
  opening:
    'Every game: develop pieces, control the center, castle — in that order.',
  endgame:
    'In endgames, activate your king immediately. A passive king is a lost king.',
  strategy:
    'In quiet positions, pick your plan first, then find the move that executes it.',
  'time-trouble':
    'Use the opening to build a time buffer. Save your clock for the positions that need it.',
  'king-safety':
    'Castle early. Every tempo you delay is a tempo your opponent gets to attack.',
  calculation:
    'Before a sharp move, calculate your opponent\'s reply — not just your own idea.',
};
