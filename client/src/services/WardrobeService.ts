import { FileRepository } from '../repositories/FileRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { StorageService } from './StorageService';
import { CreateItemDTO, WardrobeItem } from '../types/item';

export class WardrobeService {
  /**
   * Thêm món đồ vào tủ đồ:
   * 1. Lưu tệp ảnh vào documentDirectory/closy_wardrobe/ với tên UUID ngẫu nhiên
   * 2. Lưu đường dẫn tương đối (relative path) vào SQLite
   */
  static async addItem(dto: CreateItemDTO): Promise<WardrobeItem> {
    // [Code cũ]:
    // const permanentImagePath = await FileRepository.saveItemImage(dto.image_path);
    // const item = await ItemRepository.create({
    //   ...dto,
    //   image_path: permanentImagePath,
    // });

    // 1. Lưu ảnh vào closy_wardrobe/ và nhận lại relative path ("closy_wardrobe/<uuid>.<ext>")
    const relativeImagePath = await FileRepository.saveItemImage(dto.image_path);

    // 2. Lưu thông tin (kèm relative path) vào SQLite
    const item = await ItemRepository.create({
      ...dto,
      image_path: relativeImagePath,
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
   * Xóa món đồ khỏi tủ đồ:
   * - Xóa bản ghi trong SQLite
   * - Xóa tệp ảnh vật lý tương ứng trong documentDirectory/closy_wardrobe/ trên máy
   */
  static async deleteItem(id: number): Promise<void> {
    // [Code cũ]: return ItemRepository.delete(id);

    const existingItem = await ItemRepository.getById(id);
    await ItemRepository.delete(id);

    if (existingItem) {
      const targetPath = existingItem.relative_image_path || existingItem.image_path;
      await StorageService.deleteImage(targetPath);
    }
  }

  /**
   * Đếm tổng số món đồ
   */
  static async getItemCount(): Promise<number> {
    return ItemRepository.count();
  }
}
