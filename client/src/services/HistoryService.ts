import { getDb } from '../db/database';
import { toDateKey } from '../utils/date';

export interface HistoryEntry {
  id: number;
  worn_date: string;
  context: string;
  item_ids: string;
}

export class HistoryService {
  /** Lưu bộ đồ đã mặc và cập nhật last_worn / wear_count của từng món (một transaction). */
  static async confirmWear(itemIds: number[], context: string, date: string = toDateKey()) {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT INTO history (worn_date, context, item_ids) VALUES (?, ?, ?)',
        [date, context, itemIds.join(',')],
      );
      for (const id of itemIds) {
        await db.runAsync(
          'UPDATE items SET last_worn = ?, wear_count = wear_count + 1 WHERE id = ?',
          [date, id],
        );
      }
    });
  }

  /** Các bản ghi trong tháng (month: 0-11), mới nhất trước. */
  static async getMonth(year: number, month: number): Promise<HistoryEntry[]> {
    const db = await getDb();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-%`;
    return db.getAllAsync<HistoryEntry>(
      'SELECT * FROM history WHERE worn_date LIKE ? ORDER BY id DESC',
      [prefix],
    );
  }
}
