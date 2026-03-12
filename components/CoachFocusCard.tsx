'use client';

import Link from 'next/link';
import type { CoachingFocus, FocusItem, ProgressData } from '@/lib/interfaces/analysis';
import { getExampleCue } from '@/lib/analysis/coachingFocus';

const TAG_ICON: Record<string, string> = {
  opening:      '♟',
  tactics:      '⚔',
  endgame:      '♔',
  strategy:     '🧠',
  'time-trouble': '⏱',
  calculation:  '🔢',
  'king-safety':  '🛡',
};

const CONFIDENCE_PHRASE: Record<string, string> = {
  low:    "I've noticed this a few times:",
  medium: 'This keeps coming up:',
  high:   'Your biggest challenge right now is:',
};

const TREND_LABEL: Record<string, string> = {
  improving:        '↓ improving',
  holding:          '→ holding steady',
  'needs-attention': '↑ needs attention',
};

const TREND_COLOR: Record<string, string> = {
  improving:        'text-emerald-500',
  holding:          'text-amber-500',
  'needs-attention': 'text-red-500',
};

function TrendBadge({ trend }: { trend: ProgressData }) {
  const colorClass = TREND_COLOR[trend.trend] ?? 'text-muted-foreground';
  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {TREND_LABEL[trend.trend]}
      {' · '}
      {trend.recentRate.toFixed(1)} errors per game
      {trend.trend === 'improving' && ` (was ${trend.previousRate.toFixed(1)})`}
      {trend.drillsCompleted > 0 && (
        <span className="text-muted-foreground">
          {' · '}
          {trend.drillsCompleted} drill{trend.drillsCompleted !== 1 ? 's' : ''} completed
        </span>
      )}
    </span>
  );
}

function PrimaryFocusBlock({ item, trend }: { item: FocusItem; trend: ProgressData | null }) {
  const icon = TAG_ICON[item.tag] ?? '♟';
  const phrase = CONFIDENCE_PHRASE[item.confidence] ?? CONFIDENCE_PHRASE.high;

  return (
    <div className="space-y-4">
      {/* confidence phrase + behavioral label */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {phrase}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">{icon}</span>
          <h2 className="text-xl font-bold">{item.behavioralLabel}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{item.shortExplanation}</p>
      </div>

      {/* focus context — M2: root cause + what to notice */}
      {item.rootCause && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">{item.rootCause}</p>
          <p className="text-sm">
            <span className="font-medium">What to notice: </span>
            {item.whatToNotice}
          </p>
        </div>
      )}

      {/* trend inline */}
      {trend && <TrendBadge trend={trend} />}

      {/* game moment examples */}
      {item.examples.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">recent examples</p>
          <ul className="space-y-1">
            {item.examples.map((ex) => (
              <li
                key={`${ex.gameUuid}-${ex.moveNumber}`}
                className="flex flex-col gap-0.5 text-sm"
              >
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    move {ex.moveNumber}
                  </span>
                  <span>{ex.oneLineReason}</span>
                </div>
                <p className="pl-[4.5rem] text-xs text-muted-foreground italic">
                  {getExampleCue(item.tag, ex.tpType, ex.evalBefore)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* weekly action */}
      <div className="rounded-xl bg-muted/60 px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">one thing to practice</p>
        <p className="text-sm font-medium">{item.weeklyAction}</p>
      </div>

      {/* CTA */}
      <Link
        href="/drills"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Practice now →
      </Link>
    </div>
  );
}

interface Props {
  coachingFocus: CoachingFocus | null;
}

export function CoachFocusCard({ coachingFocus }: Props) {
  // null guard — not enough data (< 3 analyzed games) or no patterns detected
  if (!coachingFocus || !coachingFocus.hasEnoughData) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground text-center py-4">
          analyze at least 3 games to see your coaching focus.
        </p>
      </div>
    );
  }

  const { primary, secondary, trend } = coachingFocus;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm space-y-6">
      <PrimaryFocusBlock item={primary} trend={trend} />

      {/* secondary focuses — compact pill list */}
      {secondary.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">also tracking</p>
          <div className="flex flex-wrap gap-2">
            {secondary.map((item) => (
              <span
                key={item.tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                <span aria-hidden="true">{TAG_ICON[item.tag] ?? '♟'}</span>
                {item.shortLabel}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
