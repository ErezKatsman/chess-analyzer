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
import { GameAnalysis, UserQuota, UserProfile } from '@/lib/db/schemas';

const FREE_LIMIT = 3;
const ANALYSIS_VERSION = 1;

// ── accuracy helpers (mirrors components/game-replay/utils.ts) ────────────────

type EvalLike = { cp: number | null; mate: number | null };

function evalToCp(e: EvalLike): number {
  if (e.cp !== null) return e.cp;
  if (e.mate !== null) return e.mate > 0 ? 2000 : -2000;
  return 0;
}

// chess.com-style: 103.1668 * exp(-0.04354 * avgCpLoss) - 3.1669
// individual move loss capped at 1000cp to avoid outlier distortion
function computeAccuracy(evals: EvalLike[], side: 'white' | 'black'): number {
  const sign = side === 'white' ? 1 : -1;
  const losses: number[] = [];
  for (let p = 1; p < evals.length; p++) {
    if (side === 'white' && p % 2 !== 1) continue;
    if (side === 'black' && p % 2 !== 0) continue;
    const cpBefore = sign * evalToCp(evals[p - 1]);
    const cpAfter = sign * evalToCp(evals[p]);
    losses.push(Math.min(Math.max(0, cpBefore - cpAfter), 1000));
  }
  if (losses.length === 0) return 100;
  const avg = losses.reduce((a, b) => a + b, 0) / losses.length;
  const raw = 103.1668 * Math.exp(-0.04354 * avg) - 3.1669;
  return Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
}

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
        accuracy: cached.accuracy ?? null,
        fromCache: true,
      });
    }
  }

  // paid users skip the monthly quota gate entirely
  const profile = await UserProfile.findOne({ clerkUserId: userId }, { plan: 1 }).lean();
  const isPaid = profile?.plan === 'paid';

  if (!isPaid) {
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

    await UserQuota.updateOne({ clerkUserId: userId, month }, { $inc: { count: 1 }, updatedAt: new Date() });
  }

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

    // compute per-side accuracy scores from the eval array
    const accuracy = {
      white: computeAccuracy(evals, 'white'),
      black: computeAccuracy(evals, 'black'),
    };

    // save to mongodb so future loads are instant
    if (gameUuid) {
      await GameAnalysis.findOneAndUpdate(
        { clerkUserId: userId, gameUuid },
        {
          clerkUserId: userId,
          gameUuid,
          pgn,
          playerSide: playerSide ?? 'white',
          evals,
          turningPoints,
          patterns,
          accuracy,
          analysisVersion: ANALYSIS_VERSION,
          analyzedAt: new Date(),
        },
        { upsert: true },
      );
    }

    return NextResponse.json({ evals, turningPoints, patterns, accuracy });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
