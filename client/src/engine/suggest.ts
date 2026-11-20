import type { WeatherData } from '../services/WeatherService';
import type { WardrobeItem } from '../types/item';
import { daysAgo } from '../utils/eventDate';
import { ColorHarmonyEngine, HSLColor } from './ColorHarmonyEngine';

export const EVENT_CONTEXT = 'Sự kiện quan trọng';
/** Món chưa mặc từ ngần này ngày thì được cộng điểm tái sử dụng (chỉ khi bộ đã đạt). */
export const REUSE_AFTER_DAYS = 14;

export interface DisplayItem {
  id: string | number;
  name: string;
  category: 'Áo' | 'Quần' | 'Váy' | 'Đầm' | 'Giày';
  colorName?: string;
  colorHex?: string;
  image: any;
  isDbItem?: boolean;
}

export interface LocalSuggestedOutfit {
  id: string;
  title: string;
  subtitle: string;
  context: string;
  type?: 'one_piece' | 'two_piece';
  harmonyScore?: number;
  harmonyBadge?: string;
  weatherAdvice?: string;
  reasons: string[];
  items: DisplayItem[];
  score: number;
}

/** Mức trang trọng mong muốn theo bối cảnh (backlog mục 6). */
export function targetFormality(context: string): number {
  const c = (context || '').toLowerCase();
  if (c.includes('sự kiện')) return 5;
  if (c.includes('đi làm') || c.includes('công sở') || c.includes('hẹn hò')) return 3;
  return 2; // đi học, đi chơi
}

export function calculateWeatherScore(item: DisplayItem, weather: WeatherData): number {
  let score = 0;
  const nameLower = (item.name || '').toLowerCase();
  const cat = item.category;
  const colorLower = (item.colorName || '').toLowerCase();

  const isColdOrRain = weather.temperature < 22 || weather.isRaining;
  const isHot = weather.temperature > 32;

  if (isColdOrRain) {
    if (['khoác', 'hoodie', 'dài tay', 'len', 'cardigan', 'vest'].some((k) => nameLower.includes(k))) score += 35;
    if (cat === 'Quần' || ['jeans', 'dài', 'kaki'].some((k) => nameLower.includes(k))) score += 25;
    if (nameLower.includes('cộc') || nameLower.includes('ngắn tay') || ((cat === 'Váy' || cat === 'Đầm') && weather.isRaining)) {
      score -= 20;
    }
  } else if (isHot) {
    if (['thun', 'cộc tay', 'ngắn tay', 'lụa', 'croptop', 'phông'].some((k) => nameLower.includes(k))) score += 30;
    if (nameLower.includes('short') || nameLower.includes('ngắn') || cat === 'Váy' || cat === 'Đầm') score += 20;
    // "be" phải khớp nguyên từ, tránh khớp nhầm trong các từ khác
    if (['trắng', 'kem', 'hồng', 'vàng'].some((k) => colorLower.includes(k)) || /(^|\s)be(\s|$)/.test(colorLower)) {
      score += 15;
    }
    if (['khoác', 'hoodie', 'len'].some((k) => nameLower.includes(k))) score -= 40;
  } else {
    score += 10;
  }
  return score;
}

