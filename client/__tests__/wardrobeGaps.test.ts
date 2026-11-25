import { describe, test, expect } from '@jest/globals';
import { describeMissing } from '../src/utils/wardrobeGaps';
import type { WardrobeItem } from '../src/types/item';

let nextId = 1;
const make = (p: Partial<WardrobeItem>): WardrobeItem => ({
  id: nextId++,
  name: '',
  category: 'Áo',
  image_path: '',
  color_h: 0,
  color_s: 0,
  color_l: 100,
  formality: 3,
  contexts: '',
  last_worn: null,
  wear_count: 0,
  created_at: '2026-01-01 00:00:00',
  ...p,
});

describe('describeMissing (trạng thái Empty/Incomplete)', () => {
  test('tủ trống: mời thêm món đầu tiên', () => {
    const gap = describeMissing([]);
    expect(gap.cta).toBe('Thêm món đầu tiên');
    expect(gap.category).toBeUndefined();
  });

  test('có 3 áo nhưng chưa có quần: nói rõ thiếu quần/váy và chọn sẵn danh mục Quần', () => {
    const items = [make({ name: 'Áo thun trắng' }), make({ name: 'Áo sơ mi' }), make({ name: 'Áo polo' })];
    const gap = describeMissing(items);
    expect(gap.message).toContain('3 áo');
    expect(gap.message).toContain('chưa có quần');
    expect(gap.category).toBe('Quần');
  });

  test('chỉ có quần: thiếu áo, chọn sẵn danh mục Áo', () => {
    const gap = describeMissing([make({ category: 'Quần', name: 'Quần jeans' })]);
    expect(gap.message).toContain('chưa có áo');
    expect(gap.category).toBe('Áo');
  });

  test('áo khoác không tính là áo để lập bộ', () => {
    const gap = describeMissing([
      make({ category: 'Quần', name: 'Quần kaki' }),
      make({ name: 'Áo khoác denim' }),
    ]);
    expect(gap.message).toContain('Áo khoác chưa được dùng');
    expect(gap.category).toBe('Áo');
  });

  test('chỉ có giày: cần đầm hoặc áo + quần', () => {
    const gap = describeMissing([make({ category: 'Giày', name: 'Giày sneaker' })]);
    expect(gap.message).toContain('ít nhất một chiếc đầm');
  });
});
