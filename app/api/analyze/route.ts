// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { auth } from '@clerk/nextjs/server';
import { getParsedMovesFromPgn } from '@/lib/chess/moves';
import { evaluateFens } from '@/lib/analysis/stockfish';
import { computeAccuracyDebug } from '@/lib/analysis/accuracy';
import { computeTurningPoints } from '@/lib/analysis/insights';
import { detectPatterns } from '@/lib/analysis/patterns';
import { connectDB } from '@/lib/db/mongo';
import { GameAnalysis, UserProfile } from '@/lib/db/schemas';

const LIFETIME_FREE_LIMIT = 10;
const ANALYSIS_VERSION = 1;

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

  const { pgn, playerSide, gameUuid, force } = body as {
    pgn: string;
    playerSide?: 'white' | 'black';
    gameUuid?: string;
    force?: boolean;
  };

  await connectDB();

  // check mongodb cache first — skip stockfish if already analyzed
  // fall through when force=true AND cached version is stale (free re-analysis)
  if (gameUuid) {
    const cached = await GameAnalysis.findOne({ clerkUserId: userId, gameUuid }).lean();
    if (cached) {
      const isStale = (cached.analysisVersion ?? 0) < ANALYSIS_VERSION;
      if (!force || !isStale) {
        return NextResponse.json({
          evals: cached.evals,
          turningPoints: cached.turningPoints,
          patterns: cached.patterns,
          explanations: cached.explanations ?? [],
          accuracy: cached.accuracy ?? null,
          fromCache: true,
        });
      }
      // force=true + stale → fall through to re-run, quota bypassed below
    }
  }

  // paid users skip the monthly quota gate entirely
  // stale re-analysis (force=true + gameUuid) is also free — no quota consumed
  const profile = await UserProfile.findOne({ clerkUserId: userId }, { plan: 1 }).lean();
  const isPaid = profile?.plan === 'paid';
  const isStaleReanalysis = force === true && Boolean(gameUuid);

  if (!isPaid && !isStaleReanalysis) {
    // lifetime quota — count existing GameAnalysis docs for this user
    // no increment needed: the new doc saved at end of analysis is the implicit counter
    const lifetimeCount = await GameAnalysis.countDocuments({ clerkUserId: userId });
    if (lifetimeCount >= LIFETIME_FREE_LIMIT) {
      return NextResponse.json({ error: 'quota_exceeded', limit: LIFETIME_FREE_LIMIT }, { status: 402 });
    }
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
    // patterns detect only the player's own weaknesses; save all TPs to DB so
    // the narrative can count opponent blunders correctly at display time
    const playerTurningPoints = playerSide
      ? allTurningPoints.filter((tp) => tp.side === playerSide)
      : allTurningPoints;
    const patterns = detectPatterns(moves, rawEvals, playerTurningPoints);

    // computeAccuracyDebug returns both accuracy + avgCpLoss in one pass — no need to call twice
    const whiteDebug = computeAccuracyDebug(evals, 'white');
    const blackDebug = computeAccuracyDebug(evals, 'black');
    const accuracy = { white: whiteDebug.accuracy, black: blackDebug.accuracy };
    const avgCpLoss = { white: whiteDebug.avgCpLoss, black: blackDebug.avgCpLoss };

    // accuracy sanity log — surfaces collapse-to-zero bugs without changing the formula
    const hasMate = evals.some((e) => e.mate !== null);
    // computes per-move capped losses for one side — called only when SUSPECT fires
    const sideDebugStats = (side: 'white' | 'black') => {
      const sign = side === 'white' ? 1 : -1;
      const losses: number[] = [];
      let missingEvals = false;
      for (let p = 1; p < evals.length; p++) {
        if (side === 'white' && p % 2 !== 1) continue;
        if (side === 'black' && p % 2 !== 0) continue;
        if (evals[p - 1].cp === null && evals[p - 1].mate === null) { missingEvals = true; continue; }
        if (evals[p].cp === null && evals[p].mate === null) { missingEvals = true; continue; }
        const before = sign * (evals[p - 1].cp ?? ((evals[p - 1].mate ?? 1) > 0 ? 2000 : -2000));
        const after = sign * (evals[p].cp ?? ((evals[p].mate ?? 1) > 0 ? 2000 : -2000));
        losses.push(Math.min(Math.max(0, before - after), 1000));
      }
      const moveCount = losses.length;
      const avg = moveCount > 0 ? losses.reduce((a, b) => a + b, 0) / moveCount : 0;
      return {
        moveCount,
        avgCpLoss: Math.round(avg * 10) / 10,
        minCpLoss: moveCount > 0 ? losses.reduce((a, b) => Math.min(a, b), Infinity) : 0,
        maxCpLoss: moveCount > 0 ? losses.reduce((a, b) => Math.max(a, b), -Infinity) : 0,
        missingEvals,
      };
    };
    (['white', 'black'] as const).forEach((side) => {
      const acc = accuracy[side];
      const cpLoss = avgCpLoss[side];
      // formula zero-crossing: 103.1668*exp(-0.04354*x)-3.1669=0 → x≈80cp
      // acc=0 is expected for avgCpLoss≥80; flag only when loss is well below that
      const suspect = acc <= 1 && cpLoss < 70 && !hasMate;
      console.warn(
        `[analyze] accuracy ${side}: acc=${acc} avgCpLoss=${cpLoss}` +
          (suspect ? ' ⚠️ SUSPECT' : ''),
      );
      if (suspect) console.warn('[analyze] suspect detail:', sideDebugStats(side));
    });

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
          turningPoints: allTurningPoints,
          patterns,
          accuracy,
          avgCpLoss,
          analysisVersion: ANALYSIS_VERSION,
          analyzedAt: new Date(),
        },
        { upsert: true },
      );
    }

    return NextResponse.json({ evals, turningPoints: allTurningPoints, patterns, accuracy });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