/** Điểm một món theo bối cảnh: nhãn bối cảnh + trừ điểm lệch trang trọng + từ khóa tên. */
export function calculateItemContextScore(item: WardrobeItem, context: string): number {
  let score = 0;
  const nameLower = (item.name || '').toLowerCase();
  const cat = item.category;
  const colorLower = (item.color_name || '').toLowerCase();
  const formality = item.formality || 3;
  const ctxStr = (context || '').toLowerCase();
  const isEvent = ctxStr.includes('sự kiện');

  // Nhãn bối cảnh (sự kiện quan trọng không có nhãn riêng nên bỏ qua)
  if (!isEvent) {
    const cleanCtxs = (item.contexts ? item.contexts.split(',') : []).map((c) => c.trim().toLowerCase()).filter(Boolean);
    const hasExplicit = cleanCtxs.some((c) => ctxStr.includes(c) || c.includes(ctxStr));
    if (hasExplicit) score += 45;
    else if (cleanCtxs.length > 0 && !cleanCtxs.some((c) => c.includes('mọi dịp'))) score -= 25;
  }

  // Trang trọng: trừ điểm theo độ lệch so với mức mong muốn
  score -= 8 * Math.abs(formality - targetFormality(context));

  if (isEvent) {
    if (cat === 'Đầm') score += 20;
    if (['vest', 'blazer', 'sơ mi', 'tây', 'âu', 'loafer', 'giày tây', 'công sở'].some((k) => nameLower.includes(k))) score += 25;
    if (['thun', 'phông', 'short', 'hoodie', 'ba lỗ', 'rách'].some((k) => nameLower.includes(k))) score -= 40;
  } else if (ctxStr.includes('đi làm') || ctxStr.includes('công sở')) {
    if (['sơ mi', 'polo', 'tây', 'kaki', 'âu', 'vest', 'blazer'].some((k) => nameLower.includes(k))) score += 35;
    if (['croptop', 'ba lỗ', 'short', 'rách', 'ngắn'].some((k) => nameLower.includes(k))) score -= 45;
  } else if (ctxStr.includes('hẹn hò')) {
    if (cat === 'Đầm') score += 45;
    else if (cat === 'Váy') score += 30;
    if (['hồng', 'kem', 'đỏ', 'pastel'].some((k) => colorLower.includes(k))) score += 20;
  } else if (ctxStr.includes('đi học')) {
    if (['thun', 'phông', 'sơ mi', 'jeans', 'sneaker'].some((k) => nameLower.includes(k))) score += 30;
  } else if (ctxStr.includes('đi chơi')) {
    if (['thun', 'phông', 'croptop', 'short', 'jeans', 'khoác'].some((k) => nameLower.includes(k))) score += 35;
  }
  return score;
}

export function mapWardrobeItemToDisplay(dbItem: WardrobeItem): DisplayItem {
  return {
    id: dbItem.id,
    name: dbItem.name || `${dbItem.category} ${dbItem.color_name || ''}`.trim(),
    category: dbItem.category,
    colorName: dbItem.color_name || '',
    colorHex: dbItem.color_hex,
    image: { uri: dbItem.image_path },
    isDbItem: true,
  };
}

const colorOf = (it: WardrobeItem): HSLColor => ({ h: it.color_h ?? 0, s: it.color_s ?? 0, l: it.color_l ?? 100 });

const isDress = (it: WardrobeItem) =>
  it.category === 'Đầm' || (it.category === 'Váy' && /đầm|dress/i.test(it.name || ''));
const isTop = (it: WardrobeItem) => it.category === 'Áo' && !/khoác/i.test(it.name || '');
const isBottom = (it: WardrobeItem) => it.category === 'Quần' || (it.category === 'Váy' && !isDress(it));
const isShoe = (it: WardrobeItem) => it.category === 'Giày';

function titleFor(context: string): string {
  const c = context.toLowerCase();
  if (c.includes('sự kiện')) return 'Chỉn chu cho sự kiện';
  if (c.includes('đi làm')) return 'Chỉn chu công sở';
  if (c.includes('hẹn hò')) return 'Cuốn hút hẹn hò';
  if (c.includes('đi chơi')) return 'Phóng khoáng dạo phố';
  return 'Năng động giảng đường';
}

/**
 * Gợi ý phối đồ local-first: Tổng = Màu + Trang trọng + Đồng bộ + Tái sử dụng (+ thời tiết).
 * Đầm đi một mình (không áo/quần); áo + quần/váy; giày chọn theo độ hợp màu.
 * Trả về toàn bộ tổ hợp, điểm giảm dần; bộ "xung đột màu" bị loại nếu còn lựa chọn khác.
 */
