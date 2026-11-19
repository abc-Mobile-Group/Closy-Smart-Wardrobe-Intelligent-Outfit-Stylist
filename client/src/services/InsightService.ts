import { getDb } from '../db/database';
import { ColorHarmonyEngine } from '../engine/ColorHarmonyEngine';
import { WardrobeItem } from '../types/item';
import { toDateKey } from '../utils/date';

export interface UnusedItemInsight {
  item: WardrobeItem;
  daysSinceLastWorn: number | null;
  daysSinceCreated: number;
  idleDays: number;
  reasonLabel: string;
}

export interface WardrobeUtilizationStats {
  totalItems: number;
  weeklyWornCount: number;
  weeklyRate: number; // 0 - 100 (%)
  monthlyWornCount: number;
  monthlyRate: number; // 0 - 100 (%)
  unusedCount: number;
}

export interface RemixOutfitPayload {
  context: string;
  title: string;
  subtitle: string;
  type: 'one_piece' | 'two_piece';
  harmonyBadge: string;
  items: {
    id: number;
    name: string;
    category: WardrobeItem['category'];
    colorName?: string;
    colorHex?: string;
    image: { uri: string };
  }[];
}

const MS_PER_DAY = 86_400_000;

export class InsightService {
  static readonly UNUSED_THRESHOLD_DAYS = 30;
  static readonly WEEK_WINDOW_DAYS = 7;
  static readonly MONTH_WINDOW_DAYS = 30;

