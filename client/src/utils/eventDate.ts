const DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 'YYYY-MM-DD' (giờ máy) hoặc 'YYYY-MM-DD HH:MM:SS' / ISO (SQLite, UTC). */
export function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

/** Số ngày từ s đến now (>= 0 nếu s ở quá khứ). null nếu s không hợp lệ. */
export function daysAgo(s?: string | null, now: Date = new Date()): number | null {
  const d = parseDate(s);
  return d ? Math.floor((now.getTime() - d.getTime()) / DAY) : null;
}

export function isValidDateKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return toKey(new Date(y, m - 1, d + n));
}

/** Số ngày từ hôm nay đến key (0 = hôm nay, âm = đã qua). */
export function daysUntil(key: string, today: Date = new Date()): number {
  const [y, m, d] = key.split('-').map(Number);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - start.getTime()) / DAY);
}

export const formatDateVi = (key: string) => {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
};
