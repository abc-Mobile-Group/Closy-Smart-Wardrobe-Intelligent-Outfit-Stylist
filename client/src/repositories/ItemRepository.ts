import { getDb } from '../db/database';
import { ColorHarmonyEngine } from '../engine/ColorHarmonyEngine';
import { StorageService } from '../services/StorageService';
import { CreateItemDTO, WardrobeItem } from '../types/item';

export class ItemRepository {
  /**
   * Chuẩn hóa bản ghi từ SQLite:
   * - SQLite lưu đường dẫn tương đối (relative path: closy_wardrobe/<uuid>.<ext>)
   * - Khi đọc lên ứng dụng, resolve sang file:// URI đầy đủ để <Image /> hiển thị an toàn
   */
  private static hydrateItem(row: WardrobeItem): WardrobeItem {
    const relativePath = StorageService.toRelativePath(row.image_path);
    return {
      ...row,
      relative_image_path: relativePath,
      image_path: StorageService.resolveImageUri(row.image_path),
    };
  }

  /**
   * Thêm một món đồ mới vào SQLite (lưu đường dẫn tương đối cho image_path)
   */
  static async create(dto: CreateItemDTO): Promise<WardrobeItem> {
    const db = await getDb();
    const contextsStr = dto.contexts.join(',');
    const relativeImagePath = StorageService.toRelativePath(dto.image_path);

    const result = await db.runAsync(
      `INSERT INTO items (
        name, category, image_path, color_h, color_s, color_l, color_hex, color_name, formality, contexts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        dto.name,
        dto.category,
        // [Code cũ]: dto.image_path,
        relativeImagePath,
        dto.color_h,
        dto.color_s,
        dto.color_l,
        dto.color_hex || null,
        dto.color_name || null,
        dto.formality,
        contextsStr,
      ],
    );

    const insertedId = result.lastInsertRowId;
    const item = await this.getById(insertedId);
    if (!item) {
      throw new Error(`Không tìm thấy món đồ vừa tạo với id ${insertedId}`);
    }
    return item;
  }

  /**
   * Lấy chi tiết một món đồ theo ID
   */
  static async getById(id: number): Promise<WardrobeItem | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<WardrobeItem>(
      'SELECT * FROM items WHERE id = ?',
      [id],
    );
    // [Code cũ]: return row || null;
    return row ? this.hydrateItem(row) : null;
  }

  /**
   * Lấy toàn bộ danh sách món đồ trong tủ đồ, sắp xếp mới nhất lên đầu
   */
  static async getAll(): Promise<WardrobeItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<WardrobeItem>(
      'SELECT * FROM items ORDER BY id DESC',
    );
    // [Code cũ]: return rows || [];
    return (rows || []).map((row) => this.hydrateItem(row));
  }

  /**
   * Lấy danh sách món đồ theo danh mục (Áo, Quần, Váy, Đầm, Giày)
   */
  static async getByCategory(category: string): Promise<WardrobeItem[]> {
    const db = await getDb();
    if (!category || category === 'Tất cả') {
      return this.getAll();
    }
    const rows = await db.getAllAsync<WardrobeItem>(
      'SELECT * FROM items WHERE category = ? ORDER BY id DESC',
      [category],
    );
    // [Code cũ]: return rows || [];
    return (rows || []).map((row) => this.hydrateItem(row));
  }

  /**
   * Xóa một món đồ khỏi SQLite
   */
  static async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
  }

  /**
   * Cập nhật thông tin món đồ
   */
  static async update(
    id: number,
    data: {
      name?: string;
      category?: string;
      color_name?: string;
      color_hex?: string;
      formality?: number;
      contexts?: string[];
    },
  ): Promise<WardrobeItem | null> {
    const db = await getDb();
    const current = await this.getById(id);
    if (!current) return null;

    const name = (data.name !== undefined ? data.name : current.name) ?? null;
    const category = (data.category !== undefined ? data.category : current.category) ?? null;
    const color_name = (data.color_name !== undefined ? data.color_name : current.color_name) ?? null;
    const color_hex = (data.color_hex !== undefined ? data.color_hex : current.color_hex) ?? null;
    const formality = (data.formality !== undefined ? data.formality : current.formality) ?? 3;
    const contexts = (data.contexts !== undefined ? data.contexts.join(',') : current.contexts) ?? '';

    // Đổi màu thì phải cập nhật cả HSL, vì engine gợi ý chấm điểm bằng HSL
    let { color_h, color_s, color_l } = current;
    if (data.color_hex && data.color_hex.toLowerCase() !== (current.color_hex || '').toLowerCase()) {
      const hsl = ColorHarmonyEngine.hexToHsl(data.color_hex);
      color_h = hsl.h;
      color_s = hsl.s;
      color_l = hsl.l;
    }

    await db.runAsync(
      `UPDATE items SET name = ?, category = ?, color_name = ?, color_hex = ?, color_h = ?, color_s = ?, color_l = ?, formality = ?, contexts = ? WHERE id = ?`,
      [name, category, color_name, color_hex, color_h, color_s, color_l, formality, contexts, id],
    );
    return this.getById(id);
  }

  /**
   * Đếm tổng số lượng món đồ
   */
  static async count(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM items',
    );
    return row?.count || 0;
  }
}
