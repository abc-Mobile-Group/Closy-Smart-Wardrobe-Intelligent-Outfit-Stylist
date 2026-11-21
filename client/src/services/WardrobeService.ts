import { FileRepository } from '../repositories/FileRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { CreateItemDTO, WardrobeItem } from '../types/item';

export class WardrobeService {
  /**
   * Thêm món đồ vào tủ đồ: Lưu tệp ảnh vào bộ nhớ lâu dài và ghi vào SQLite
   */
  static async addItem(dto: CreateItemDTO): Promise<WardrobeItem> {
    // 1. Lưu ảnh vào bộ nhớ vĩnh viễn
    const permanentImagePath = await FileRepository.saveItemImage(dto.image_path);

    // 2. Lưu thông tin vào SQLite
    const item = await ItemRepository.create({
      ...dto,
      image_path: permanentImagePath,
    });

    return item;
  }

  /**
   * Lấy toàn bộ danh sách trang phục
   */
  static async getItems(): Promise<WardrobeItem[]> {
    return ItemRepository.getAll();
  }

  /**
   * Lấy trang phục theo danh mục
   */
  static async getItemsByCategory(category: string): Promise<WardrobeItem[]> {
    return ItemRepository.getByCategory(category);
  }

  /**
   * Cập nhật thông tin món đồ
   */
  static async updateItem(
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
    return ItemRepository.update(id, data);
  }

  /**
   * Xóa món đồ
   */
  static async deleteItem(id: number): Promise<void> {
    const item = await ItemRepository.getById(id);
    await ItemRepository.delete(id);
    if (item) await FileRepository.deleteItemImage(item.image_path);
  }

  /**
   * Đếm tổng số món đồ
   */
  static async getItemCount(): Promise<number> {
    return ItemRepository.count();
  }
}

