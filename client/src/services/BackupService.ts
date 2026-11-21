import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { getDb } from '../db/database';
import { StorageService } from './StorageService';

export interface BackupImageEntry {
  relativePath: string;
  size: number;
  checksum: string;
}

export interface BackupMetadata {
  app: 'closy';
  format: 'closy-backup';
  version: number;
  schemaVersion: number;
  exportedAt: string;
  counts: {
    items: number;
    outfits: number;
    history: number;
    plannedEvents: number;
    images: number;
  };
}

export interface BackupPayload {
  items: Record<string, any>[];
  outfits: Record<string, any>[];
  history: Record<string, any>[];
  planned_events: Record<string, any>[];
  imagesManifest: BackupImageEntry[];
  inlineImages?: Record<string, string>;
}

export interface BackupDocument {
  metadata: BackupMetadata;
  checksum: string;
  data: BackupPayload;
}

export interface CreatedBackupResult {
  fileUri: string;
  fileName: string;
  base64: string;
  metadata: BackupMetadata;
}

export interface InspectedBackup {
  fileName: string;
  sourceFormat: 'closy' | 'json';
  document: BackupDocument;
  extractedImages: Record<string, string>; // relativePath -> base64
}

export interface RestoreSummary {
  itemsRestored: number;
  outfitsRestored: number;
  historyRestored: number;
  plannedEventsRestored: number;
  imagesRestored: number;
}

/**
 * Triển khai SHA-256 thuần JavaScript (deterministic trên Hermes, Android, iOS, Web & Node)
 * để kiểm tra tính toàn vẹn (Checksum) cho dữ liệu sao lưu và ảnh.
 */
function sha256Hex(input: string): string {
  // Mã hóa UTF-8 sang mảng byte
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(++i);
      code = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0x00);
  }
  const hiLen = Math.floor(bitLen / 0x100000000);
  const loLen = bitLen >>> 0;
  bytes.push(
    (hiLen >>> 24) & 0xff, (hiLen >>> 16) & 0xff, (hiLen >>> 8) & 0xff, hiLen & 0xff,
    (loLen >>> 24) & 0xff, (loLen >>> 16) & 0xff, (loLen >>> 8) & 0xff, loLen & 0xff,
  );

  const w = new Array<number>(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = offset + i * 4;
      w[i] =
        ((bytes[idx] << 24) |
          (bytes[idx + 1] << 16) |
          (bytes[idx + 2] << 8) |
          bytes[idx + 3]) >>>
        0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map((v) => v.toString(16).padStart(8, '0')).join('');
}

export class BackupService {
  static readonly BACKUP_VERSION = 1;
  static readonly MIN_SUPPORTED_VERSION = 1;
  static readonly MAX_SUPPORTED_VERSION = 1;
  static readonly BACKUP_JSON_ENTRY = 'backup.json';

  /**
   * Tính mã kiểm tra toàn vẹn (Checksum SHA-256) từ version và toàn bộ payload dữ liệu.
   */
  static computeChecksum(version: number, payload: BackupPayload): string {
    return sha256Hex(`closy-backup:v${version}:${JSON.stringify(payload)}`);
  }

  /**
   * Tính checksum cho dữ liệu ảnh base64.
   */
  static computeImageChecksum(base64Data: string): string {
    return sha256Hex(base64Data);
  }

