import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db/mongo';
import { GameAnalysis, UserProfile } from '@/lib/db/schemas';

const LIFETIME_FREE_LIMIT = 10;

// GET /api/user/quota — returns lifetime analysis usage for the signed-in user
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await connectDB();

  const [used, profile] = await Promise.all([
    GameAnalysis.countDocuments({ clerkUserId: userId }),
    UserProfile.findOne({ clerkUserId: userId }, { plan: 1 }).lean(),
  ]);

  const isPaid = profile?.plan === 'paid';

  return NextResponse.json({
    used,
    limit: LIFETIME_FREE_LIMIT,
    // Infinity does not serialize to JSON — omit remaining for paid users; client derives from isPaid
    ...(isPaid ? {} : { remaining: Math.max(0, LIFETIME_FREE_LIMIT - used) }),
    isPaid,
  });
}
