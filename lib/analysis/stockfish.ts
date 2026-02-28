// lib/analysis/stockfish.ts
import { spawn } from 'child_process';
import path from 'path';

export type PositionEval = {
  fen: string;
  cp: number | null;       // centipawns, normalized to white's perspective
  mate: number | null;     // moves to forced mate, normalized to white's perspective
  bestMove: string | null; // best move in uci notation (e.g. "e2e4")
};

// milliseconds per position — keeps total analysis time predictable regardless of game length
// 500ms × 80 positions ≈ 40s for a typical game; quality ≈ depth 12-15 on the lite engine
const DEFAULT_MOVE_TIME_MS = 500;
const ENGINE_TIMEOUT_MS = 180_000;

function stockfishBinPath(): string {
  return path.join(
    process.cwd(),
    'node_modules',
    'stockfish',
    'bin',
    'stockfish-18-lite-single.js',
  );
}

// extract side-to-move from a fen string
function sideToMove(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

// parse score from a stockfish info line, normalized to white's perspective
function parseInfoScore(
  infoLine: string,
  side: 'w' | 'b',
): { cp: number | null; mate: number | null } {
  // stockfish reports score from the perspective of the side to move,
  // so we flip the sign when it is black's turn to normalize to white
  const sign = side === 'w' ? 1 : -1;

  const cpMatch = infoLine.match(/\bscore cp (-?\d+)/);
  if (cpMatch) return { cp: sign * Number(cpMatch[1]), mate: null };

  const mateMatch = infoLine.match(/\bscore mate (-?\d+)/);
  if (mateMatch) return { cp: null, mate: sign * Number(mateMatch[1]) };

  return { cp: null, mate: null };
}

// evaluate a list of fen positions sequentially using one engine instance
export function evaluateFens(
  fens: string[],
  moveTimeMs: number = DEFAULT_MOVE_TIME_MS,
): Promise<PositionEval[]> {
  if (fens.length === 0) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const engine = spawn('node', [stockfishBinPath()]);
    const results: PositionEval[] = [];

    let buffer = '';
    let fenIndex = 0;
    let lastScoredInfoLine = '';
    let state: 'init' | 'searching' | 'done' = 'init';

    const globalTimer = setTimeout(() => {
      engine.kill();
      reject(new Error(`stockfish timed out after ${ENGINE_TIMEOUT_MS}ms`));
    }, ENGINE_TIMEOUT_MS);

    const sendPosition = (index: number) => {
      if (index >= fens.length) {
        state = 'done';
        engine.stdin.write('quit\n');
        return;
      }
      lastScoredInfoLine = '';
      state = 'searching';
      engine.stdin.write(`position fen ${fens[index]}\n`);
      engine.stdin.write(`go movetime ${moveTimeMs}\n`);
    };

    engine.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;

        // uci handshake: uci → uciok → isready → readyok → start positions
        if (state === 'init') {
          if (line === 'uciok') engine.stdin.write('isready\n');
          if (line === 'readyok') sendPosition(0);
          continue;
        }

        if (state === 'searching') {
          // track the latest info line that contains a score (highest depth wins)
          if (line.startsWith('info') && line.includes(' score ')) {
            lastScoredInfoLine = line;
          }

          // bestmove signals end of search for this position
          if (line.startsWith('bestmove')) {
            const fen = fens[fenIndex];
            const side = sideToMove(fen);
            const { cp, mate } = parseInfoScore(lastScoredInfoLine, side);

            const bestMoveMatch = line.match(/^bestmove (\S+)/);
            const rawBestMove = bestMoveMatch?.[1] ?? null;

            results.push({
              fen,
              cp,
              mate,
              bestMove: rawBestMove === '(none)' ? null : rawBestMove,
            });

            fenIndex += 1;
            sendPosition(fenIndex);
          }
        }
      }
    });

    engine.on('close', () => {
      clearTimeout(globalTimer);
      resolve(results);
    });

    engine.on('error', (err) => {
      clearTimeout(globalTimer);
      reject(err);
    });

    // kick off the uci handshake
    engine.stdin.write('uci\n');
  });
}
