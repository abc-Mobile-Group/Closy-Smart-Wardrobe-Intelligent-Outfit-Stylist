import type { SQLiteDatabase } from 'expo-sqlite';

// Mỗi phần tử là một phiên bản schema. KHÔNG sửa phần tử cũ, chỉ thêm phần tử mới.
const MIGRATIONS: string[] = [
  // v1
  `CREATE TABLE items (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     category    TEXT    NOT NULL,
     image_path  TEXT    NOT NULL,
     color_h     INTEGER NOT NULL,
     color_s     INTEGER NOT NULL,
     color_l     INTEGER NOT NULL,
     formality   INTEGER NOT NULL DEFAULT 3,
     contexts    TEXT    NOT NULL DEFAULT '',
     last_worn   TEXT,
     wear_count  INTEGER NOT NULL DEFAULT 0,
     created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX idx_items_category ON items(category);`,

  // v2: Bổ sung tên món đồ, mã màu HEX và tên hiển thị màu
  `ALTER TABLE items ADD COLUMN name TEXT;
   ALTER TABLE items ADD COLUMN color_name TEXT;
   ALTER TABLE items ADD COLUMN color_hex TEXT;`,

  // v3: lịch sử mặc đồ
  `CREATE TABLE history (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     worn_date  TEXT NOT NULL,
     context    TEXT NOT NULL DEFAULT '',
     item_ids   TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX idx_history_date ON history(worn_date);`,

  // v4: sự kiện đã lên lịch (UC7)
  `CREATE TABLE planned_events (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     date       TEXT NOT NULL,                       -- YYYY-MM-DD
     type       TEXT NOT NULL,
     note       TEXT NOT NULL DEFAULT '',
     context    TEXT NOT NULL DEFAULT 'Sự kiện quan trọng',
     remind_at  TEXT,                                -- chưa dùng: dành cho thông báo (xem docs/NOTIFICATIONS.md)
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX idx_events_date ON planned_events(date);`,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}
