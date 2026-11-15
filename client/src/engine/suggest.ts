import { WeatherData } from '../services/WeatherService';
import { WardrobeItem } from '../types/item';
import { ColorHarmonyEngine, HSLColor } from './ColorHarmonyEngine';

export interface DisplayItem {
  id: string | number;
  name: string;
  category: 'Áo' | 'Quần' | 'Váy' | 'Đầm' | 'Giày';
  colorName?: string;
  colorHex?: string;
  image: any;
  isDbItem?: boolean;
}

export interface SuggestedOutfit {
  id: string;
  title: string;
  subtitle: string;
  context: string;
  type?: 'one_piece' | 'two_piece';
  harmonyScore?: number;
  harmonyBadge?: string;
  weatherAdvice?: string;
  items: DisplayItem[];
  score: number;
}

export function calculateWeatherScore(item: DisplayItem, weather: WeatherData): number {
  let score = 0;
  const nameLower = (item.name || '').toLowerCase();
  const cat = item.category;
  const colorLower = (item.colorName || '').toLowerCase();

  const isColdOrRain = weather.temperature < 22 || weather.isRaining;
  const isHot = weather.temperature > 32;

  if (isColdOrRain) {
    if (
      nameLower.includes('khoác') ||
      nameLower.includes('hoodie') ||
      nameLower.includes('dài tay') ||
      nameLower.includes('len') ||
      nameLower.includes('cardigan') ||
      nameLower.includes('vest')
    ) {
      score += 35;
    }
    if (cat === 'Quần' || nameLower.includes('jeans') || nameLower.includes('dài') || nameLower.includes('kaki')) {
      score += 25;
    }
    if (nameLower.includes('cộc') || nameLower.includes('ngắn tay') || ((cat === 'Váy' || cat === 'Đầm') && weather.isRaining)) {
      score -= 20;
    }
  } else if (isHot) {
    if (
      nameLower.includes('thun') ||
      nameLower.includes('cộc tay') ||
      nameLower.includes('ngắn tay') ||
      nameLower.includes('lụa') ||
      nameLower.includes('croptop') ||
      nameLower.includes('phông')
    ) {
      score += 30;
    }
    if (nameLower.includes('short') || nameLower.includes('ngắn') || cat === 'Váy' || cat === 'Đầm') {
      score += 20;
    }
    if (
      colorLower.includes('trắng') ||
      colorLower.includes('kem') ||
      colorLower.includes('be') ||
      colorLower.includes('hồng') ||
      colorLower.includes('vàng')
    ) {
      score += 15;
    }
    if (nameLower.includes('khoác') || nameLower.includes('hoodie') || nameLower.includes('len')) {
      score -= 40;
    }
  } else {
    score += 10;
  }

  return score;
}

