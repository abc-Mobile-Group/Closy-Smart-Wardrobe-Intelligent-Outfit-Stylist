import { analyzeGaps, analyzeUsage } from '../src/services/InsightService';
import { WardrobeItem } from '../src/types/item';

const NOW = new Date(2026, 10, 20);
const mk = (id: number, category: WardrobeItem['category'], o: Partial<WardrobeItem> = {}): WardrobeItem => ({
  id, name: `${category} ${id}`, category, image_path: 'x',
  color_h: 0, color_s: 0, color_l: 100, formality: 3, contexts: '',
  last_worn: null, wear_count: 0, created_at: '2026-01-01 00:00:00', ...o,
});

describe('analyzeUsage (UC6)', () => {
  const items = [
    mk(1, 'Áo', { wear_count: 5, last_worn: '2026-11-18' }),
    mk(2, 'Áo', { created_at: '2026-08-01 00:00:00' }),                    // chưa mặc ~111 ngày
    mk(3, 'Quần', { wear_count: 2, last_worn: '2026-06-01' }),             // 172 ngày
    mk(4, 'Áo', { created_at: '2026-11-19 00:00:00' }),                    // mới thêm hôm qua
  ];
  const r = analyzeUsage(items, NOW);

  test('tổng hợp số liệu', () => {
    expect(r.totalItems).toBe(4);
    expect(r.totalWears).toBe(7);
    expect(r.neverWornCount).toBe(2);
    expect(r.mostWorn[0].id).toBe(1);
  });

  test('đồ ít dùng sắp xếp theo thời gian bỏ quên, kèm đề xuất', () => {
    expect(r.underused.map((u) => u.item.id)).toEqual([3, 2]);
    expect(r.underused[0].advice).toBe('donate');
    expect(r.underused[1].advice).toBe('reuse');
    expect(r.underused[1].neverWorn).toBe(true);
  });

  test('món mới thêm chưa bị coi là bỏ quên', () => {
    expect(r.underused.find((u) => u.item.id === 4)).toBeUndefined();
  });
});

describe('analyzeGaps (UC8)', () => {
  test('chỉ có áo: thiếu quần và giày', () => {
    const ids = analyzeGaps([mk(1, 'Áo'), mk(2, 'Áo')]).map((g) => g.id);
    expect(ids).toContain('no-bottom');
    expect(ids).toContain('no-shoes');
  });

  test('tủ đủ áo, quần, giày, có món trang trọng: không còn lỗ hổng chính', () => {
    const items = [
      mk(1, 'Áo', { formality: 5 }), mk(2, 'Quần'), mk(3, 'Giày'), mk(4, 'Áo'),
    ];
    const ids = analyzeGaps(items).map((g) => g.id);
    expect(ids).not.toContain('no-shoes');
    expect(ids).not.toContain('no-bottom');
    expect(ids).not.toContain('no-formal');
  });

  test('bối cảnh chưa đủ đồ', () => {
    const items = [
      mk(1, 'Áo', { contexts: 'Đi học' }), mk(2, 'Quần', { contexts: 'Đi học' }), mk(3, 'Giày'),
    ];
    const ids = analyzeGaps(items).map((g) => g.id);
    expect(ids).toContain('ctx-Đi làm');
    expect(ids).not.toContain('ctx-Đi học');
  });

  test('tủ trống không báo gì', () => {
    expect(analyzeGaps([])).toEqual([]);
  });
});
