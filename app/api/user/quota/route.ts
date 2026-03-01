import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db/mongo';
import { UserQuota } from '@/lib/db/schemas';

const FREE_LIMIT = 3;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/user/quota — returns current month analysis usage for the signed-in user
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await connectDB();

  const month = currentMonth();
  const record = await UserQuota.findOne({ clerkUserId: userId, month }).lean();
  const used = record?.count ?? 0;

  return NextResponse.json({ used, limit: FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - used) });
}