export function generateOutfitSuggestions(
  dbItems: WardrobeItem[],
  contextName: string,
  weather: WeatherData,
  now: Date = new Date(),
): LocalSuggestedOutfit[] {
  if (!dbItems || dbItems.length === 0) return [];

  const target = targetFormality(contextName);
  const dresses = dbItems.filter(isDress);
  const tops = dbItems.filter(isTop);
  const bottoms = dbItems.filter(isBottom);
  const shoes = dbItems.filter(isShoe);

  const staleOf = (items: WardrobeItem[]) => {
    let best: { it: WardrobeItem; d: number } | null = null;
    for (const it of items) {
      const d = daysAgo(it.last_worn ?? it.created_at, now);
      if (d !== null && d >= REUSE_AFTER_DAYS && (!best || d > best.d)) best = { it, d };
    }
    return best;
  };
  const staleReason = (s: { it: WardrobeItem; d: number }) =>
    `Tái sử dụng: ${s.it.name || s.it.category} ${s.it.last_worn ? `đã ${s.d} ngày chưa mặc` : 'chưa được mặc lần nào'}`;

  const pickShoe = (main: WardrobeItem): WardrobeItem | null => {
    let best: WardrobeItem | null = null;
    let bestScore = -Infinity;
    for (const s of shoes) {
      const sc = ColorHarmonyEngine.evaluateHarmony(colorOf(main), colorOf(s)).score * 10 + calculateItemContextScore(s, contextName);
      if (sc > bestScore) { best = s; bestScore = sc; }
    }
    return best;
  };

  const candidates: LocalSuggestedOutfit[] = [];

  // 1. Đầm (one-piece)
  for (const d of dresses) {
    const dd = mapWardrobeItemToDisplay(d);
    const shoe = pickShoe(d);
    const parts = shoe ? [d, shoe] : [d];
    const wScore = calculateWeatherScore(dd, weather);
    const stale = staleOf(parts);
    const reasons = ['Đầm liền gọn gàng, không cần phối thêm'];
    if (Math.abs((d.formality || 3) - target) <= 1) reasons.push(`Độ lịch sự hợp ${contextName.toLowerCase()}`);
    if (wScore > 10) reasons.push(`Hợp thời tiết hiện tại (${weather.temperature}°)`);
    if (stale) reasons.push(staleReason(stale));

    candidates.push({
      id: `dress-${d.id}`,
      title: `Duyên dáng ${dd.name} · ${contextName}`,
      subtitle: `Đầm liền ${dd.colorName || ''} thanh lịch`.replace('  ', ' '),
      context: contextName,
      type: 'one_piece',
      harmonyScore: 3,
      harmonyBadge: '+3 Đầm liền',
      weatherAdvice: weather.recommendationAdvice,
      reasons,
      items: parts.map(mapWardrobeItemToDisplay),
      score: 50 + 30 + calculateItemContextScore(d, contextName) + wScore + (stale ? 10 : 0),
    });
  }

  // 2. Áo + Quần/Váy (two-piece)
  const shoeByBottom = new Map<number, WardrobeItem | null>();
  for (const top of tops) {
    const dTop = mapWardrobeItemToDisplay(top);
    for (const bot of bottoms) {
      const dBot = mapWardrobeItemToDisplay(bot);
      const harmony = ColorHarmonyEngine.evaluateHarmony(colorOf(top), colorOf(bot));

      if (!shoeByBottom.has(bot.id)) shoeByBottom.set(bot.id, pickShoe(bot));
      const shoe = shoeByBottom.get(bot.id) ?? null;
      const parts = shoe ? [top, bot, shoe] : [top, bot];

      const fTop = top.formality || 3;
      const fBot = bot.formality || 3;
      const syncPenalty = -5 * Math.abs(fTop - fBot);
      const wScore = calculateWeatherScore(dTop, weather) + calculateWeatherScore(dBot, weather);
      const stale = harmony.score >= 2 ? staleOf(parts) : null; // chỉ cộng khi bộ đã đạt

      const score =
        50 +
        calculateItemContextScore(top, contextName) +
        calculateItemContextScore(bot, contextName) +
        harmony.score * 10 +
        syncPenalty +
        wScore +
        (stale ? 10 : 0);

      const reasons = [harmony.title];
      const dev = Math.abs(fTop - target) + Math.abs(fBot - target);
      if (dev <= 2) reasons.push(`Độ lịch sự hợp ${contextName.toLowerCase()}`);
      if (fTop === fBot) reasons.push('Áo và quần cùng mức trang trọng');
      if (wScore > 20) reasons.push(`Hợp thời tiết hiện tại (${weather.temperature}°)`);
      if (stale) reasons.push(staleReason(stale));

      candidates.push({
        id: `two-${top.id}-${bot.id}`,
        title: titleFor(contextName),
        subtitle: `${dTop.colorName || 'Áo'} + ${dBot.colorName || 'Quần'} · ${harmony.badgeText}`,
        context: contextName,
        type: 'two_piece',
        harmonyScore: harmony.score,
        harmonyBadge: harmony.badgeText,
        weatherAdvice: weather.recommendationAdvice,
        reasons,
        items: parts.map(mapWardrobeItemToDisplay),
        score,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const good = candidates.filter((c) => c.harmonyScore !== -2);
  return good.length > 0 ? good : candidates;
}
