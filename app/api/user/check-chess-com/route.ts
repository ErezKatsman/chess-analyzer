import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongo';
import { UserProfile } from '@/lib/db/schemas';

// GET /api/user/check-chess-com?userName=X
// public endpoint — returns whether a chess.com username is already linked to an account.
// never exposes PII, only a boolean.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userName = searchParams.get('userName')?.trim();

  if (!userName) {
    return NextResponse.json({ hasAccount: false });
  }

  // escape regex special chars to prevent injection
  const escaped = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  await connectDB();
  const profile = await UserProfile.findOne({
    chessUsername: { $regex: new RegExp(`^${escaped}$`, 'i') },
  }).lean();

  return NextResponse.json({ hasAccount: Boolean(profile) });
}
