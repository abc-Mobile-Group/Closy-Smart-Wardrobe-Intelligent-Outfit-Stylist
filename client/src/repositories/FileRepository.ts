import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export class FileRepository {
  private static WARDROBE_DIR = (FileSystem.documentDirectory || '') + 'wardrobe/';

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

  /** Đường dẫn tuyệt đối có thể đổi sau khi cập nhật app (iOS): luôn ghép lại từ tên file. */
  static resolveUri(path: string): string {
    if (!path || path.startsWith('data:') || Platform.OS === 'web') return path;
    const i = path.lastIndexOf('/wardrobe/');
    return i >= 0 ? this.WARDROBE_DIR + path.slice(i + '/wardrobe/'.length) : path;
  }

  /** Xóa file ảnh của món đồ (chỉ file nằm trong thư mục wardrobe). */
  static async deleteItemImage(path: string): Promise<void> {
    if (Platform.OS === 'web' || !path.startsWith(this.WARDROBE_DIR)) return;
    try {
      await FileSystem.deleteAsync(path, { idempotent: true });
    } catch (e) {
      console.warn('Lỗi xóa file ảnh:', e);
    }
  }

  static async saveItemImage(sourceUri: string): Promise<string> {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return sourceUri;
    }

    try {
      await this.ensureDirExists();
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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

      if (sourceUri.startsWith('file://') || sourceUri.startsWith('/')) {
        const ext = sourceUri.split('.').pop() || 'jpg';
        const targetPath = `${this.WARDROBE_DIR}item_${uniqueSuffix}.${ext}`;
        await FileSystem.copyAsync({ from: sourceUri, to: targetPath });
        return targetPath;
      }

      return sourceUri;
    } catch (e) {
      console.warn('Lỗi khi lưu ảnh vào FileSystem, giữ nguyên URI ban đầu:', e);
      return sourceUri;
    }
  }
}
