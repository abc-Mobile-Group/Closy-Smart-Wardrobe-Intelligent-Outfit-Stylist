import { outfitApi, SuggestedOutfitDTO } from '../api/endpoints';
import { WardrobeItem } from '../types/item';
import { WeatherData } from './WeatherService';
import { ColorHarmonyEngine, HSLColor } from '../engine/ColorHarmonyEngine';

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
  items: DisplayOutfitItem[];
  score: number;
}

export class OutfitService {
  /**
   * Gọi Backend API POST /outfit/suggest để xử lý gợi ý phối đồ thông minh.
   * Nếu có lỗi mạng hoặc backend offline, tự động fallback về ColorHarmonyEngine local tại client (Local-First).
   */
  static async getSuggestions(
    items: WardrobeItem[],
    contextName: string,
    weather: WeatherData,
  ): Promise<SuggestedOutfit[]> {
    if (!items || items.length === 0) {
      return [];
    }

    try {
      // 1. Chuẩn bị payload gửi lên Backend
      const payloadItems = items.map((it) => ({
        id: it.id,
        name: it.name || `${it.category} ${it.color_name || ''}`.trim(),
        category: it.category,
        image_path: it.image_path,
        color_h: it.color_h ?? 0,
        color_s: it.color_s ?? 0,
        color_l: it.color_l ?? 100,
        color_hex: it.color_hex,
        color_name: it.color_name,
        formality: it.formality ?? 3,
        contexts: it.contexts ? it.contexts.split(',') : [],
      }));

      const weatherPayload = {
        temperature: weather.temperature,
        weather_code: weather.weatherCode,
        is_raining: weather.isRaining,
        location_name: weather.locationName,
        condition_description: weather.conditionDescription,
        recommendation_advice: weather.recommendationAdvice,
      };

      // 2. Gửi yêu cầu gợi ý lên Backend
      const response = await outfitApi.suggest({
        items: payloadItems,
        context: contextName,
        weather: weatherPayload,
      });

      if (response && response.success && response.outfits && response.outfits.length > 0) {
        return response.outfits.map((dto: SuggestedOutfitDTO, index: number) => ({
          id: `outfit-${index + 1}`,
          title: dto.title,
          subtitle: dto.subtitle,
          context: contextName,
          type: dto.type,
          harmonyScore: dto.harmony_score,
          harmonyBadge: dto.harmony_badge,
          harmonyTitle: dto.harmony_title,
          weatherAdvice: response.weather_advice || weather.recommendationAdvice,
          score: dto.score,
          items: dto.items.map((it) => ({
            id: it.id,
            name: it.name,
            category: it.category,
            colorName: it.color_name,
            colorHex: it.color_hex,
            image: { uri: it.image_path },
          })),
        }));
      }
    } catch (apiError) {
      console.warn('[OutfitService] Lỗi gọi Backend gợi ý, kích hoạt Local-First fallback:', apiError);
    }

    // 3. Fallback Local-First tại Client khi mất mạng (Sử dụng ColorHarmonyEngine)
    return this.generateLocalFallback(items, contextName, weather);
  }

  /**
   * Bộ xử lý gợi ý dự phòng độc lập tại client (Local-First):
   * Áp dụng chính xác các quy tắc ColorHarmonyEngine và thời trang Closy.
   */
  private static generateLocalFallback(
    items: WardrobeItem[],
    contextName: string,
    weather: WeatherData,
  ): SuggestedOutfit[] {
    const isDress = (it: WardrobeItem) =>
      it.category === 'Đầm' ||
      (it.category === 'Váy' && (it.name?.toLowerCase().includes('đầm') || it.name?.toLowerCase().includes('dress')));
    const isTop = (it: WardrobeItem) =>
      it.category === 'Áo' && !it.name?.toLowerCase().includes('khoác') && !it.name?.toLowerCase().includes('hoodie');
    const isBottom = (it: WardrobeItem) => it.category === 'Quần' || (it.category === 'Váy' && !isDress(it));
    const isShoe = (it: WardrobeItem) => it.category === 'Giày';

    const dresses = items.filter(isDress);
    const tops = items.filter(isTop);
    const bottoms = items.filter(isBottom);
    const shoes = items.filter(isShoe);

    const candidates: SuggestedOutfit[] = [];

    // 1. Gợi ý Đầm (One-Piece Dress)
    for (const d of dresses) {
      const outfitItems: DisplayOutfitItem[] = [
        {
          id: d.id,
          name: d.name,
          category: d.category,
          colorName: d.color_name,
          colorHex: d.color_hex,
          image: { uri: d.image_path },
        },
      ];
      if (shoes.length > 0) {
        outfitItems.push({
          id: shoes[0].id,
          name: shoes[0].name,
          category: shoes[0].category,
          colorName: shoes[0].color_name,
          colorHex: shoes[0].color_hex,
          image: { uri: shoes[0].image_path },
        });
      }

      candidates.push({
        id: `local-dress-${d.id}`,
        title: `Duyên dáng ${d.name} · ${contextName}`,
        subtitle: `Đầm liền ${d.color_name || ''} thanh lịch, nhẹ nhàng`,
        context: contextName,
        type: 'one_piece',
        harmonyScore: 3,
        harmonyBadge: '+3 Đầm liền',
        harmonyTitle: 'Đầm liền duyên dáng',
        weatherAdvice: weather.recommendationAdvice,
        items: outfitItems,
        score: 80,
      });
    }

    // 2. Gợi ý Áo + Quần / Chân váy (Two-Piece)
    for (const top of tops) {
      const topColor: HSLColor = { h: top.color_h ?? 0, s: top.color_s ?? 0, l: top.color_l ?? 100 };
      for (const bot of bottoms) {
        const botColor: HSLColor = { h: bot.color_h ?? 0, s: bot.color_s ?? 0, l: bot.color_l ?? 100 };
        const harmony = ColorHarmonyEngine.evaluateHarmony(topColor, botColor);

        const outfitItems: DisplayOutfitItem[] = [
          {
            id: top.id,
            name: top.name,
            category: top.category,
            colorName: top.color_name,
            colorHex: top.color_hex,
            image: { uri: top.image_path },
          },
          {
            id: bot.id,
            name: bot.name,
            category: bot.category,
            colorName: bot.color_name,
            colorHex: bot.color_hex,
            image: { uri: bot.image_path },
          },
        ];

        if (shoes.length > 0) {
          outfitItems.push({
            id: shoes[0].id,
            name: shoes[0].name,
            category: shoes[0].category,
            colorName: shoes[0].color_name,
            colorHex: shoes[0].color_hex,
            image: { uri: shoes[0].image_path },
          });
        }

        candidates.push({
          id: `local-two-${top.id}-${bot.id}`,
          title: `Năng động ${contextName.toLowerCase()}`,
          subtitle: `${top.color_name || 'Áo'} + ${bot.color_name || 'Quần'} · ${harmony.badgeText}`,
          context: contextName,
          type: 'two_piece',
          harmonyScore: harmony.score,
          harmonyBadge: harmony.badgeText,
          harmonyTitle: harmony.title,
          weatherAdvice: weather.recommendationAdvice,
          items: outfitItems,
          score: 50 + harmony.score * 10,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 5);
  }
}
