'use client';

// shown once after a user first connects their chess.com account.
// sequentially analyzes up to 5 recent games, then calls onComplete so the
// parent (UserPageTabs) can clear the loader and trigger a server refresh.

import * as React from 'react';
import type { IGame } from '@/lib/interfaces/games';

export const QUICK_ANALYSIS_KEY = 'chess_quick_analysis';

const MAX_GAMES = 5;

interface Props {
  games: IGame[];
  userName: string;
  // called once all games are processed — parent is responsible for state + refresh
  onComplete: () => void;
}

export function QuickAnalysisLoader({ games, onComplete }: Props) {
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
        const controller = new AbortController();
        // 90s cap per game — generous vs the 45s p95 target; prevents a hung
        // stockfish process from freezing the loader indefinitely
        const timeoutId = setTimeout(() => controller.abort(), 90_000);
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
            signal: controller.signal,
          });
        } catch {
          // per-game failures (including timeouts) are non-fatal — continue the batch
        } finally {
          clearTimeout(timeoutId);
        }
      }

      // parent owns sessionStorage + refresh — just signal completion
      onComplete();
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
