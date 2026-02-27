// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { getParsedMovesFromPgn } from '@/lib/chess/moves';
import { evaluateFens } from '@/lib/analysis/stockfish';
import { computeTurningPoints } from '@/lib/analysis/insights';
import { detectPatterns } from '@/lib/analysis/patterns';

// lite single-threaded variant — lighter and simpler for server use
function getStockfishPath(): string {
  return path.join(
    process.cwd(),
    'node_modules',
    'stockfish',
    'bin',
    'stockfish-18-lite-single.js',
  );
}

// spawns stockfish as a child process, sends 'uci', waits for 'uciok'
function waitForReady(): Promise<boolean> {
  return new Promise((resolve) => {
    const engine = spawn('node', [getStockfishPath()]);
    const timer = setTimeout(() => {
      engine.kill();
      resolve(false);
    }, 10_000);

    let buffer = '';

    engine.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.trim() === 'uciok') {
          clearTimeout(timer);
          engine.stdin.write('quit\n');
          resolve(true);
          return;
        }
      }
    });

    engine.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });

    engine.stdin.write('uci\n');
  });
}

// GET /api/analyze — health check
export async function GET() {
  try {
    const ready = await waitForReady();
    return NextResponse.json({ status: ready ? 'ok' : 'timeout', engine: 'stockfish' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

// POST /api/analyze — analyze a game
// body: { pgn: string }
// response: { evals: Array<{ ply, fen, cp, mate, bestMove }> }
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as { pgn?: unknown }).pgn !== 'string'
  ) {
    return NextResponse.json({ error: 'body must be { pgn: string }' }, { status: 400 });
  }

  const { pgn, playerSide } = body as { pgn: string; playerSide?: 'white' | 'black' };

  const moves = getParsedMovesFromPgn(pgn);
  if (moves.length === 0) {
    return NextResponse.json(
      { error: 'could not parse pgn or game has no moves' },
      { status: 400 },
    );
  }

  // evaluate starting position + position after each move
  // ply 0 = starting position, ply N = after move N
  const fens = [moves[0].fenBefore, ...moves.map((m) => m.fenAfter)];

  try {
    const rawEvals = await evaluateFens(fens);

    const evals = rawEvals.map((e, i) => ({
      ply: i,
      fen: e.fen,
      cp: e.cp,
      mate: e.mate,
      bestMove: e.bestMove,
    }));

    const allTurningPoints = computeTurningPoints(moves, rawEvals);

    // filter to player's moves only when playerSide is provided
    const turningPoints = playerSide
      ? allTurningPoints.filter((tp) => tp.side === playerSide)
      : allTurningPoints;

    // detect patterns from the player's turning points only
    const patterns = detectPatterns(moves, rawEvals, turningPoints);

    return NextResponse.json({ evals, turningPoints, patterns });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
