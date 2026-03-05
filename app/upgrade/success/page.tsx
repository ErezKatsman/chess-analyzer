// app/upgrade/success/page.tsx
// shown after a successful stripe checkout redirect
// stripe sends the user here with ?session_id=... in the url
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UpgradeSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-xl text-center">
        <div className="text-5xl mb-4">♟</div>
        <h1 className="text-2xl font-bold mb-2">you&apos;re now premium</h1>
        <p className="text-muted-foreground text-sm mb-6">
          unlimited analyses, drills, and ai coaching are now unlocked. go crush some openings.
        </p>
        <Button asChild className="w-full">
          <Link href="/">go to my dashboard →</Link>
        </Button>
      </div>
    </main>
  );
}
