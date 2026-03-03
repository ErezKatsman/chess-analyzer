import type { PatternSummaryEntry } from '@/lib/analysis/patternSummary';
import { TAG_LABEL } from '@/lib/analysis/patternSummary';

interface Props {
  entries: PatternSummaryEntry[];
  totalGames: number; // total analyzed games — used for bar width
}

const TAG_ICON: Record<string, string> = {
  opening: '♟',
  tactics: '⚔',
  endgame: '♔',
  strategy: '🧠',
  'time-trouble': '⏱',
  calculation: '🔢',
  'king-safety': '🛡',
};

export function PatternSummary({ entries, totalGames }: Props) {
  if (entries.length === 0) return null;

  const max = entries[0]?.gameCount ?? 1;

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="text-sm font-semibold mb-1">recurring weaknesses</h2>
      <p className="text-xs text-muted-foreground mb-4">
        patterns detected across your {totalGames} analyzed game{totalGames !== 1 ? 's' : ''}
      </p>

      <ul className="space-y-4">
        {entries.map((entry) => {
          const barPct = Math.round((entry.gameCount / max) * 100);
          const label = TAG_LABEL[entry.tag];
          const icon = TAG_ICON[entry.tag] ?? '●';

          return (
            <li key={entry.tag}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  <span className="mr-1.5" aria-hidden="true">{icon}</span>
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.gameCount} game{entry.gameCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* progress bar */}
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${barPct}%` }}
                />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {entry.topHint}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
