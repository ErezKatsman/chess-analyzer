'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FREE_LIMIT } from '@/lib/hooks/useAnalysisQuota';

function useCheckout() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'failed to start checkout');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return { startCheckout, loading, error };
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PaywallModal({ open, onClose }: Props) {
  const { startCheckout, loading, error } = useCheckout();

  if (!open) return null;

  return (
    // backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="paywall-title"
    >
      {/* card — stop click propagation so clicking the card doesn't close the modal */}
      <div
        className="relative w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="close"
        >
          ✕
        </button>

        {/* icon */}
        <div className="text-4xl mb-3 text-center">♟</div>

        <h2 id="paywall-title" className="text-lg font-bold text-center mb-1">
          you&apos;ve used your {FREE_LIMIT} free analyses
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-5">
          free tier includes {FREE_LIMIT} full analyses per month. upgrade for unlimited analyses,
          drills, and plain-english coaching.
        </p>

        <ul className="text-sm space-y-2 mb-6">
          {[
            '✓ unlimited game analyses',
            '✓ drills from your own blunders',
            '✓ ai coaching explanations',
            '✓ multi-game weakness reports',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-muted-foreground">
              {feature}
            </li>
          ))}
        </ul>

        {error ? (
          <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button className="w-full" onClick={startCheckout} disabled={loading}>
            {loading ? 'redirecting to checkout…' : 'upgrade for $5/month →'}
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose}>
            maybe later
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          resets on the 1st of each month · cancel anytime
        </p>
      </div>
    </div>
  );
}
