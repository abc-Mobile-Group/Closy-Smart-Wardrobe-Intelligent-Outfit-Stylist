import { WeatherData } from '../services/WeatherService';
import { WardrobeItem } from '../types/item';
import { SEED_ITEMS, SeedItem } from '../constants/seedData';

export interface DisplayItem {
  id: string | number;
  name: string;
  category: 'Áo' | 'Quần' | 'Váy' | 'Giày';
  colorName?: string;
  image: any;
  isDbItem?: boolean;
}

export interface SuggestedOutfit {
  id: string;
  title: string;
  subtitle: string;
  context: string;
  weatherAdvice?: string;
  items: DisplayItem[];
  score: number;
}

/**
 * Tính điểm ưu tiên theo thời tiết cho từng món đồ (DoD Criteria #4):
 * - Khi nhiệt độ < 22°C hoặc trời mưa: Tự động cộng điểm ưu tiên cho áo dài tay, áo khoác, quần dài.
 * - Khi nhiệt độ > 32°C: Tự động ưu tiên áo thun cộc tay, chất liệu mỏng nhẹ, màu sáng.
 */
export function calculateWeatherScore(item: DisplayItem, weather: WeatherData): number {
  let score = 0;
  const nameLower = (item.name || '').toLowerCase();
  const cat = item.category;
  const colorLower = (item.colorName || '').toLowerCase();

  const isColdOrRain = weather.temperature < 22 || weather.isRaining;
  const isHot = weather.temperature > 32;

  if (isColdOrRain) {
    // 1. Trời lạnh (<22°C) hoặc trời mưa: Ưu tiên áo khoác, áo dài tay, quần dài
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
    // Trừ điểm đồ cộc hoặc váy ngắn khi trời mưa rét
    if (nameLower.includes('cộc') || nameLower.includes('ngắn tay') || (cat === 'Váy' && weather.isRaining)) {
      score -= 20;
    }
  } else if (isHot) {
    // 2. Trời nắng nóng (>32°C): Ưu tiên áo thun cộc tay, chất liệu mỏng nhẹ, màu sáng
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
    if (nameLower.includes('short') || nameLower.includes('ngắn') || cat === 'Váy') {
      score += 20;
    }
    // Ưu tiên màu sáng chống hấp thụ nhiệt
    if (
      colorLower.includes('trắng') ||
      colorLower.includes('kem') ||
      colorLower.includes('be') ||
      colorLower.includes('hồng') ||
      colorLower.includes('vàng')
    ) {
      score += 15;
    }
    // Trừ điểm nặng với áo khoác dày, nỉ, len khi nắng nóng
    if (nameLower.includes('khoác') || nameLower.includes('hoodie') || nameLower.includes('len')) {
      score -= 40;
    }
  } else {
    // 3. Thời tiết dịu mát (22 - 32°C): Thoải mái, ưu tiên cơ bản
    score += 10;
  }

  return score;
}

/**
 * Chuyển đổi WardrobeItem từ SQLite thành DisplayItem
 */
export function mapWardrobeItemToDisplay(dbItem: WardrobeItem): DisplayItem {
  return {
    id: dbItem.id,
    name: dbItem.name || `${dbItem.category} ${dbItem.color_name || ''}`.trim(),
    category: dbItem.category as any,
    colorName: dbItem.color_name || '',
    image: { uri: dbItem.image_path },
    isDbItem: true,
  };
}

/**
 * Chuyển đổi SeedItem thành DisplayItem
 */
export function mapSeedItemToDisplay(seed: SeedItem): DisplayItem {
  return {
    id: seed.id,
    name: seed.name,
    category: seed.category,
    colorName: seed.colorName,
    image: seed.image,
    isDbItem: false,
  };
}

/**
 * Engine gợi ý phối đồ thông minh tích hợp thời tiết:
 * Kết hợp tủ đồ của người dùng và các mẫu chuẩn, tự động chọn bộ trang phục tối ưu nhất
 */
export function generateOutfitSuggestions(
  dbItems: WardrobeItem[],
  contextName: string,
  weather: WeatherData,
): SuggestedOutfit[] {
  // 1. Thu thập toàn bộ ứng viên trang phục (Ưu tiên từ SQLite của người dùng)
  const userItems = dbItems.map(mapWardrobeItemToDisplay);
  const seedItems = SEED_ITEMS.map(mapSeedItemToDisplay);

  // Nhóm theo danh mục: Áo, Quần, Váy, Giày
  const tops = [
    ...userItems.filter((i) => i.category === 'Áo'),
    ...seedItems.filter((i) => i.category === 'Áo'),
  ];
  const bottoms = [
    ...userItems.filter((i) => i.category === 'Quần' || i.category === 'Váy'),
    ...seedItems.filter((i) => i.category === 'Quần' || i.category === 'Váy'),
  ];
  const shoes = [
    ...userItems.filter((i) => i.category === 'Giày'),
    ...seedItems.filter((i) => i.category === 'Giày'),
  ];

  // 2. Chấm điểm từng món đồ theo bối cảnh & thời tiết
  const scoreMap = new Map<string | number, number>();
  const scoreItem = (item: DisplayItem) => {
    let s = 50;
    // Điểm bối cảnh
    const dbItem = dbItems.find((d) => d.id === item.id);
    if (dbItem?.contexts && dbItem.contexts.includes(contextName)) {
      s += 20;
    }
    // Điểm thời tiết (DoD)
    s += calculateWeatherScore(item, weather);
    return s;
  };

  tops.sort((a, b) => scoreItem(b) - scoreItem(a));
  bottoms.sort((a, b) => scoreItem(b) - scoreItem(a));
  shoes.sort((a, b) => scoreItem(b) - scoreItem(a));

  const isColdOrRain = weather.temperature < 22 || weather.isRaining;
  const isHot = weather.temperature > 32;

  const topPick = tops[0] || seedItems[0];
  const bottomPick = bottoms[0] || seedItems[3];
  const shoePick = shoes[0] || seedItems[6];

  // Tiêu đề & phụ đề thông minh theo thời tiết
  let title = `Nhẹ nhàng ${contextName.toLowerCase()}`;
  let subtitle = 'Dễ mặc, dễ phối';

  if (isColdOrRain) {
    title = weather.isRaining ? `Gọn gàng ngày mưa · ${contextName}` : `Ấm áp ngày lạnh · ${contextName}`;
    subtitle = weather.isRaining
      ? 'Ưu tiên quần dài & áo khoác chống ẩm'
      : 'Áo khoác + quần dài giữ ấm dễ chịu';
  } else if (isHot) {
    title = `Mát mẻ ngày hè · ${contextName}`;
    subtitle = 'Áo thun thoáng mát + màu sắc sáng dịu';
  } else {
    title = `Năng động ${contextName.toLowerCase()}`;
    subtitle = `${topPick.colorName || 'Màu sắc'} + ${bottomPick.colorName || 'trẻ trung'} · Dễ mặc, thoải mái`;
  }

  const primaryOutfit: SuggestedOutfit = {
    id: 'outfit-1',
    title,
    subtitle,
    context: contextName,
    weatherAdvice: weather.recommendationAdvice,
    items: [topPick, bottomPick, shoePick],
    score: scoreItem(topPick) + scoreItem(bottomPick) + scoreItem(shoePick),
  };

  return [primaryOutfit];
}
