export type HarmonyType = 'neutral' | 'accent' | 'monochrome' | 'analogous' | 'complementary' | 'clash';

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s, l };
}

export const isNeutral = (hex: string) => { const { s, l } = hexToHsl(hex); return s < 0.18 || l < 0.12 || l > 0.92; };
const hueDiff = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

export const LABELS: Record<HarmonyType, string> = {
  neutral: 'Trung tính an toàn', accent: 'Điểm nhấn trên nền trung tính', monochrome: 'Phối đơn sắc',
  analogous: 'Phối tương đồng', complementary: 'Phối tương phản', clash: 'Màu khó hợp',
};

/** Rule-based Color Harmony: đánh giá cả bộ theo cặp màu có sắc độ tệ nhất. */
export function evaluateHarmony(colors: string[]): { type: HarmonyType; score: number; label: string } {
  const chroma = colors.filter((c) => !isNeutral(c)).map((c) => hexToHsl(c).h);
  const make = (type: HarmonyType, score: number) => ({ type, score, label: LABELS[type] });
  if (chroma.length === 0) return make('neutral', 0.85);
  if (chroma.length === 1) return make('accent', 0.9);
  let worst: { type: HarmonyType; score: number } = { type: 'monochrome', score: 1 };
  for (let i = 0; i < chroma.length; i++) for (let j = i + 1; j < chroma.length; j++) {
    const d = hueDiff(chroma[i], chroma[j]);
    const r: { type: HarmonyType; score: number } =
      d <= 15 ? { type: 'monochrome', score: 0.9 } : d <= 45 ? { type: 'analogous', score: 0.85 }
      : d >= 150 ? { type: 'complementary', score: 0.8 } : { type: 'clash', score: 0.4 };
    if (r.score < worst.score) worst = r;
  }
  return make(worst.type, worst.score);
}
