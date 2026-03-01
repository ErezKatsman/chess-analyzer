import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db/mongo';
import { UserProfile } from '@/lib/db/schemas';

// GET /api/user/profile — fetch saved chess.com username for signed-in user
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await connectDB();
  const profile = await UserProfile.findOne({ clerkUserId: userId }).lean();

  return NextResponse.json({ chessUsername: profile?.chessUsername ?? null });
}

// POST /api/user/profile — save chess.com username for signed-in user
// body: { chessUsername: string }
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

  const chessUsername = (body as { chessUsername?: unknown }).chessUsername;
  if (typeof chessUsername !== 'string' || !chessUsername.trim()) {
    return NextResponse.json({ error: 'chessUsername is required' }, { status: 400 });
  }

  await connectDB();

  await UserProfile.findOneAndUpdate(
    { clerkUserId: userId },
    { clerkUserId: userId, chessUsername: chessUsername.trim(), updatedAt: new Date() },
    { upsert: true },
  );

  return NextResponse.json({ chessUsername: chessUsername.trim() });
}
