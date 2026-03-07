'use client';

// shown once after a user first connects their chess.com account.
// sequentially analyzes up to 5 recent games, then redirects to the Coach tab.
// no summary UI here — Coach tab renders patterns after router.refresh().

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { IGame } from '@/lib/interfaces/games';

export const QUICK_ANALYSIS_KEY = 'chess_quick_analysis';

const MAX_GAMES = 5;

interface Props {
  games: IGame[];
  userName: string;
}

export function QuickAnalysisLoader({ games }: Props) {
  const router = useRouter();
  const [current, setCurrent] = React.useState(0);
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    const targets = [...games]
      .sort((a, b) => b.endTime - a.endTime)
      .slice(0, MAX_GAMES);

    setTotal(targets.length);

    async function run() {
      for (let i = 0; i < targets.length; i++) {
        setCurrent(i + 1);
        const game = targets[i];
        try {
          await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pgn: game.pgn,
              // same side-detection used throughout the app: game.isWhite is set by the mapper
              playerSide: game.isWhite ? 'white' : 'black',
              gameUuid: game.uuid,
            }),
          });
        } catch {
          // per-game failures are non-fatal — continue the batch
        }
      }

      sessionStorage.removeItem(QUICK_ANALYSIS_KEY);
      router.push('/?tab=coach');
      router.refresh();
    }

    void run();
    // runs once on mount — games list is stable for the lifetime of this component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="text-5xl animate-pulse select-none">♟</div>
        <p className="text-sm font-medium">building your coaching plan…</p>
        {total > 0 && (
          <p className="text-xs text-muted-foreground">
            analyzing game {current} of {total}
          </p>
        )}
        <p className="text-xs text-muted-foreground">this only happens once.</p>
      </div>
    </main>
  );
}
