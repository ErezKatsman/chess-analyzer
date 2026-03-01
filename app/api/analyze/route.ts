// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { auth } from '@clerk/nextjs/server';
import { getParsedMovesFromPgn } from '@/lib/chess/moves';
import { evaluateFens } from '@/lib/analysis/stockfish';
import { computeTurningPoints } from '@/lib/analysis/insights';
import { detectPatterns } from '@/lib/analysis/patterns';
import { connectDB } from '@/lib/db/mongo';
import { GameAnalysis, UserQuota } from '@/lib/db/schemas';

const FREE_LIMIT = 3;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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
// body: { pgn: string, playerSide?: 'white'|'black', gameUuid?: string }
export async function POST(request: Request) {
  // require auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

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

  const { pgn, playerSide, gameUuid } = body as {
    pgn: string;
    playerSide?: 'white' | 'black';
    gameUuid?: string;
  };

  await connectDB();

  // check mongodb cache first — skip stockfish if already analyzed
  if (gameUuid) {
    const cached = await GameAnalysis.findOne({ clerkUserId: userId, gameUuid }).lean();
    if (cached) {
      return NextResponse.json({
        evals: cached.evals,
        turningPoints: cached.turningPoints,
        patterns: cached.patterns,
        explanations: cached.explanations ?? [],
        fromCache: true,
      });
    }
  }

  // check + increment quota (server-side, unenforced by client)
  const month = currentMonth();
  const quota = await UserQuota.findOneAndUpdate(
    { clerkUserId: userId, month },
    { $setOnInsert: { clerkUserId: userId, month, count: 0 } },
    { upsert: true, new: true },
  );

  if (quota.count >= FREE_LIMIT) {
    return NextResponse.json({ error: 'quota_exceeded', limit: FREE_LIMIT }, { status: 402 });
  }

  // increment count before running analysis (prevents race conditions)
  await UserQuota.updateOne({ clerkUserId: userId, month }, { $inc: { count: 1 }, updatedAt: new Date() });

  const moves = getParsedMovesFromPgn(pgn);
  if (moves.length === 0) {
    return NextResponse.json(
      { error: 'could not parse pgn or game has no moves' },
      { status: 400 },
    );
  }

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
    const turningPoints = playerSide
      ? allTurningPoints.filter((tp) => tp.side === playerSide)
      : allTurningPoints;
    const patterns = detectPatterns(moves, rawEvals, turningPoints);

    // save to mongodb so future loads are instant
    if (gameUuid) {
      await GameAnalysis.findOneAndUpdate(
        { clerkUserId: userId, gameUuid },
        { clerkUserId: userId, gameUuid, pgn, playerSide: playerSide ?? 'white', evals, turningPoints, patterns, analyzedAt: new Date() },
        { upsert: true },
      );
    }

    return NextResponse.json({ evals, turningPoints, patterns });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
