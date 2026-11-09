import * as SQLite from 'expo-sqlite';
import { migrate } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Mở DB một lần duy nhất và chạy migration. Gọi ở mọi nơi cần DB. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('closy.db');
      await migrate(db);
      return db;
    })().catch((e) => {
      dbPromise = null; // cho phép thử lại nếu lỗi
      throw e;
    });
  }
  return dbPromise;
}
