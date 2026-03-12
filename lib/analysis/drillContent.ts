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

// position-specific cue for the pre-drill setup card.
// uses keyword matching on oneLineReason + evalBefore to produce a cue tied to the
// actual mistake — different from DRILL_NOTICE_CUE which is generic per tag.
export function getDrillSpecificCue(
  oneLineReason: string,
  patternTag: string,
  evalBefore: number | null,
): string {
  const r = oneLineReason.toLowerCase();

  if (patternTag === 'tactics') {
    if (r.includes('undefended') || r.includes('hanging') || r.includes('left') && r.includes('piece')) {
      return 'Scan every piece you own: after this move, can any of them be taken for free?';
    }
    if (r.includes('fork')) {
      return 'Look for a single piece that attacks two of your opponent\'s pieces at once.';
    }
    if (r.includes('pin')) {
      return 'Check if any of your pieces are pinned — moving a pinned piece may lose the piece behind it.';
    }
    if (r.includes('skewer')) {
      return 'Is your most valuable piece exposed to an attack that wins the piece behind it?';
    }
    if (r.includes('back rank') || r.includes('checkmate') || r.includes('mate')) {
      return 'Is your king\'s back rank defended? Can your opponent force a back-rank checkmate?';
    }
    if (r.includes('check')) {
      return 'Can your opponent force a check that wins material before you can respond?';
    }
    if (r.includes('missed') || r.includes('could have') || r.includes('winning')) {
      return 'Your opponent had a strong threat here — what did their last move set up against you?';
    }
    // fall back to position-context cue
    if (evalBefore !== null) {
      if (evalBefore > 150) return 'You were winning — before moving, verify none of your pieces can be taken.';
      if (evalBefore < -150) return 'Even when defending, check for free captures before every move.';
      return 'The position was balanced — one loose piece decided the game. Scan before moving.';
    }
    return 'Before this move: can any of your pieces be taken for free after you move?';
  }

  if (patternTag === 'opening') {
    if (r.includes('develop') || r.includes('piece') || r.includes('knight') || r.includes('bishop')) {
      return 'How many pieces are still on their starting squares? Develop before attacking.';
    }
    if (r.includes('castle') || r.includes('king')) {
      return 'Is your king safe? How many moves until you can castle?';
    }
    if (r.includes('center') || r.includes('pawn')) {
      return 'Which side controls more central squares right now? Moves that don\'t contest it fall behind.';
    }
    return 'Ask: am I developing a piece, controlling the center, or preparing to castle?';
  }

  if (patternTag === 'king-safety') {
    if (r.includes('castle') || r.includes('castled') || r.includes('center')) {
      return 'Your king is still exposed — when is the earliest you can castle safely?';
    }
    return 'Is your king safe? Identify the quickest attacking line your opponent has right now.';
  }

  if (patternTag === 'endgame') {
    if (r.includes('pawn') || r.includes('promot')) {
      return 'Can any pawn advance toward promotion? Who gets there first?';
    }
    if (r.includes('king') || r.includes('passive')) {
      return 'Where should your king go right now? In endgames, king activity is the top priority.';
    }
    return 'King activation is the priority here — where should it move?';
  }

  if (patternTag === 'strategy') {
    return "Before moving: complete this sentence — 'my plan for the next 3 moves is...'";
  }

  if (patternTag === 'time-trouble') {
    return 'You were low on time here. What is the single most important thing to check before moving?';
  }

  if (patternTag === 'calculation') {
    if (r.includes('sacrifice') || r.includes('exchange') || r.includes('sac')) {
      return 'Before giving up material: calculate your opponent\'s most forcing reply completely.';
    }
    return "What is your opponent's single most forcing reply to this move? Calculate it fully.";
  }

  return DRILL_NOTICE_CUE[patternTag] ?? 'What should you check before making this move?';
}

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
