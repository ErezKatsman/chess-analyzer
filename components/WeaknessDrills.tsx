'use client';

// cross-game drill practice widget.
// fetches /api/drills/generated → shows a teaser card → sequences through DrillPanel.
import { useState, useEffect } from 'react';
import { DrillPanel } from '@/components/DrillPanel';
import type { GeneratedDrill } from '@/app/api/drills/generated/route';

type ApiData = {
  drills: GeneratedDrill[];
  topPatternTag: string;
  topPatternLabel: string;
  topPatternGameCount: number;
};

type Phase =
  | { name: 'loading' }
  | { name: 'empty' }
  | { name: 'ready'; data: ApiData }
  | { name: 'practicing'; data: ApiData; index: number }
  | { name: 'done'; data: ApiData };

export function WeaknessDrills() {
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });

  useEffect(() => {
    fetch('/api/drills/generated')
      .then(r => r.json() as Promise<ApiData>)
      .then(data => {
        if (!data.drills || data.drills.length === 0) {
          setPhase({ name: 'empty' });
        } else {
          setPhase({ name: 'ready', data });
        }
      })
      .catch(() => setPhase({ name: 'empty' }));
  }, []);

  if (phase.name === 'loading') {
    // skeleton matching the teaser card height
    return <div className="rounded-2xl border bg-card/60 p-6 shadow-sm h-[88px] animate-pulse" />;
  }

  if (phase.name === 'empty') {
    // nothing to show — component is invisible, no layout impact
    return null;
  }

  if (phase.name === 'practicing') {
    const { data, index } = phase;
    const drill = data.drills[index];
    return (
      <DrillPanel
        key={`${drill.gameUuid}-${drill.moveNumber}-${drill.side}`}
        fen={drill.fen}
        bestMove={drill.bestMove}
        blunderMove={drill.blunderMove}
        side={drill.side}
        moveNumber={drill.moveNumber}
        oneLineReason={drill.oneLineReason}
        evalBefore={drill.evalBefore}
        evalAfter={drill.evalAfter}
        gameUuid={drill.gameUuid}
        drillIndex={index}
        totalDrills={data.drills.length}
        onNext={() => {
          if (index + 1 >= data.drills.length) {
            setPhase({ name: 'done', data });
          } else {
            setPhase({ name: 'practicing', data, index: index + 1 });
          }
        }}
        onExit={() => setPhase({ name: 'ready', data })}
      />
    );
  }

  if (phase.name === 'done') {
    const { data } = phase;
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              session complete
            </p>
            <h2 className="text-lg font-semibold">
              you practiced {data.drills.length} {data.topPatternLabel} drill{data.drills.length !== 1 ? 's' : ''} ⚡
            </h2>
            <p className="text-sm text-muted-foreground">
              results saved — check your drill log below
            </p>
          </div>
          <button
            onClick={() => setPhase({ name: 'ready', data })}
            className="shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            practice again →
          </button>
        </div>
      </div>
    );
  }

  // ready — teaser card
  const { data } = phase;
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            practice your weakness
          </p>
          <h2 className="text-lg font-semibold">
            {data.topPatternLabel}
            {data.topPatternGameCount > 0 && (
              <span className="text-primary">
                {' '}· {data.topPatternGameCount} game{data.topPatternGameCount !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {data.drills.length} position{data.drills.length !== 1 ? 's' : ''} ready to drill
          </p>
        </div>
        <button
          onClick={() => setPhase({ name: 'practicing', data, index: 0 })}
          className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          ⚡ Start {data.drills.length} drills →
        </button>
      </div>
    </div>
  );
}