export function calculateItemContextScore(item: WardrobeItem, context: string): number {
  let score = 0;
  const nameLower = (item.name || '').toLowerCase();
  const cat = item.category;
  const colorLower = (item.color_name || '').toLowerCase();
  const formality = item.formality || 3;
  const ctxStr = (context || '').toLowerCase();

  const rawCtxs = item.contexts ? item.contexts.split(',') : [];
  const cleanCtxs = rawCtxs.map((c) => c.trim().toLowerCase());
  const hasExplicitContext = cleanCtxs.some((c) => ctxStr.includes(c) || c.includes(ctxStr));

  if (hasExplicitContext) {
    score += 45;
  } else if (cleanCtxs.length > 0 && !cleanCtxs.some((c) => c.includes('mọi dịp'))) {
    score -= 25;
  }

  if (ctxStr.includes('đi làm') || ctxStr.includes('công sở')) {
    if (formality === 3) score += 25;
    else if (formality === 5) score += 30;
    else if (formality === 1) score -= 35;

    if (
      nameLower.includes('sơ mi') ||
      nameLower.includes('polo') ||
      nameLower.includes('tây') ||
      nameLower.includes('kaki') ||
      nameLower.includes('âu') ||
      nameLower.includes('vest') ||
      nameLower.includes('blazer')
    ) {
      score += 35;
    }
    if (
      nameLower.includes('croptop') ||
      nameLower.includes('ba lỗ') ||
      nameLower.includes('short') ||
      nameLower.includes('rách') ||
      nameLower.includes('ngắn')
    ) {
      score -= 45;
    }
  } else if (ctxStr.includes('hẹn hò')) {
    if (cat === 'Đầm') score += 45;
    else if (cat === 'Váy') score += 30;

    if (formality >= 3) score += 20;
    else if (formality === 1) score -= 25;

    if (
      colorLower.includes('hồng') ||
      colorLower.includes('kem') ||
      colorLower.includes('đỏ') ||
      colorLower.includes('pastel')
    ) {
      score += 20;
    }
  } else if (ctxStr.includes('đi học')) {
    if (formality <= 3) score += 25;
    else score -= 35;

    if (
      nameLower.includes('thun') ||
      nameLower.includes('phông') ||
      nameLower.includes('sơ mi') ||
      nameLower.includes('jeans') ||
      nameLower.includes('sneaker')
    ) {
      score += 30;
    }
  } else if (ctxStr.includes('đi chơi')) {
    if (formality <= 3) score += 30;
    else score -= 30;

    if (
      nameLower.includes('thun') ||
      nameLower.includes('phông') ||
      nameLower.includes('croptop') ||
      nameLower.includes('short') ||
      nameLower.includes('jeans') ||
      nameLower.includes('khoác')
    ) {
      score += 35;
    }
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

/**
 * Gợi ý phối đồ Local-First: Chỉ sử dụng đồ thật từ tủ đồ SQLite của người dùng.
 * Bỏ hoàn toàn mockdata.
 * Đảm bảo: Đầm không đi cùng áo/quần. Váy/quần đi cùng áo.
 */
export function generateOutfitSuggestions(
  dbItems: WardrobeItem[],
  contextName: string,
  weather: WeatherData,
): SuggestedOutfit[] {
  if (!dbItems || dbItems.length === 0) {
    return [];
  }

  const isDress = (it: WardrobeItem) =>
    it.category === 'Đầm' ||
    (it.category === 'Váy' && (it.name?.toLowerCase().includes('đầm') || it.name?.toLowerCase().includes('dress')));
  const isTop = (it: WardrobeItem) =>
    it.category === 'Áo' && !it.name?.toLowerCase().includes('khoác');
  const isBottom = (it: WardrobeItem) => it.category === 'Quần' || (it.category === 'Váy' && !isDress(it));
  const isShoe = (it: WardrobeItem) => it.category === 'Giày';

  const dresses = dbItems.filter(isDress);
  const tops = dbItems.filter(isTop);
  const bottoms = dbItems.filter(isBottom);
  const shoes = dbItems.filter(isShoe);

  const candidates: SuggestedOutfit[] = [];

  // 1. Phối Đầm (One-Piece)
  for (const d of dresses) {
    const displayD = mapWardrobeItemToDisplay(d);
    const outfitItems = [displayD];
    if (shoes.length > 0) {
      outfitItems.push(mapWardrobeItemToDisplay(shoes[0]));
    }

    candidates.push({
      id: `dress-${d.id}`,
      title: `Duyên dáng ${displayD.name} · ${contextName}`,
      subtitle: `Đầm liền ${displayD.colorName || ''} thanh lịch`,
      context: contextName,
      type: 'one_piece',
      harmonyScore: 3,
      harmonyBadge: '+3 Đầm liền',
      weatherAdvice: weather.recommendationAdvice,
      items: outfitItems,
      score: 50 + calculateItemContextScore(d, contextName) + calculateWeatherScore(displayD, weather),
    });
  }

  // 2. Phối Áo + Quần/Váy (Two-Piece)
  for (const top of tops) {
    const displayTop = mapWardrobeItemToDisplay(top);
    const topColor: HSLColor = { h: top.color_h ?? 0, s: top.color_s ?? 0, l: top.color_l ?? 100 };

    for (const bot of bottoms) {
      const displayBot = mapWardrobeItemToDisplay(bot);
      const botColor: HSLColor = { h: bot.color_h ?? 0, s: bot.color_s ?? 0, l: bot.color_l ?? 100 };

      const harmony = ColorHarmonyEngine.evaluateHarmony(topColor, botColor);

      const outfitItems = [displayTop, displayBot];
      if (shoes.length > 0) {
        outfitItems.push(mapWardrobeItemToDisplay(shoes[0]));
      }

      const score =
        50 +
        calculateItemContextScore(top, contextName) +
        calculateItemContextScore(bot, contextName) +
        harmony.score * 10 +
        calculateWeatherScore(displayTop, weather) +
        calculateWeatherScore(displayBot, weather);

      candidates.push({
        id: `two-${top.id}-${bot.id}`,
        title: `Năng động ${contextName.toLowerCase()}`,
        subtitle: `${displayTop.colorName || 'Áo'} + ${displayBot.colorName || 'Quần'} · ${harmony.badgeText}`,
        context: contextName,
        type: 'two_piece',
        harmonyScore: harmony.score,
        harmonyBadge: harmony.badgeText,
        weatherAdvice: weather.recommendationAdvice,
        items: outfitItems,
        score,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}
