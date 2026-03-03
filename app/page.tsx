import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db/mongo';
import { UserProfile } from '@/lib/db/schemas';
import { Hero } from '@/components/Hero';
import { ConnectAccount } from '@/components/ConnectAccount';
import { UserPageContent } from '@/components/UserPageContent';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface HomeProps {
  searchParams: {
    year?: string;
    month?: string;
  };
}

function parseIntParam(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export default async function Home({ searchParams }: HomeProps) {
  const { userId } = await auth();

  if (userId) {
    try {
      await connectDB();
      const profile = await UserProfile.findOne({ clerkUserId: userId }).lean();
      if (profile?.chessUsername) {
        return (
          <UserPageContent
            userName={profile.chessUsername}
            year={parseIntParam(searchParams.year)}
            month={parseIntParam(searchParams.month)}
            basePath="/"
          />
        );
      }
      // signed in but no chess.com account linked yet
      return <ConnectAccount />;
    } catch {
      // db unavailable — fall through to hero for graceful degradation
    }
  }

  return <Hero />;
}
