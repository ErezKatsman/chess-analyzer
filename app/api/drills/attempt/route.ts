import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db/mongo';
import { DrillSession } from '@/lib/db/schemas';

// POST /api/drills/attempt — upsert a drill session result
// body: { gameUuid, moveNumber, side, blunderMove, correctMove, solved, attempts }
export async function POST(request: Request) {
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

  const {
    gameUuid,
    moveNumber,
    side,
    blunderMove,
    correctMove,
    solved,
    attempts,
  } = body as {
    gameUuid?: string;
    moveNumber?: number;
    side?: 'white' | 'black';
    blunderMove?: string;
    correctMove?: string;
    solved?: boolean;
    attempts?: number;
  };

  if (!gameUuid || moveNumber === undefined || !side || !correctMove) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  await connectDB();

  // leitner two-box SRS scheduling
  // solve → review in 3 days; fail after ≥2 attempts → retry in 6 hours; otherwise no schedule yet
  const isSolved = solved ?? false;
  const attemptCount = attempts ?? 1;
  let nextReviewAt: Date | undefined;
  if (isSolved) {
    nextReviewAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  } else if (attemptCount >= 2) {
    nextReviewAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
  }

  // upsert — one record per (user, game, move, side)
  await DrillSession.findOneAndUpdate(
    { clerkUserId: userId, gameUuid, moveNumber, side },
    {
      clerkUserId: userId,
      gameUuid,
      moveNumber,
      side,
      blunderMove: blunderMove ?? '',
      correctMove,
      solved: isSolved,
      attempts: attemptCount,
      solvedAt: isSolved ? new Date() : null,
      nextReviewAt: nextReviewAt ?? null,
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
