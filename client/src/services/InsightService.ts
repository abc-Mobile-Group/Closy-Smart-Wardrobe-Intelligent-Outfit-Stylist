import { ColorHarmonyEngine } from '../engine/ColorHarmonyEngine';
import { WardrobeItem } from '../types/item';
import { daysAgo } from '../utils/eventDate';

export const UNDERUSED_DAYS = 30; // đã mặc nhưng bỏ quá lâu
export const NEW_ITEM_GRACE_DAYS = 14; // món mới thêm chưa mặc: cho 14 ngày
export const DONATE_DAYS = 120; // bỏ quá lâu thì gợi ý cho đi
export const CONTEXT_LIST = ['Đi học', 'Đi làm', 'Đi chơi', 'Hẹn hò'] as const;

export interface UnderusedItem {
  item: WardrobeItem;
  idleDays: number;
  neverWorn: boolean;
  advice: 'reuse' | 'donate';
}

export interface UsageReport {
  totalItems: number;
  totalWears: number;
  neverWornCount: number;
  mostWorn: WardrobeItem[];
  underused: UnderusedItem[];
}

/** UC6: thống kê số lần mặc, phát hiện đồ ít dùng, đề xuất tái sử dụng hoặc cho đi. */
export function analyzeUsage(items: WardrobeItem[], now: Date = new Date()): UsageReport {
  const underused: UnderusedItem[] = [];
  for (const item of items) {
    const neverWorn = !item.last_worn;
    const idle = neverWorn ? daysAgo(item.created_at, now) : daysAgo(item.last_worn, now);
    if (idle === null) continue;
    const threshold = neverWorn ? NEW_ITEM_GRACE_DAYS : UNDERUSED_DAYS;
    if (idle < threshold) continue;
    underused.push({ item, idleDays: idle, neverWorn, advice: idle >= DONATE_DAYS ? 'donate' : 'reuse' });
  }
  underused.sort((a, b) => b.idleDays - a.idleDays);

  return {
    totalItems: items.length,
    totalWears: items.reduce((s, i) => s + (i.wear_count || 0), 0),
    neverWornCount: items.filter((i) => !i.last_worn && !(i.wear_count > 0)).length,
    mostWorn: [...items].filter((i) => i.wear_count > 0).sort((a, b) => b.wear_count - a.wear_count).slice(0, 5),
    underused,
  };
}

export interface Gap {
  id: string;
  title: string;
  detail: string;
  severity: 'high' | 'low';
}

const isDress = (i: WardrobeItem) => i.category === 'Đầm' || (i.category === 'Váy' && /đầm|dress/i.test(i.name || ''));
const isTop = (i: WardrobeItem) => i.category === 'Áo';
const isBottom = (i: WardrobeItem) => i.category === 'Quần' || (i.category === 'Váy' && !isDress(i));

/** UC8: tủ còn thiếu gì (tiêu chí Reuse). */
export function analyzeGaps(items: WardrobeItem[]): Gap[] {
  if (items.length === 0) return [];
  const gaps: Gap[] = [];
  const tops = items.filter(isTop);
  const bottoms = items.filter(isBottom);
  const dresses = items.filter(isDress);
  const shoes = items.filter((i) => i.category === 'Giày');

  if (shoes.length === 0) {
    gaps.push({ id: 'no-shoes', severity: 'high', title: 'Chưa có giày', detail: 'Thêm ít nhất một đôi giày để bộ đồ hoàn chỉnh.' });
  }
  if (tops.length > 0 && bottoms.length === 0 && dresses.length === 0) {
    gaps.push({ id: 'no-bottom', severity: 'high', title: 'Thiếu quần hoặc chân váy', detail: 'Bạn có áo nhưng chưa có quần/váy để phối.' });
  }
  if (bottoms.length > 0 && tops.length === 0 && dresses.length === 0) {
    gaps.push({ id: 'no-top', severity: 'high', title: 'Thiếu áo', detail: 'Bạn có quần/váy nhưng chưa có áo để phối.' });
  }
  if (tops.length >= 4 && bottoms.length > 0 && tops.length >= bottoms.length * 2) {
    gaps.push({
      id: 'top-heavy', severity: 'low', title: 'Nhiều áo hơn quần/váy',
      detail: `${tops.length} áo nhưng chỉ ${bottoms.length} quần/váy. Thêm quần sẽ mở ra nhiều bộ mới.`,
    });
  }
  if (!items.some((i) => i.formality === 5)) {
    gaps.push({ id: 'no-formal', severity: 'low', title: 'Chưa có món trang trọng', detail: 'Cần ít nhất một món mức 5 cho đám cưới, phỏng vấn hoặc sự kiện.' });
  }
  if (items.length >= 4) {
    const neutral = items.filter((i) => ColorHarmonyEngine.isNeutral({ h: i.color_h ?? 0, s: i.color_s ?? 0, l: i.color_l ?? 100 })).length;
    if (neutral < 2) {
      gaps.push({ id: 'few-neutral', severity: 'low', title: 'Ít món màu trung tính', detail: 'Trắng, đen, be, xám giúp phối được với hầu hết các màu khác.' });
    }
  }

  // Bối cảnh nào chưa đủ đồ để lập bộ (chỉ xét khi tủ đã có áo + quần hoặc đầm)
  const canMakeOutfit = dresses.length > 0 || (tops.length > 0 && bottoms.length > 0);
  if (items.length >= 3 && canMakeOutfit) {
    const tagged = (i: WardrobeItem, ctx: string) => {
      const list = (i.contexts || '').split(',').map((c) => c.trim()).filter(Boolean);
      return list.length === 0 || list.includes(ctx) || list.includes('Mọi dịp');
    };
    for (const ctx of CONTEXT_LIST) {
      const ok = dresses.some((d) => tagged(d, ctx)) || (tops.some((t) => tagged(t, ctx)) && bottoms.some((b) => tagged(b, ctx)));
      if (!ok) {
        gaps.push({ id: `ctx-${ctx}`, severity: 'high', title: `Chưa đủ đồ để phối "${ctx}"`, detail: `Hãy gắn thêm bối cảnh "${ctx}" cho đồ sẵn có hoặc thêm món phù hợp.` });
      }
    }
  }
  return gaps;
}
