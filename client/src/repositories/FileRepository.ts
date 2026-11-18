// [Code cũ - đã chuyển logic sang StorageService]
// import * as FileSystem from 'expo-file-system/legacy';
// import { Platform } from 'react-native';

import { StorageService } from '../services/StorageService';

export class FileRepository {
  /* [Code cũ]
  private static WARDROBE_DIR = (FileSystem.documentDirectory || '') + 'wardrobe/';

  // Đảm bảo thư mục lưu trữ ảnh tủ đồ tồn tại
  private static async ensureDirExists() {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) return;
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.WARDROBE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.WARDROBE_DIR, { intermediates: true });
      }
    } catch (e) {
      console.warn('Lỗi kiểm tra/tạo thư mục wardrobe:', e);
    }
  }
  */

  /**
   * Lưu ảnh trang phục vào bộ nhớ ứng dụng vĩnh viễn (documentDirectory/closy_wardrobe/).
   * Tạo tên tệp UUID ngẫu nhiên và trả về đường dẫn tương đối (relative path) để lưu SQLite.
   */
  static async saveItemImage(sourceUri: string): Promise<string> {
    return StorageService.saveImage(sourceUri);

    /* [Code cũ]
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return sourceUri;
    }

    try {
      await this.ensureDirExists();
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // 1. Trường hợp là Data URL Base64 (Ảnh PNG trong suốt từ Backend)
      if (sourceUri.startsWith('data:image/')) {
        const matches = sourceUri.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        const ext = matches ? matches[1] : 'png';
        const base64Data = matches ? matches[2] : sourceUri;
        const targetPath = `${this.WARDROBE_DIR}item_${uniqueSuffix}.${ext}`;

        await FileSystem.writeAsStringAsync(targetPath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return targetPath;
      }

      // 2. Trường hợp là File URI tạm thời từ camera hoặc thư viện
      if (sourceUri.startsWith('file://') || sourceUri.startsWith('/')) {
        const ext = sourceUri.split('.').pop() || 'jpg';
        const targetPath = `${this.WARDROBE_DIR}item_${uniqueSuffix}.${ext}`;

        await FileSystem.copyAsync({
          from: sourceUri,
          to: targetPath,
        });
        return targetPath;
      }

      return sourceUri;
    } catch (e) {
      console.warn('Lỗi khi lưu ảnh vào FileSystem, giữ nguyên URI ban đầu:', e);
      return sourceUri;
    }
    */
  }

  /**
   * Xóa tệp ảnh trên máy khi người dùng xóa món đồ khỏi tủ
   */
  static async deleteItemImage(pathOrUri: string): Promise<boolean> {
    return StorageService.deleteImage(pathOrUri);
  }

  /**
   * Chuyển đổi đường dẫn tương đối trong SQLite sang URI hiển thị được trên <Image />
   */
  static resolveImageUri(relativeOrUri: string): string {
    return StorageService.resolveImageUri(relativeOrUri);
  }

  /**
   * Chuẩn hóa URI về đường dẫn tương đối để lưu trong SQLite
   */
  static toRelativePath(pathOrUri: string): string {
    return StorageService.toRelativePath(pathOrUri);
  }
}