  /**
   * Tính số ngày đã trôi qua kể từ một mốc ngày (hỗ trợ YYYY-MM-DD, SQLite datetime và ISO string).
   */
  static getDaysSince(dateStr?: string | null, now: Date = new Date()): number | null {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    let parsedDate: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      parsedDate = new Date(y, m - 1, d);
    } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
      parsedDate = new Date(trimmed.replace(' ', 'T') + 'Z');
    } else {
      parsedDate = new Date(trimmed);
    }

    if (Number.isNaN(parsedDate.getTime())) return null;

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetStart = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
    ).getTime();

    return Math.max(0, Math.floor((todayStart - targetStart) / MS_PER_DAY));
  }

  /**
   * Lọc ra các món đồ ít dùng có wear_count == 0 hoặc (now - last_worn) > 30 ngày,
   * sắp xếp món đồ ngủ quên lâu nhất lên đầu tiên.
   */
  static getUnusedItems(
    items: WardrobeItem[],
    now: Date = new Date(),
    thresholdDays: number = this.UNUSED_THRESHOLD_DAYS,
  ): UnusedItemInsight[] {
    const unused: UnusedItemInsight[] = [];

    for (const item of items) {
      const wearCount = item.wear_count ?? 0;
      const daysSinceLastWorn = this.getDaysSince(item.last_worn, now);
      const daysSinceCreated = this.getDaysSince(item.created_at, now) ?? 0;

      const isNeverWorn = wearCount === 0 || !item.last_worn;
      const isOverdue = daysSinceLastWorn !== null && daysSinceLastWorn > thresholdDays;

      if (isNeverWorn || isOverdue) {
        const idleDays = isNeverWorn ? daysSinceCreated : (daysSinceLastWorn ?? daysSinceCreated);
        const reasonLabel = isNeverWorn
          ? daysSinceCreated > 0
            ? `Chưa mặc lần nào (${daysSinceCreated} ngày trong tủ)`
            : 'Chưa mặc lần nào'
          : `Đã ${daysSinceLastWorn} ngày chưa mặc`;

        unused.push({
          item,
          daysSinceLastWorn: isNeverWorn ? null : daysSinceLastWorn,
          daysSinceCreated,
          idleDays,
          reasonLabel,
        });
      }
    }

    // Sắp xếp món đồ ngủ quên lâu nhất lên đầu:
    // 1. Số ngày ngủ quên lớn nhất trước
    // 2. Nếu bằng nhau, ưu tiên món chưa mặc lần nào (wear_count == 0)
    // 3. Nếu vẫn bằng nhau, ưu tiên món tạo sớm nhất (id nhỏ hơn)
    return unused.sort((a, b) => {
      if (b.idleDays !== a.idleDays) return b.idleDays - a.idleDays;
      const aNever = (a.item.wear_count ?? 0) === 0 ? 1 : 0;
      const bNever = (b.item.wear_count ?? 0) === 0 ? 1 : 0;
      if (bNever !== aNever) return bNever - aNever;
      return a.item.id - b.item.id;
    });
  }

  /**
   * Lấy món đồ ngủ quên lâu nhất để hiển thị trên thẻ "Lâu rồi chưa mặc nhỉ?" tại tab Hôm nay.
   */
  static getLongestUnusedItem(
    items: WardrobeItem[],
    now: Date = new Date(),
  ): UnusedItemInsight | null {
    const unused = this.getUnusedItems(items, now);
    return unused.length > 0 ? unused[0] : null;
  }

  /**
   * Tính toán tỷ lệ tận dụng tủ đồ trong tuần (7 ngày) và trong tháng (30 ngày).
   * Kết hợp dữ liệu bảng history (nếu có) và cột last_worn của từng món đồ.
   */
  static calculateUtilizationStats(
    items: WardrobeItem[],
    historyEntries: { worn_date: string; item_ids: string }[] = [],
    now: Date = new Date(),
  ): WardrobeUtilizationStats {
    const totalItems = items.length;
    if (totalItems === 0) {
      return {
        totalItems: 0,
        weeklyWornCount: 0,
        weeklyRate: 0,
        monthlyWornCount: 0,
        monthlyRate: 0,
        unusedCount: 0,
      };
    }

    const validItemIds = new Set(items.map((it) => it.id));
    const weeklyIds = new Set<number>();
    const monthlyIds = new Set<number>();

    // 1. Quét lịch sử mặc đồ từ bảng history
    for (const entry of historyEntries) {
      const diff = this.getDaysSince(entry.worn_date, now);
      if (diff === null) continue;

      const ids = entry.item_ids
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((id) => Number.isFinite(id) && validItemIds.has(id));

      if (diff < this.WEEK_WINDOW_DAYS) {
        ids.forEach((id) => weeklyIds.add(id));
      }
      if (diff < this.MONTH_WINDOW_DAYS) {
        ids.forEach((id) => monthlyIds.add(id));
      }
    }

    // 2. Bổ sung từ cột last_worn trên bảng items (đảm bảo đồng bộ ngay cả khi history trống)
    for (const item of items) {
      if ((item.wear_count ?? 0) <= 0 || !item.last_worn) continue;
      const diff = this.getDaysSince(item.last_worn, now);
      if (diff === null) continue;

      if (diff < this.WEEK_WINDOW_DAYS) {
        weeklyIds.add(item.id);
      }
      if (diff < this.MONTH_WINDOW_DAYS) {
        monthlyIds.add(item.id);
      }
    }

    const weeklyWornCount = weeklyIds.size;
    const monthlyWornCount = monthlyIds.size;
    const unusedCount = this.getUnusedItems(items, now).length;

    return {
      totalItems,
      weeklyWornCount,
      weeklyRate: Math.round((weeklyWornCount / totalItems) * 100),
      monthlyWornCount,
      monthlyRate: Math.round((monthlyWornCount / totalItems) * 100),
      unusedCount,
    };
  }

  /**
   * Đọc lịch sử mặc đồ 30 ngày gần nhất từ SQLite và trả về thống kê tỷ lệ tận dụng tủ đồ.
   */
  static async getUtilizationStats(
    items: WardrobeItem[],
    now: Date = new Date(),
  ): Promise<WardrobeUtilizationStats> {
    if (items.length === 0) {
      return this.calculateUtilizationStats(items, [], now);
    }

    try {
      const db = await getDb();
      const since = new Date(now);
      since.setDate(since.getDate() - this.MONTH_WINDOW_DAYS);
      const sinceKey = toDateKey(since);

      const rows = await db.getAllAsync<{ worn_date: string; item_ids: string }>(
        'SELECT worn_date, item_ids FROM history WHERE worn_date >= ?',
        [sinceKey],
      );
      return this.calculateUtilizationStats(items, rows || [], now);
    } catch (e) {
      console.warn('[InsightService] Không đọc được bảng history, tính từ last_worn:', e);
      return this.calculateUtilizationStats(items, [], now);
    }
  }

  /**
   * Xây dựng bộ phối cho nút "Thử phối lại hôm nay" với món đồ ngủ quên làm trung tâm.
   */
  static buildRemixOutfit(
    targetItem: WardrobeItem,
    allItems: WardrobeItem[],
    contextName: string,
  ): RemixOutfitPayload {
    const toDisplayItem = (it: WardrobeItem) => ({
      id: it.id,
      name: it.name || `${it.category} ${it.color_name || ''}`.trim(),
      category: it.category,
      colorName: it.color_name,
      colorHex: it.color_hex,
      image: { uri: it.image_path },
    });

    const targetColor = {
      h: targetItem.color_h ?? 0,
      s: targetItem.color_s ?? 0,
      l: targetItem.color_l ?? 50,
    };

    const pickBestMatch = (candidates: WardrobeItem[]) => {
      if (candidates.length === 0) return null;
      return [...candidates].sort((a, b) => {
        const scoreA = ColorHarmonyEngine.evaluateHarmony(targetColor, {
          h: a.color_h ?? 0,
          s: a.color_s ?? 0,
          l: a.color_l ?? 50,
        }).score;
        const scoreB = ColorHarmonyEngine.evaluateHarmony(targetColor, {
          h: b.color_h ?? 0,
          s: b.color_s ?? 0,
          l: b.color_l ?? 50,
        }).score;
        return scoreB - scoreA;
      })[0];
    };

    const others = allItems.filter((it) => it.id !== targetItem.id);
    const tops = others.filter((it) => it.category === 'Áo');
    const bottoms = others.filter((it) => it.category === 'Quần' || it.category === 'Váy');
    const shoes = others.filter((it) => it.category === 'Giày');

    const isOnePiece =
      targetItem.category === 'Đầm' ||
      (targetItem.category === 'Váy' && targetItem.name?.toLowerCase().includes('đầm'));

    const chosen: WardrobeItem[] = [];
    let harmonyBadge = '+3 Tái sử dụng';

    if (isOnePiece) {
      chosen.push(targetItem);
      const shoe = pickBestMatch(shoes);
      if (shoe) chosen.push(shoe);
    } else if (targetItem.category === 'Áo') {
      const bottom = pickBestMatch(bottoms);
      const shoe = pickBestMatch(shoes);
      chosen.push(targetItem);
      if (bottom) {
        chosen.push(bottom);
        harmonyBadge = ColorHarmonyEngine.evaluateHarmony(targetColor, {
          h: bottom.color_h ?? 0,
          s: bottom.color_s ?? 0,
          l: bottom.color_l ?? 50,
        }).badgeText;
      }
      if (shoe) chosen.push(shoe);
    } else if (targetItem.category === 'Quần' || targetItem.category === 'Váy') {
      const top = pickBestMatch(tops);
      const shoe = pickBestMatch(shoes);
      if (top) {
        chosen.push(top);
        harmonyBadge = ColorHarmonyEngine.evaluateHarmony(
          { h: top.color_h ?? 0, s: top.color_s ?? 0, l: top.color_l ?? 50 },
          targetColor,
        ).badgeText;
      }
      chosen.push(targetItem);
      if (shoe) chosen.push(shoe);
    } else {
      // Giày: ghép cùng 1 Áo + 1 Quần/Váy hợp màu nhất
      const top = pickBestMatch(tops);
      const bottom = pickBestMatch(bottoms);
      if (top) chosen.push(top);
      if (bottom) chosen.push(bottom);
      chosen.push(targetItem);
      if (top && bottom) {
        harmonyBadge = ColorHarmonyEngine.evaluateHarmony(
          { h: top.color_h ?? 0, s: top.color_s ?? 0, l: top.color_l ?? 50 },
          { h: bottom.color_h ?? 0, s: bottom.color_s ?? 0, l: bottom.color_l ?? 50 },
        ).badgeText;
      }
    }

    const displayName = targetItem.name || `${targetItem.category} ${targetItem.color_name || ''}`.trim();
    return {
      context: contextName,
      title: `Phối lại cùng ${displayName}`,
      subtitle: `${contextName} · Làm mới món đồ lâu chưa mặc`,
      type: isOnePiece ? 'one_piece' : 'two_piece',
      harmonyBadge,
      items: chosen.map(toDisplayItem),
    };
  }
}
