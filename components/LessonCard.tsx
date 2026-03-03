'use client';

import * as React from 'react';
import type { Lesson } from '@/lib/interfaces/analysis';

// same colour palette used in AnalysisPanel pattern tags
const TAG_COLORS: Record<string, string> = {
  tactics: 'bg-red-500/15 text-red-600 dark:text-red-400',
  'king-safety': 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  opening: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  endgame: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  strategy: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  'time-trouble': 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  calculation: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
};

function tagColor(tag: string): string {
  return TAG_COLORS[tag] ?? 'bg-muted text-muted-foreground';
}

type Props = { lesson: Lesson };

export function LessonCard({ lesson }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="rounded-xl border bg-muted/30 overflow-hidden">
      {/* header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={[
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              tagColor(lesson.patternTag),
            ].join(' ')}
          >
            {lesson.patternTag}
          </span>
          <span className="font-semibold text-sm truncate">{lesson.title}</span>
        </div>
        <span className="shrink-0 text-muted-foreground text-xs mt-0.5">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* body — expanded */}
      {open ? (
        <div className="px-4 pb-4 space-y-3 border-t">
          {/* concept */}
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {lesson.concept}
          </p>

          {/* key points */}
          <div>
            <div className="text-xs font-semibold text-foreground mb-1.5">key principles</div>
            <ul className="space-y-1">
              {lesson.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="shrink-0 mt-0.5 text-primary font-bold text-xs">
                    {i + 1}.
                  </span>
                  <span className="text-muted-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* game reference */}
          <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1">
              from your game
            </div>
            <p className="text-sm text-foreground">{lesson.gameReference}</p>
          </div>

          {/* practice tip */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="shrink-0 text-base">💡</span>
            <span>{lesson.practiceTip}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
