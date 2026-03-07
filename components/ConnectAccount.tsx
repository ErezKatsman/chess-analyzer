'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { checkAndSetUserExist } from '@/lib/userUtils';
import { ONBOARDING_KEY, type OnboardingStoredData } from '@/components/OnboardingModal';
import { QUICK_ANALYSIS_KEY } from '@/components/QuickAnalysisLoader';

// shown to signed-in users who have no saved chess.com username yet.
// this is the ONLY place that saves a chess.com username to a profile.
export function ConnectAccount() {
  const router = useRouter();
  const { user } = useUser();
  const [userName, setUserName] = useState('');
  const [isClickable, setIsClickable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // mounted=false on server and initial client render — both show spinner, no hydration mismatch
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    if (sessionStorage.getItem(ONBOARDING_KEY)) setSaving(true);
    setMounted(true);
  }, []);

  // auto-submit if user came through the onboarding modal (data saved in sessionStorage)
  useEffect(() => {
    const raw = sessionStorage.getItem(ONBOARDING_KEY);
    if (!raw) return;
    let stored: OnboardingStoredData;
    try {
      stored = JSON.parse(raw) as OnboardingStoredData;
    } catch {
      sessionStorage.removeItem(ONBOARDING_KEY);
      return;
    }
    if (!stored.chessUsername) return;
    const savedUsername = stored.chessUsername;
    sessionStorage.removeItem(ONBOARDING_KEY);
    setSaving(true);
    fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stored),
    }).then(res => {
      if (res.ok) {
        sessionStorage.setItem(QUICK_ANALYSIS_KEY, '1');
        router.push('/');
        router.refresh();
      } else {
        setUserName(savedUsername);
        setError('couldn\'t link your account — please try again');
        setSaving(false);
      }
    }).catch(() => {
      setUserName(savedUsername);
      setError('network error — please try again');
      setSaving(false);
    });
  }, [router]);

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
        sessionStorage.setItem(QUICK_ANALYSIS_KEY, '1');
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('something went wrong, please try again');
    } finally {
      setSaving(false);
    }
  }

  // show spinner before hydration (mounted=false) and while auto-submitting from onboarding
  if (!mounted || (saving && !userName)) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse select-none">♟</div>
          <p className="text-muted-foreground text-sm">Setting up your coaching plan…</p>
        </div>
      </main>
    );
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
              onKeyDown={(e) => { if (e.key === 'Enter') void handleConnect(); }}
              className="h-11"
              autoFocus
            />
            <Button
              disabled={!isClickable || saving}
              onClick={() => void handleConnect()}
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
