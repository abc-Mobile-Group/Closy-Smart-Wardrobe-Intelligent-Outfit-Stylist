import { getDb } from '../db/database';
import { WardrobeItem } from '../types/item';

export const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const wearSignature = (ids: (string | number)[]) => JSON.stringify(ids.map(String).sort());
export interface WearRecord {
  id: number; worn_at: string; worn_day: string; context: string; signature: string;
  items: WardrobeItem[];
}

export class HistoryService {
  static async confirmWear(ids: (string | number)[], context: string, now = new Date()) {
    const uniqueIds = [...new Set(ids.map(Number))];
    if (!uniqueIds.length || uniqueIds.some((id) => !Number.isSafeInteger(id))) throw new Error('Bộ đồ không hợp lệ.');
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      const items: WardrobeItem[] = [];
      for (const id of uniqueIds) {
        const item = await db.getFirstAsync<WardrobeItem>('SELECT * FROM items WHERE id = ?', id);
        if (!item) throw new Error('Một món đồ đã bị xóa. Vui lòng chọn lại bộ đồ.');
        items.push(item);
      }
      const result = await db.runAsync(
        'INSERT OR IGNORE INTO outfits(worn_at, worn_day, signature, context, items_json) VALUES(?,?,?,?,?)',
        now.toISOString(), localDay(now), wearSignature(uniqueIds), context, JSON.stringify(items),
      );
      if (result.changes) {
        for (const id of uniqueIds) await db.runAsync(
          'UPDATE items SET last_worn = ?, wear_count = wear_count + 1 WHERE id = ?', now.toISOString(), id,
        );
      }
    });
  }

  static async listMonth(year: number, month: number): Promise<WearRecord[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Omit<WearRecord, 'items'> & { items_json: string }>(
      'SELECT * FROM outfits WHERE worn_day >= ? AND worn_day < ? ORDER BY worn_at DESC',
      localDay(new Date(year, month, 1)), localDay(new Date(year, month + 1, 1)),
    );
    return rows.map(({ items_json, ...row }) => ({ ...row, items: JSON.parse(items_json) }));
  }

  static async yesterdaySignatures(now = new Date()): Promise<Set<string>> {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const db = await getDb();
    const rows = await db.getAllAsync<{ signature: string }>('SELECT signature FROM outfits WHERE worn_day = ?', localDay(yesterday));
    return new Set(rows.map((row) => row.signature));
  }
}
