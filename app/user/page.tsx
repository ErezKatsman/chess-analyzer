import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db/mongo';
import { UserProfile } from '@/lib/db/schemas';
import { UserPageContent, MissingUsernamePage } from '@/components/UserPageContent';

interface UserPageProps {
  searchParams: {
    userName?: string;
    year?: string;
    month?: string;
  };
}

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function normalizeUserName(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '';
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value;
  }
}

function parseIntParam(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export default async function UserPage({ searchParams }: UserPageProps) {
  const userName = normalizeUserName(searchParams.userName);
  if (!userName) return <MissingUsernamePage />;

  // if the signed-in user owns this chess.com account, send them to their dashboard
  const { userId } = await auth();
  if (userId) {
    try {
      await connectDB();
      const profile = await UserProfile.findOne({ clerkUserId: userId }).lean();
      if (profile?.chessUsername?.toLowerCase() === userName.toLowerCase()) {
        redirect('/');
      }
    } catch {
      // db unavailable — fall through to browse mode
    }
  }

  return (
    <UserPageContent
      userName={userName}
      year={parseIntParam(searchParams.year)}
      month={parseIntParam(searchParams.month)}
      basePath="/user"
    />
  );
}
