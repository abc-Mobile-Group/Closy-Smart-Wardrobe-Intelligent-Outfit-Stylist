import { getDb } from '../db/database';
import { EVENT_CONTEXT } from '../engine/suggest';
import { addDays, toKey } from '../utils/eventDate';

export { EVENT_CONTEXT };
export const EVENT_TYPES = ['Đám cưới', 'Phỏng vấn', 'Tiệc / Sự kiện', 'Gặp đối tác'] as const;

export interface PlannedEvent {
  id: number;
  date: string; // YYYY-MM-DD
  type: string;
  note: string;
  context: string;
  remind_at: string | null;
  created_at: string;
}

export class EventService {
  static async add(input: { date: string; type: string; note?: string }): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO planned_events (date, type, note, context, remind_at) VALUES (?, ?, ?, ?, ?)',
      [input.date, input.type, (input.note || '').trim(), EVENT_CONTEXT, addDays(input.date, -1)],
    );
  }

  /** Sự kiện từ hôm nay trở đi, gần nhất trước. */
  static async listUpcoming(): Promise<PlannedEvent[]> {
    const db = await getDb();
    return db.getAllAsync<PlannedEvent>(
      'SELECT * FROM planned_events WHERE date >= ? ORDER BY date ASC, id ASC',
      [toKey()],
    );
  }

  static async remove(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM planned_events WHERE id = ?', [id]);
  }
}
