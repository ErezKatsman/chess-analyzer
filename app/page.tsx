import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db/mongo';
import { UserProfile } from '@/lib/db/schemas';
import { Hero } from '@/components/Hero';

// if the signed-in user already has a saved chess.com username,
// skip the hero page and land directly on their games.
export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    try {
      await connectDB();
      const profile = await UserProfile.findOne({ clerkUserId: userId }).lean();
      if (profile?.chessUsername) {
        redirect(`/user?userName=${encodeURIComponent(profile.chessUsername)}`);
      }
    } catch {
      // db unavailable — fall through to the hero page gracefully
    }
  }

  return <Hero />;
}
