import { outfitApi, SuggestedOutfitDTO } from '../api/endpoints';
import { WardrobeItem } from '../types/item';
import { WeatherData } from './WeatherService';
import { generateOutfitSuggestions } from '../engine/suggest';

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

    // 3. Fallback Local-First tại Client khi mất mạng (Sử dụng ColorHarmonyEngine & suggest.ts)
    const localSuggestions = generateOutfitSuggestions(items, contextName, weather);
    return localSuggestions.map((s, idx) => ({
      id: `local-${idx + 1}`,
      title: s.title,
      subtitle: s.subtitle,
      context: contextName,
      type: s.type || 'two_piece',
      harmonyScore: s.harmonyScore || 3,
      harmonyBadge: s.harmonyBadge || '+3 Phối đẹp',
      harmonyTitle: 'Phối màu thông minh',
      weatherAdvice: weather.recommendationAdvice,
      items: s.items.map((it) => ({
        id: it.id,
        name: it.name,
        category: it.category,
        colorName: it.colorName,
        colorHex: it.colorHex,
        image: it.image,
      })),
      score: s.score,
    }));
  }
}



