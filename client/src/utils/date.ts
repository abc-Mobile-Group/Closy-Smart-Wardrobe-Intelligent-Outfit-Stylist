export const toDateKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const daysSince = (dateKey?: string | null): number | null => {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor((Date.now() - new Date(y, m - 1, d).getTime()) / 86_400_000);
};
