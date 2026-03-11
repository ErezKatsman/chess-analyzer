'use client';

// tracks lifetime analysis usage against the server quota.
// free tier: FREE_LIMIT analyses lifetime.
// fetches from /api/user/quota on mount — server is the authoritative gate.

import * as React from 'react';

// exported so GameReplay and PaywallModal can reference the limit in display text
export const FREE_LIMIT = 10;

type UseAnalysisQuotaReturn = {
  used: number;
  remaining: number;
  isAtLimit: boolean;
  // returns false when at limit; server enforces via 402 regardless
  consume: () => boolean;
};

export function useAnalysisQuota(): UseAnalysisQuotaReturn {
  const [used, setUsed] = React.useState(0);

  const [isPaid, setIsPaid] = React.useState(false);

  // fetch lifetime count from server on mount
  React.useEffect(() => {
    fetch('/api/user/quota')
      .then(r => r.json())
      .then((data: { used?: number; isPaid?: boolean }) => {
        if (typeof data.used === 'number') setUsed(data.used);
        if (data.isPaid) setIsPaid(true);
      })
      .catch(() => {
        // silently ignore — server still gates via 402
      });
  }, []);

  const remaining = isPaid ? Infinity : Math.max(0, FREE_LIMIT - used);
  const isAtLimit = !isPaid && used >= FREE_LIMIT;

  const consume = React.useCallback((): boolean => !isAtLimit, [isAtLimit]);

  return { used, remaining, isAtLimit, consume };
}
