'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { checkAndSetUserExist } from '@/lib/userUtils';

// shown to signed-in users who have no saved chess.com username yet.
// this is the ONLY place that saves a chess.com username to a profile.
export function ConnectAccount() {
  const router = useRouter();
  const { user } = useUser();
  const [userName, setUserName] = useState('');
  const [isClickable, setIsClickable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const normalized = userName.trim();
    if (!normalized) {
      setIsClickable(false);
      setError(null);
      return;
    }
    const id = setTimeout(() => {
      checkAndSetUserExist(setIsClickable, setError, normalized);
    }, 500);
    return () => clearTimeout(id);
  }, [userName]);

  async function handleConnect() {
    if (!isClickable || saving) return;
    const name = userName.trim();
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chessUsername: name }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('something went wrong, please try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">connect your chess.com account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress
              ? `signed in as ${user.primaryEmailAddress.emailAddress}`
              : 'signed in'}
            {' '}· enter YOUR chess.com username below.
          </p>
        </div>

        <div className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Input
              placeholder="chess.com username"
              value={userName}
              onChange={(e) => {
                setIsClickable(false);
                setError(null);
                setUserName(e.target.value);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
              className="h-11"
              autoFocus
            />
            <Button
              disabled={!isClickable || saving}
              onClick={handleConnect}
              className="h-11 px-5"
            >
              {saving ? 'linking…' : 'link account'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            this links your chess.com account for personalized analysis and progress tracking.
            you can change it later in settings.
          </p>
        </div>
      </div>
    </main>
  );
}
