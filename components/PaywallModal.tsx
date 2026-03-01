'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FREE_LIMIT } from '@/lib/hooks/useAnalysisQuota';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PaywallModal({ open, onClose }: Props) {
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

        <div className="flex flex-col gap-2">
          {/* placeholder upgrade link — replace with real payment url */}
          <Button asChild className="w-full">
            <a href="#upgrade" onClick={onClose}>
              upgrade for $5/month →
            </a>
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
