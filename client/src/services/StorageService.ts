import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export class StorageService {
  static readonly WARDROBE_FOLDER = 'closy_wardrobe';

  /**
   * Lấy đường dẫn thư mục gốc lưu ảnh tủ đồ: documentDirectory/closy_wardrobe/
   */
  static getWardrobeDirectory(): string {
    const baseDir = FileSystem.documentDirectory || '';
    if (!baseDir) return `${this.WARDROBE_FOLDER}/`;
    const normalizedBase = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;
    return `${normalizedBase}${this.WARDROBE_FOLDER}/`;
  }

  /**
   * Sinh chuỗi UUID v4 ngẫu nhiên để đặt tên tệp không trùng lặp
   */
  static generateUUID(): string {
    if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const rand = (Math.random() * 16) | 0;
      const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  /**
   * Đảm bảo thư mục documentDirectory/closy_wardrobe/ tồn tại trên máy
   */
  static async ensureDirExists(): Promise<void> {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) return;
    const dirUri = this.getWardrobeDirectory();
    try {
      const dirInfo = await FileSystem.getInfoAsync(dirUri);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
      }
    } catch (e) {
      console.warn('[StorageService] Lỗi kiểm tra/tạo thư mục closy_wardrobe:', e);
    }
  }

  /**
   * Chuyển đường dẫn tuyệt đối (file://.../documentDirectory/...) về đường dẫn tương đối (relative path)
   * Ví dụ: "file:///.../closy_wardrobe/uuid.png" -> "closy_wardrobe/uuid.png"
   */
  static toRelativePath(pathOrUri: string): string {
    if (!pathOrUri) return '';
    const docDir = FileSystem.documentDirectory;
    if (docDir && pathOrUri.startsWith(docDir)) {
      return pathOrUri.slice(docDir.length).replace(/^\/+/, '');
    }
    const marker = `${this.WARDROBE_FOLDER}/`;
    const idx = pathOrUri.indexOf(marker);
    if (idx !== -1 && !pathOrUri.startsWith('http://') && !pathOrUri.startsWith('https://')) {
      return pathOrUri.slice(idx);
    }
    return pathOrUri;
  }

  /**
   * Chuyển đường dẫn tương đối trong SQLite ("closy_wardrobe/uuid.png")
   * thành URI đầy đủ ("file:///.../closy_wardrobe/uuid.png") để hiển thị trên <Image />
   */
  static resolveImageUri(relativeOrUri: string): string {
    if (!relativeOrUri) return '';
    if (
      relativeOrUri.startsWith('file://') ||
      relativeOrUri.startsWith('data:') ||
      relativeOrUri.startsWith('http://') ||
      relativeOrUri.startsWith('https://') ||
      relativeOrUri.startsWith('content://') ||
      relativeOrUri.startsWith('asset://')
    ) {
      return relativeOrUri;
    }

    if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return relativeOrUri;
    }

    const baseDir = FileSystem.documentDirectory.endsWith('/')
      ? FileSystem.documentDirectory
      : `${FileSystem.documentDirectory}/`;
    const cleanRelative = relativeOrUri.replace(/^\.?\//, '');
    return `${baseDir}${cleanRelative}`;
  }

  /**
   * Lưu ảnh trang phục vào documentDirectory/closy_wardrobe/ với tên tệp UUID
   * và trả về đường dẫn tương đối (relative path) để lưu vào SQLite.
   */
  static async saveImage(sourceUri: string): Promise<string> {
    if (!sourceUri) return '';
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return sourceUri;
    }

    // Nếu đã là đường dẫn tương đối trong closy_wardrobe thì giữ nguyên
    if (sourceUri.startsWith(`${this.WARDROBE_FOLDER}/`)) {
      return sourceUri;
    }

    try {
      await this.ensureDirExists();
      const uuid = this.generateUUID();

      // 1. Trường hợp Data URL Base64 (Ảnh PNG tách nền từ AI Server)
      if (sourceUri.startsWith('data:image/')) {
        const matches = sourceUri.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        const rawExt = matches ? matches[1].toLowerCase() : 'png';
        const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
        const base64Data = matches ? matches[2] : sourceUri;

        const relativePath = `${this.WARDROBE_FOLDER}/${uuid}.${ext}`;
        const targetUri = this.resolveImageUri(relativePath);

        await FileSystem.writeAsStringAsync(targetUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return relativePath;
      }

      // 2. Trường hợp tệp đã nằm sẵn trong thư mục closy_wardrobe
      const existingRelative = this.toRelativePath(sourceUri);
      if (existingRelative.startsWith(`${this.WARDROBE_FOLDER}/`)) {
        return existingRelative;
      }

      // 3. Trường hợp File URI cục bộ từ Camera / Thư viện ảnh
      if (
        sourceUri.startsWith('file://') ||
        sourceUri.startsWith('content://') ||
        sourceUri.startsWith('/')
      ) {
        const cleanUri = sourceUri.split('?')[0];
        const rawExt = cleanUri.includes('.') ? cleanUri.split('.').pop()?.toLowerCase() : 'jpg';
        const ext = rawExt && /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : 'jpg';

        const relativePath = `${this.WARDROBE_FOLDER}/${uuid}.${ext}`;
        const targetUri = this.resolveImageUri(relativePath);

        const normalizedFrom = sourceUri.startsWith('/') ? `file://${sourceUri}` : sourceUri;
        await FileSystem.copyAsync({
          from: normalizedFrom,
          to: targetUri,
        });
        return relativePath;
      }

      return sourceUri;
    } catch (e) {
      console.warn('[StorageService] Lỗi khi lưu ảnh vào closy_wardrobe, giữ nguyên URI ban đầu:', e);
      return sourceUri;
    }
  }

  /**
   * Xóa tệp ảnh vật lý trên thiết bị khi người dùng xóa món đồ khỏi tủ đồ
   */
  static async deleteImage(pathOrUri: string): Promise<boolean> {
    if (!pathOrUri || Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return false;
    }

    // Không xóa nếu là data URI hoặc URL từ mạng
    if (
      pathOrUri.startsWith('data:') ||
      pathOrUri.startsWith('http://') ||
      pathOrUri.startsWith('https://')
    ) {
      return false;
    }

    try {
      const targetUri = this.resolveImageUri(pathOrUri);
      // Chỉ cho phép xóa tệp nằm trong vùng documentDirectory của ứng dụng để đảm bảo an toàn
      if (!targetUri.startsWith(FileSystem.documentDirectory)) {
        return false;
      }

      const info = await FileSystem.getInfoAsync(targetUri);
      if (info.exists) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[StorageService] Lỗi khi xóa tệp ảnh cục bộ:', e);
      return false;
    }
  }
}
