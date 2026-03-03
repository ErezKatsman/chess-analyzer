'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ChangeUsernameButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/user/profile', { method: 'DELETE' });
      router.push('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
    >
      {loading ? 'clearing…' : 'change username'}
    </button>
  );
}
