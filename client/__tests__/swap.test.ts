import { swapOutfit, outfitSignature } from '../src/engine/swap';
import { mapWardrobeItemToDisplay } from '../src/engine/suggest';
import { WardrobeItem } from '../src/types/item';

const mk = (id: number, category: WardrobeItem['category'], h = 0, s = 0, l = 100): WardrobeItem => ({
  id, name: `${category} ${id}`, category, image_path: `file://${id}.png`,
  color_h: h, color_s: s, color_l: l, formality: 3, contexts: 'Đi học',
  wear_count: 0, created_at: '2026-01-01',
});

const wardrobe = [mk(1, 'Áo'), mk(2, 'Áo'), mk(3, 'Quần'), mk(4, 'Quần')];
const current = [wardrobe[0], wardrobe[2]].map(mapWardrobeItemToDisplay);

describe('swapOutfit', () => {
  test('giữ nguyên món đã khóa, đổi món còn lại', () => {
    const next = swapOutfit(current, wardrobe, ['1'], 'Đi học', new Set());
    expect(next).not.toBeNull();
    const ids = next!.map((i) => String(i.id));
    expect(ids).toContain('1');
    expect(ids).toContain('4');
    expect(ids).not.toContain('3');
  });

  test('khóa hết thì không có bộ mới', () => {
    expect(swapOutfit(current, wardrobe, ['1', '3'], 'Đi học', new Set())).toBeNull();
  });

  test('ưu tiên bộ chưa xem', () => {
    const first = swapOutfit(current, wardrobe, [], 'Đi học', new Set(), () => 0)!;
    const seen = new Set([outfitSignature(current), outfitSignature(first)]);
    const second = swapOutfit(current, wardrobe, [], 'Đi học', seen, () => 0)!;
    expect(outfitSignature(second)).not.toBe(outfitSignature(first));
  });
});