  /**
   * Kiểm tra một bảng có tồn tại trong SQLite hiện tại hay không.
   */
  private static async tableExists(tableName: string): Promise<boolean> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      [tableName],
    );
    return Boolean(row?.name);
  }

  /**
   * Kiểm tra tính an toàn đường dẫn tương đối khi giải nén (chống path traversal).
   */
  private static isSafeRelativeImagePath(relPath: string): boolean {
    if (!relPath || relPath.includes('..') || relPath.startsWith('/') || relPath.startsWith('\\')) {
      return false;
    }
    return (
      relPath.startsWith(`${StorageService.WARDROBE_FOLDER}/`) ||
      relPath.startsWith('wardrobe/')
    );
  }

  /**
   * Đọc danh sách các tệp ảnh thực tế từ thư mục closy_wardrobe/ (và ảnh hợp lệ liên kết trong items).
   */
  private static async collectLocalImages(
    items: Record<string, any>[],
  ): Promise<{ manifest: BackupImageEntry[]; imagesMap: Record<string, string> }> {
    const manifest: BackupImageEntry[] = [];
    const imagesMap: Record<string, string> = {};

    if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return { manifest, imagesMap };
    }

    const candidateRelPaths = new Set<string>();

    // 1. Quét toàn bộ tệp thực tế trong documentDirectory/closy_wardrobe/
    const wardrobeDir = StorageService.getWardrobeDirectory();
    try {
      const dirInfo = await FileSystem.getInfoAsync(wardrobeDir);
      if (dirInfo.exists && dirInfo.isDirectory) {
        const files = await FileSystem.readDirectoryAsync(wardrobeDir);
        for (const fileName of files) {
          if (!fileName || fileName.startsWith('.')) continue;
          candidateRelPaths.add(`${StorageService.WARDROBE_FOLDER}/${fileName}`);
        }
      }
    } catch (e) {
      console.warn('[BackupService] Không thể đọc thư mục closy_wardrobe:', e);
    }

    // 2. Bổ sung các đường dẫn ảnh hợp lệ từ bảng items (ví dụ ảnh cũ ở thư mục wardrobe/)
    for (const item of items) {
      if (typeof item.image_path !== 'string') continue;
      const rel = StorageService.toRelativePath(item.image_path);
      if (this.isSafeRelativeImagePath(rel)) {
        candidateRelPaths.add(rel);
      }
    }

    // 3. Đọc nội dung Base64 từng tệp ảnh và tính checksum
    const sortedPaths = [...candidateRelPaths].sort();
    for (const relPath of sortedPaths) {
      try {
        const fullUri = StorageService.resolveImageUri(relPath);
        const info = await FileSystem.getInfoAsync(fullUri);
        if (!info.exists || info.isDirectory) continue;

        const base64Data = await FileSystem.readAsStringAsync(fullUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        imagesMap[relPath] = base64Data;
        manifest.push({
          relativePath: relPath,
          size: typeof info.size === 'number' ? info.size : base64Data.length,
          checksum: this.computeImageChecksum(base64Data),
        });
      } catch (e) {
        console.warn(`[BackupService] Bỏ qua ảnh không đọc được (${relPath}):`, e);
      }
    }

    return { manifest, imagesMap };
  }

  /**
   * Tạo tệp sao lưu .closy (ZIP chứa backup.json + toàn bộ ảnh trong closy_wardrobe/).
   */
  static async createBackupArchive(): Promise<CreatedBackupResult> {
    const db = await getDb();
    const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const schemaVersion = versionRow?.user_version ?? 0;

    const rawItems = (await this.tableExists('items'))
      ? await db.getAllAsync<Record<string, any>>('SELECT * FROM items ORDER BY id ASC')
      : [];
    const outfits = (await this.tableExists('outfits'))
      ? await db.getAllAsync<Record<string, any>>('SELECT * FROM outfits ORDER BY id ASC')
      : [];
    const history = (await this.tableExists('history'))
      ? await db.getAllAsync<Record<string, any>>('SELECT * FROM history ORDER BY id ASC')
      : [];
    const plannedEvents = (await this.tableExists('planned_events'))
      ? await db.getAllAsync<Record<string, any>>('SELECT * FROM planned_events ORDER BY id ASC')
      : [];

    // Đảm bảo image_path xuất ra trong JSON luôn là đường dẫn tương đối chuẩn
    const items = rawItems.map((it) => ({
      ...it,
      image_path: typeof it.image_path === 'string'
        ? StorageService.toRelativePath(it.image_path)
        : '',
    }));

    const { manifest, imagesMap } = await this.collectLocalImages(items);

    const payload: BackupPayload = {
      items,
      outfits,
      history,
      planned_events: plannedEvents,
      imagesManifest: manifest,
    };

    const metadata: BackupMetadata = {
      app: 'closy',
      format: 'closy-backup',
      version: this.BACKUP_VERSION,
      schemaVersion,
      exportedAt: new Date().toISOString(),
      counts: {
        items: items.length,
        outfits: outfits.length,
        history: history.length,
        plannedEvents: plannedEvents.length,
        images: manifest.length,
      },
    };

    const document: BackupDocument = {
      metadata,
      checksum: this.computeChecksum(metadata.version, payload),
      data: payload,
    };

    // Đóng gói backup.json và toàn bộ ảnh thực tế vào 1 tệp ZIP mang đuôi .closy
    const zip = new JSZip();
    zip.file(this.BACKUP_JSON_ENTRY, JSON.stringify(document, null, 2));

    for (const [relPath, base64Data] of Object.entries(imagesMap)) {
      zip.file(relPath, base64Data, { base64: true });
    }

    const zipBase64 = await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const now = new Date();
    const stamp =
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-` +
      `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `closy-backup-${stamp}.closy`;

    if (Platform.OS === 'web' || !FileSystem.cacheDirectory) {
      return { fileUri: '', fileName, base64: zipBase64, metadata };
    }

    const baseCache = FileSystem.cacheDirectory.endsWith('/')
      ? FileSystem.cacheDirectory
      : `${FileSystem.cacheDirectory}/`;
    const fileUri = `${baseCache}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, zipBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { fileUri, fileName, base64: zipBase64, metadata };
  }

  /**
   * Xuất bản sao lưu .closy và mở bảng chia sẻ hệ thống (expo-sharing)
   * để người dùng lưu vào Google Drive, File máy hoặc gửi qua tin nhắn.
   */
  static async exportAndShareBackup(): Promise<CreatedBackupResult> {
    const backup = await this.createBackupArchive();

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const binary = window.atob(backup.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = backup.fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      }
      return backup;
    }

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      throw new Error('Thiết bị hiện không hỗ trợ bảng chia sẻ hệ thống (expo-sharing).');
    }

    await Sharing.shareAsync(backup.fileUri, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Sao lưu tủ đồ Closy (.closy)',
      UTI: 'public.zip-archive',
    });

    return backup;
  }

  /**
   * Kiểm tra tính toàn vẹn (Version + Checksum) của đối tượng BackupDocument và các ảnh đi kèm.
   */
  static validateBackupDocument(
    doc: any,
    extractedImages: Record<string, string> = {},
  ): BackupDocument {
    if (!doc || typeof doc !== 'object') {
      throw new Error('Tệp sao lưu không đúng định dạng JSON hợp lệ.');
    }

    const meta = doc.metadata;
    if (!meta || meta.app !== 'closy' || meta.format !== 'closy-backup') {
      throw new Error('Tệp này không phải là tệp sao lưu hợp lệ của ứng dụng Closy.');
    }

    if (
      typeof meta.version !== 'number' ||
      meta.version < this.MIN_SUPPORTED_VERSION ||
      meta.version > this.MAX_SUPPORTED_VERSION
    ) {
      throw new Error(
        `Phiên bản sao lưu (v${String(meta.version)}) không tương thích với phiên bản Closy hiện tại.`,
      );
    }

    if (!doc.data || !Array.isArray(doc.data.items)) {
      throw new Error('Cấu trúc dữ liệu tủ đồ trong tệp sao lưu bị thiếu hoặc không hợp lệ.');
    }

    // Kiểm tra mã toàn vẹn (Checksum) chống tệp hỏng / bị sửa đổi
    if (typeof doc.checksum !== 'string' || !doc.checksum) {
      throw new Error('Tệp sao lưu thiếu mã kiểm tra toàn vẹn (Checksum).');
    }

    const expectedChecksum = this.computeChecksum(meta.version, doc.data);
    if (doc.checksum !== expectedChecksum) {
      throw new Error(
        'Kiểm tra tính toàn vẹn (Checksum) thất bại. Tệp sao lưu có thể đã bị hỏng hoặc chỉnh sửa.',
      );
    }

    // Kiểm tra trường cơ bản của từng món đồ
    for (const item of doc.data.items) {
      if (!item || typeof item !== 'object' || typeof item.category !== 'string') {
        throw new Error('Dữ liệu món đồ trong tệp sao lưu không hợp lệ.');
      }
    }

    // Nếu là gói nén chứa ảnh, đối chiếu toàn vẹn từng ảnh theo imagesManifest
    const manifest: BackupImageEntry[] = Array.isArray(doc.data.imagesManifest)
      ? doc.data.imagesManifest
      : [];
    const hasExtractedImages = Object.keys(extractedImages).length > 0;
    if (manifest.length > 0 && hasExtractedImages) {
      for (const entry of manifest) {
        if (!this.isSafeRelativeImagePath(entry.relativePath)) {
          throw new Error(`Đường dẫn ảnh không an toàn trong tệp sao lưu: ${entry.relativePath}`);
        }
        const imgBase64 = extractedImages[entry.relativePath];
        if (!imgBase64) {
          throw new Error(`Thiếu tệp ảnh trong gói sao lưu: ${entry.relativePath}`);
        }
        if (entry.checksum && this.computeImageChecksum(imgBase64) !== entry.checksum) {
          throw new Error(`Tệp ảnh bị lỗi toàn vẹn (Checksum): ${entry.relativePath}`);
        }
      }
    }

    return doc as BackupDocument;
  }

  /**
   * Giải mã và thẩm định tệp sao lưu từ nội dung Base64 (hỗ trợ cả .closy/.zip và .json).
   */
  static async inspectBackupBase64(
    fileName: string,
    base64Content: string,
  ): Promise<InspectedBackup> {
    const lowerName = fileName.toLowerCase();
    const isJsonName = lowerName.endsWith('.json');

    // Thử đọc như gói ZIP (.closy / .zip) trước trừ khi chắc chắn là .json
    if (!isJsonName) {
      try {
        const zip = await JSZip.loadAsync(base64Content, { base64: true });
        const jsonFile = zip.file(this.BACKUP_JSON_ENTRY);
        if (!jsonFile) {
          throw new Error('Gói sao lưu .closy thiếu tệp dữ liệu backup.json.');
        }

        const jsonText = await jsonFile.async('string');
        const parsed = JSON.parse(jsonText);

        const extractedImages: Record<string, string> = {};
        const fileEntries = Object.values(zip.files);
        for (const entry of fileEntries) {
          if (entry.dir || entry.name === this.BACKUP_JSON_ENTRY) continue;
          if (!this.isSafeRelativeImagePath(entry.name)) continue;
          extractedImages[entry.name] = await entry.async('base64');
        }

        const document = this.validateBackupDocument(parsed, extractedImages);
        return {
          fileName,
          sourceFormat: 'closy',
          document,
          extractedImages,
        };
      } catch (zipErr: any) {
        // Nếu người dùng đổi tên file JSON sang .closy hoặc chọn tệp JSON trực tiếp thì thử parse JSON
        if (lowerName.endsWith('.closy') || lowerName.endsWith('.zip')) {
          // Nếu lỗi đã là lỗi nghiệp vụ từ validateBackupDocument thì báo thẳng
          if (
            zipErr?.message?.includes('Checksum') ||
            zipErr?.message?.includes('Phiên bản') ||
            zipErr?.message?.includes('Closy') ||
            zipErr?.message?.includes('backup.json')
          ) {
            throw zipErr;
          }
        }
      }
    }

    // Trường hợp tệp JSON (.json)
    try {
      const jsonText = decodeBase64Utf8(base64Content);
      const parsed = JSON.parse(jsonText);
      const inlineImages: Record<string, string> =
        parsed?.data?.inlineImages && typeof parsed.data.inlineImages === 'object'
          ? parsed.data.inlineImages
          : {};
      const document = this.validateBackupDocument(parsed, inlineImages);
      return {
        fileName,
        sourceFormat: 'json',
        document,
        extractedImages: inlineImages,
      };
    } catch (e: any) {
      throw new Error(
        e?.message || 'Không thể đọc tệp sao lưu. Vui lòng chọn tệp .closy hoặc .json hợp lệ.',
      );
    }
  }

  /**
   * Mở trình chọn tệp hệ thống (expo-document-picker) để người dùng chọn tệp .closy / .json
   * và kiểm tra tính toàn vẹn (Checksum / Version) trước khi hỏi xác nhận ghi đè.
   */
  static async pickAndInspectBackup(): Promise<InspectedBackup | null> {
    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: ['*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return null;
    }

    const asset = pickerResult.assets[0];
    const fileName = asset.name || 'backup.closy';
    const lowerName = fileName.toLowerCase();
    if (
      !lowerName.endsWith('.closy') &&
      !lowerName.endsWith('.json') &&
      !lowerName.endsWith('.zip')
    ) {
      throw new Error('Vui lòng chọn tệp sao lưu có định dạng .closy, .zip hoặc .json.');
    }

    let base64Content = '';
    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      base64Content = arrayBufferToBase64(arrayBuffer);
    } else {
      base64Content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    return this.inspectBackupBase64(fileName, base64Content);
  }

  /**
   * Giải nén toàn bộ ảnh về thư mục sandbox (documentDirectory/closy_wardrobe/)
   * và nạp lại các bản ghi vào SQLite trong một transaction an toàn.
   */
  static async restoreFromInspectedBackup(inspected: InspectedBackup): Promise<RestoreSummary> {
    // 1. Thẩm định lại tính toàn vẹn trước khi thực hiện ghi đè
    const doc = this.validateBackupDocument(inspected.document, inspected.extractedImages);
    const { items, outfits = [], history = [], planned_events = [] } = doc.data;

    // 2. Giải nén ảnh về thư mục sandbox documentDirectory/closy_wardrobe/
    let imagesRestored = 0;
    const restoredPaths = new Set<string>();

    if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
      await StorageService.ensureDirExists();

      for (const [relPath, base64Data] of Object.entries(inspected.extractedImages)) {
        if (!this.isSafeRelativeImagePath(relPath)) continue;

        const targetUri = StorageService.resolveImageUri(relPath);
        const parentDir = targetUri.substring(0, targetUri.lastIndexOf('/') + 1);
        if (parentDir) {
          const parentInfo = await FileSystem.getInfoAsync(parentDir);
          if (!parentInfo.exists) {
            await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
          }
        }

        await FileSystem.writeAsStringAsync(targetUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        restoredPaths.add(relPath);
        imagesRestored++;
      }
    }

    // 3. Nạp lại các bản ghi vào SQLite trong một transaction nguyên tử (tránh hỏng DB nếu lỗi)
    const db = await getDb();
    const hasOutfitsTable = await this.tableExists('outfits');
    const hasHistoryTable = await this.tableExists('history');
    const hasPlannedEventsTable = await this.tableExists('planned_events');

    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM items');
      if (hasOutfitsTable) await db.runAsync('DELETE FROM outfits');
      if (hasHistoryTable) await db.runAsync('DELETE FROM history');
      if (hasPlannedEventsTable) await db.runAsync('DELETE FROM planned_events');

      for (const item of items) {
        const relativePath =
          typeof item.image_path === 'string'
            ? StorageService.toRelativePath(item.image_path)
            : '';
        await db.runAsync(
          `INSERT INTO items (
            id, name, category, image_path, color_h, color_s, color_l, color_hex, color_name,
            formality, contexts, last_worn, wear_count, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id ?? null,
            item.name ?? null,
            item.category ?? 'Áo',
            relativePath,
            item.color_h ?? 0,
            item.color_s ?? 0,
            item.color_l ?? 100,
            item.color_hex ?? null,
            item.color_name ?? null,
            item.formality ?? 3,
            item.contexts ?? '',
            item.last_worn ?? null,
            item.wear_count ?? 0,
            item.created_at ?? new Date().toISOString(),
          ],
        );
      }

      if (hasHistoryTable) {
        for (const h of history) {
          await db.runAsync(
            `INSERT INTO history (id, worn_date, context, item_ids, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              h.id ?? null,
              h.worn_date ?? '',
              h.context ?? '',
              h.item_ids ?? '',
              h.created_at ?? new Date().toISOString(),
            ],
          );
        }
      }

      if (hasOutfitsTable) {
        for (const o of outfits) {
          // Hỗ trợ cấu trúc bảng outfits linh hoạt nếu nhánh khác có bảng outfits
          if ('worn_at' in o && 'worn_day' in o && 'items_json' in o) {
            await db.runAsync(
              `INSERT OR IGNORE INTO outfits (id, worn_at, worn_day, signature, context, items_json)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                o.id ?? null,
                o.worn_at ?? '',
                o.worn_day ?? '',
                o.signature ?? '',
                o.context ?? '',
                o.items_json ?? '[]',
              ],
            );
          }
        }
      }

      if (hasPlannedEventsTable) {
        for (const ev of planned_events) {
          await db.runAsync(
            `INSERT INTO planned_events (id, date, type, note, context, remind_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              ev.id ?? null,
              ev.date ?? '',
              ev.type ?? '',
              ev.note ?? '',
              ev.context ?? 'Sự kiện quan trọng',
              ev.remind_at ?? null,
              ev.created_at ?? new Date().toISOString(),
            ],
          );
        }
      }
    });

    // 4. Dọn các ảnh cũ trong closy_wardrobe/ không còn thuộc bản khôi phục
    if (Platform.OS !== 'web' && FileSystem.documentDirectory && inspected.sourceFormat === 'closy') {
      try {
        const wardrobeDir = StorageService.getWardrobeDirectory();
        const dirInfo = await FileSystem.getInfoAsync(wardrobeDir);
        if (dirInfo.exists && dirInfo.isDirectory) {
          const existingFiles = await FileSystem.readDirectoryAsync(wardrobeDir);
          for (const file of existingFiles) {
            const rel = `${StorageService.WARDROBE_FOLDER}/${file}`;
            if (!restoredPaths.has(rel)) {
              await StorageService.deleteImage(rel);
            }
          }
        }
      } catch (e) {
        console.warn('[BackupService] Không thể dọn ảnh thừa sau khi khôi phục:', e);
      }
    }

    return {
      itemsRestored: items.length,
      outfitsRestored: outfits.length,
      historyRestored: history.length,
      plannedEventsRestored: planned_events.length,
      imagesRestored,
    };
  }
}

/**
 * Giải mã chuỗi Base64 sang UTF-8 thuần JS (tương thích Hermes & Web).
 */
function decodeBase64Utf8(base64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i += 4) {
    const c1 = chars.indexOf(clean[i]);
    const c2 = chars.indexOf(clean[i + 1]);
    const c3 = clean[i + 2] === '=' ? -1 : chars.indexOf(clean[i + 2]);
    const c4 = clean[i + 3] === '=' ? -1 : chars.indexOf(clean[i + 3]);

    bytes.push((c1 << 2) | (c2 >> 4));
    if (c3 !== -1) bytes.push(((c2 & 15) << 4) | (c3 >> 2));
    if (c4 !== -1) bytes.push(((c3 & 3) << 6) | c4);
  }

  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    if (b1 < 0x80) {
      out += String.fromCharCode(b1);
    } else if (b1 < 0xe0) {
      const b2 = bytes[i++];
      out += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
    } else if (b1 < 0xf0) {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      out += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
    } else {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      const b4 = bytes[i++];
      const cp = (((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f)) - 0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    }
  }
  return out;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < bytes.length ? chars[b3 & 63] : '=';
  }
  return result;
}
