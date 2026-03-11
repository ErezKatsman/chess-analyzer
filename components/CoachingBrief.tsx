// coaching brief shown before drilling starts.
// static content per weakness tag — teaches the mental habit, not just the positions.
// no AI, no fetch — purely presentational.

type BriefContent = { habit: string; question: string };

const BRIEFS: Record<string, BriefContent> = {
  tactics: {
    habit: 'Before every move, scan for checks, captures, and threats — in that order. This single habit catches most tactical blunders before they happen.',
    question: 'What is my opponent threatening right now?',
  },
  opening: {
    habit: 'Every opening move should develop a new piece, control the center, or prepare to castle. Avoid moving the same piece twice until all your other pieces are out.',
    question: 'Am I developing my pieces or just rearranging them?',
  },
  endgame: {
    habit: 'In endgames, king activity matters as much as material. Get your king to the center early and count pawns carefully before making any trades.',
    question: 'Is my king as active as it can be right now?',
  },
  'king-safety': {
    habit: 'Every pawn move in front of your castled king creates a permanent weakness. Only move those pawns when you have no better option.',
    question: 'Do I have to move this pawn, or am I just creating a weakness?',
  },
  'time-trouble': {
    habit: 'Keep at least 30 seconds per move. When the clock gets low, focus on not hanging pieces rather than finding the optimal continuation.',
    question: 'Do I have enough time to calculate this properly?',
  },
  strategy: {
    habit: 'Before choosing a move in a quiet position, name your plan first. Without a plan, moves compound into passive, losing positions.',
    question: 'What am I trying to achieve with this move?',
  },
  calculation: {
    habit: "Always calculate your opponent's best response before committing. Assume they will find the strongest reply, then check if your idea still works.",
    question: "What is my opponent's best answer to this move?",
  },
};

interface Props {
  tag: string;
  gameCount: number;
}

export function CoachingBrief({ tag, gameCount }: Props) {
  const brief = BRIEFS[tag];
  if (!brief) return null;

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="p-5 space-y-4">
        {/* habit */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            the habit to build
          </p>
          <p className="text-sm leading-relaxed">{brief.habit}</p>
        </div>

        {/* why drilling this */}
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            why you&apos;re drilling this
          </p>
          <p className="text-sm text-muted-foreground">
            This pattern appeared in {gameCount} of your analyzed game{gameCount !== 1 ? 's' : ''} — it&apos;s your most consistent area to improve.
          </p>
        </div>
      </div>

      {/* question — subtle highlight at bottom */}
      <div className="border-t bg-muted/30 px-5 py-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          ask yourself before each move
        </p>
        <p className="text-sm font-medium">&ldquo;{brief.question}&rdquo;</p>
      </div>
    </div>
  );
}
