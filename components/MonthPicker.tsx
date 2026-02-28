'use client';

import { useRouter } from 'next/navigation';
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
};

export function MonthPicker({ userName, archives, selectedYear, selectedMonth }: MonthPickerProps) {
  const router = useRouter();

  const selectedValue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const [year, month] = e.target.value.split('-').map(Number);
    const params = new URLSearchParams({
      userName,
      year: String(year),
      month: String(month),
    });
    router.push(`/user?${params.toString()}`);
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
