'use client';

// tracks monthly analysis usage in localStorage.
// free tier: FREE_LIMIT full analyses per calendar month.
// resets automatically when the month changes.

import * as React from 'react';

const STORAGE_KEY = 'chess_analyses_quota';
export const FREE_LIMIT = 3;

type QuotaRecord = {
  // iso month string, e.g. "2026-02"
  month: string;
  count: number;
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function readRecord(): QuotaRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { month: currentMonth(), count: 0 };
    const parsed = JSON.parse(raw) as QuotaRecord;
    // reset if we've rolled into a new month
    if (parsed.month !== currentMonth()) return { month: currentMonth(), count: 0 };
    return parsed;
  } catch {
    return { month: currentMonth(), count: 0 };
  }
}

function writeRecord(record: QuotaRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable — silently ignore
  }
}

type UseAnalysisQuotaReturn = {
  // how many analyses used this month
  used: number;
  // remaining free analyses
  remaining: number;
  // true when the user has hit the limit
  isAtLimit: boolean;
  // call before starting an analysis; returns false if limit reached
  consume: () => boolean;
};

export function useAnalysisQuota(): UseAnalysisQuotaReturn {
  const [used, setUsed] = React.useState(0);

  // read from localStorage on mount (client only)
  React.useEffect(() => {
    setUsed(readRecord().count);
  }, []);

  const remaining = Math.max(0, FREE_LIMIT - used);
  const isAtLimit = used >= FREE_LIMIT;

  const consume = React.useCallback((): boolean => {
    const record = readRecord();
    if (record.count >= FREE_LIMIT) return false;
    const updated = { ...record, count: record.count + 1 };
    writeRecord(updated);
    setUsed(updated.count);
    return true;
  }, []);

  return { used, remaining, isAtLimit, consume };
}
