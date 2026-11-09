import type { SQLiteDatabase } from 'expo-sqlite';

// Mỗi phần tử là một phiên bản schema. KHÔNG sửa phần tử cũ, chỉ thêm phần tử mới.
const MIGRATIONS: string[] = [
  // v1
  `CREATE TABLE items (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     category    TEXT    NOT NULL,              -- 'top' | 'bottom' (kiểm tra ở code, dễ mở rộng)
     image_path  TEXT    NOT NULL,              -- đường dẫn tương đối trong thư mục app
     color_h     INTEGER NOT NULL,              -- 0-360
     color_s     INTEGER NOT NULL,              -- 0-100
     color_l     INTEGER NOT NULL,              -- 0-100
     formality   INTEGER NOT NULL DEFAULT 3,    -- 1 | 3 | 5
     contexts    TEXT    NOT NULL DEFAULT '',   -- 'school,work'
     last_worn   TEXT,                          -- ISO date, rỗng nếu chưa mặc
     wear_count  INTEGER NOT NULL DEFAULT 0,
     created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX idx_items_category ON items(category);`,
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
