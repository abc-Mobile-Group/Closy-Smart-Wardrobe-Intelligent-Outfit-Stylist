import { WardrobeItem } from '../types/item';
import { WeatherData } from './WeatherService';
import { generateOutfitSuggestions, LocalSuggestedOutfit } from '../engine/suggest';

export interface DisplayOutfitItem {
  id: string | number;
  name: string;
  category: 'Áo' | 'Quần' | 'Váy' | 'Đầm' | 'Giày';
  colorName?: string;
  colorHex?: string;
  image: any; // { uri: string }
}

export interface SuggestedOutfit {
  id: string;
  title: string;
  subtitle: string;
  context: string;
  type: 'one_piece' | 'two_piece';
  harmonyScore: number;
  harmonyBadge: string;
  harmonyTitle: string;
  weatherAdvice?: string;
  reasons: string[];
  items: DisplayOutfitItem[];
  score: number;
}

const toSuggested = (
  s: LocalSuggestedOutfit,
  idx: number,
  context: string,
  weather: WeatherData,
): SuggestedOutfit => ({
  id: s.id || `local-${idx + 1}`,
  title: s.title,
  subtitle: s.subtitle,
  context,
  type: s.type || 'two_piece',
  harmonyScore: s.harmonyScore ?? 3,
  harmonyBadge: s.harmonyBadge || '+3 Phối đẹp',
  harmonyTitle: s.reasons[0] || 'Phối màu thông minh',
  weatherAdvice: weather.recommendationAdvice,
  reasons: s.reasons,
  items: s.items.map((it) => ({
    id: it.id,
    name: it.name,
    category: it.category,
    colorName: it.colorName,
    colorHex: it.colorHex,
    image: it.image,
  })),
  score: s.score,
});

const sig = (o: LocalSuggestedOutfit) => o.items.map((i) => String(i.id)).sort().join('+');
const coreIds = (o: LocalSuggestedOutfit) => o.items.filter((i) => i.category !== 'Giày').map((i) => String(i.id));

/** Chọn tối đa n bộ: ưu tiên các bộ không trùng áo/quần/đầm với bộ đã chọn, thiếu thì lấp bằng bộ điểm cao kế tiếp. */
export function pickDiverse(sorted: LocalSuggestedOutfit[], n = 3): LocalSuggestedOutfit[] {
  const picked: LocalSuggestedOutfit[] = [];
  const used = new Set<string>();
  for (const o of sorted) {
    if (picked.length >= n) break;
    if (coreIds(o).some((id) => used.has(id))) continue;
    picked.push(o);
    coreIds(o).forEach((id) => used.add(id));
  }
  const seen = new Set(picked.map(sig));
  for (const o of sorted) {
    if (picked.length >= n) break;
    if (seen.has(sig(o))) continue;
    picked.push(o);
    seen.add(sig(o));
  }
  return picked.sort((a, b) => b.score - a.score);
}

export class OutfitService {
  /**
   * Local-first (quyết định #5 của backlog): engine chạy hoàn toàn trên máy,
   * không gửi dữ liệu tủ đồ lên server, chạy được offline.
   */
  static async getSuggestions(
    items: WardrobeItem[],
    contextName: string,
    weather: WeatherData,
  ): Promise<SuggestedOutfit[]> {
    if (!items || items.length === 0) return [];
    const all = generateOutfitSuggestions(items, contextName, weather);
    return pickDiverse(all, 3).map((s, i) => toSuggested(s, i, contextName, weather));
  }

  /** Bộ điểm cao nhất có chứa món itemId (dùng cho "Phối ngay" ở màn Thống kê). */
  static async findOutfitWith(
    items: WardrobeItem[],
    itemId: number | string,
    contextName: string,
    weather: WeatherData,
  ): Promise<SuggestedOutfit | null> {
    const found = generateOutfitSuggestions(items, contextName, weather).find((o) =>
      o.items.some((i) => String(i.id) === String(itemId)),
    );
    return found ? toSuggested(found, 0, contextName, weather) : null;
  }
}
