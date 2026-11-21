import { describe, test, expect } from '@jest/globals';
import { EVENT_CONTEXT, generateOutfitSuggestions, targetFormality } from '../src/engine/suggest';
import { WardrobeItem } from '../src/types/item';

const weather: any = {
  temperature: 26, weatherCode: 2, isRaining: false, locationName: 'HN',
  conditionDescription: '', iconName: 'x', recommendationAdvice: '',
};
const NOW = new Date(2026, 10, 20);

const mk = (id: number, category: WardrobeItem['category'], o: Partial<WardrobeItem> = {}): WardrobeItem => ({
  id, name: `${category} ${id}`, category, image_path: 'x',
  color_h: 0, color_s: 0, color_l: 100, color_name: 'Trắng',
  formality: 3, contexts: 'Đi học,Đi làm', last_worn: '2026-11-20', wear_count: 1,
  created_at: '2026-01-01 00:00:00', ...o,
});

describe('targetFormality', () => {
  test('theo backlog: học 2, làm 3, hẹn hò 3, sự kiện 5', () => {
    expect(targetFormality('Đi học')).toBe(2);
    expect(targetFormality('Đi làm')).toBe(3);
    expect(targetFormality('Hẹn hò')).toBe(3);
    expect(targetFormality(EVENT_CONTEXT)).toBe(5);
  });
});

describe('generateOutfitSuggestions', () => {
  test('tái sử dụng: món lâu chưa mặc được cộng đúng 10 điểm khi bộ đạt', () => {
    const items = [mk(1, 'Áo', { last_worn: null }), mk(2, 'Áo'), mk(3, 'Quần')];
    const r = generateOutfitSuggestions(items, 'Đi học', weather, NOW);
    const a = r.find((o) => o.id === 'two-1-3')!;
    const b = r.find((o) => o.id === 'two-2-3')!;
    expect(a.score - b.score).toBe(10);
    expect(a.reasons.some((x) => x.includes('chưa được mặc'))).toBe(true);
  });

  test('trang trọng và đồng bộ: bộ lệch mức bị xếp sau', () => {
    const items = [mk(1, 'Áo', { formality: 3 }), mk(2, 'Áo', { formality: 5 }), mk(3, 'Quần', { formality: 3 })];
    const r = generateOutfitSuggestions(items, 'Đi làm', weather, NOW);
    expect(r[0].id).toBe('two-1-3');
  });

  test('sự kiện quan trọng ưu tiên đồ mức 5', () => {
    const items = [mk(1, 'Áo', { formality: 1 }), mk(2, 'Áo', { formality: 5 }), mk(3, 'Quần', { formality: 5 })];
    const r = generateOutfitSuggestions(items, EVENT_CONTEXT, weather, NOW);
    expect(r[0].id).toBe('two-2-3');
  });

  test('đầm đi một mình, không kèm áo/quần', () => {
    const items = [mk(1, 'Đầm'), mk(2, 'Áo'), mk(3, 'Quần'), mk(4, 'Giày')];
    const r = generateOutfitSuggestions(items, 'Hẹn hò', weather, NOW);
    const dress = r.filter((o) => o.type === 'one_piece');
    expect(dress.length).toBe(1);
    expect(dress[0].items.every((i) => i.category === 'Đầm' || i.category === 'Giày')).toBe(true);
  });

  test('có lý do cho mỗi bộ và bộ xung đột màu bị loại khi còn lựa chọn khác', () => {
    const items = [
      mk(1, 'Áo', { color_h: 0, color_s: 80, color_l: 50 }),
      mk(2, 'Quần', { color_h: 100, color_s: 80, color_l: 50 }), // xung đột với áo 1
      mk(3, 'Quần', { color_h: 0, color_s: 0, color_l: 100 }),   // trung tính
    ];
    const r = generateOutfitSuggestions(items, 'Đi học', weather, NOW);
    expect(r.every((o) => o.reasons.length > 0)).toBe(true);
    expect(r.find((o) => o.id === 'two-1-2')).toBeUndefined();
  });

  test('tủ trống trả về mảng rỗng', () => {
    expect(generateOutfitSuggestions([], 'Đi học', weather, NOW)).toEqual([]);
  });
});
