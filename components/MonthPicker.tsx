'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ArchiveEntry } from '@/lib/services/chesscom';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type MonthPickerProps = {
  userName: string;
  archives: ArchiveEntry[];
  selectedYear: number;
  selectedMonth: number; // 1-12
  // '/' = home page (no userName in URL); '/user' = user page (default)
  basePath?: string;
};

export function MonthPicker({ userName, archives, selectedYear, selectedMonth, basePath = '/user' }: MonthPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedValue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const [year, month] = e.target.value.split('-').map(Number);
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (basePath !== '/') params.set('userName', userName);
    // preserve active tab when on the dashboard
    const tab = searchParams.get('tab');
    if (basePath === '/' && tab) params.set('tab', tab);
    router.push(`${basePath}?${params.toString()}`);
  }

  if (archives.length === 0) return null;

  return (
    <select
      value={selectedValue}
      onChange={handleChange}
      className="rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
      aria-label="select archive month"
    >
      {archives.map(({ year, month }) => {
        const value = `${year}-${String(month).padStart(2, '0')}`;
        return (
          <option key={value} value={value}>
            {MONTH_NAMES[month - 1]} {year}
          </option>
        );
      })}
    </select>
  );
}
