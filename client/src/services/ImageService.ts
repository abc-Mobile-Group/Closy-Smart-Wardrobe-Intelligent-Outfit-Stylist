import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { imageApi, ProcessImageResponse, ProcessedColor } from '../api/endpoints';

export type ProcessImageResult = {
  success: boolean;
  uri: string; // Base64 transparent PNG URI hoặc fallback local URI
  isTransparent: boolean;
  color?: ProcessedColor;
  palette?: ProcessImageResponse['palette'];
  processTimeSec?: number;
  errorMessage?: string;
  isFallback?: boolean;
  category?: 'Áo' | 'Quần' | 'Váy' | 'Giày' | 'Đầm';
  name?: string;
  formality?: 1 | 3 | 5;
  contexts?: string[];
  isClothing?: boolean;
  rejectionReason?: string;
};

export class ImageService {
  // Timeout chuẩn 12 giây cho request tách nền AI (Issue #19)
  static readonly REQUEST_TIMEOUT_MS = 12000;
  static readonly FALLBACK_MESSAGE =
    'Server bận. Closy sẽ dùng ảnh gốc để bạn không bị gián đoạn.';

  /**
   * Nén và thu nhỏ ảnh: Giới hạn cạnh dài nhất về khoảng 800px với chất lượng 80% JPEG.
   * Giúp kích thước tệp upload luôn nhỏ (< 300KB), tối ưu băng thông và giảm thời gian AI xử lý < 2s.
   */
  static async compressAndResize(uri: string, maxDimension: number = 800): Promise<{ uri: string; base64?: string }> {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxDimension } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );
      return { uri: manipResult.uri, base64: manipResult.base64 };
    } catch (e) {
      console.warn('Lỗi khi nén ảnh với ImageManipulator, sử dụng ảnh gốc:', e);
      return { uri };
    }
  }

  /**
   * Tách nền và nhận diện màu sắc chủ đạo qua API POST /image/process (FastAPI + rembg U2Net + K-Means).
   * Sử dụng JSON Base64: Chuẩn 100%, an toàn tuyệt đối trên mọi nền tảng (vượt qua hoàn toàn hạn chế của Expo winter/fetch FormData).
   */
  static async processClothingImage(uri: string): Promise<ProcessImageResult> {
    try {
      console.log('[ImageService] 1. Bắt đầu nén ảnh đầu vào:', uri);
      // 1. Tự động nén cạnh dài về ~800px và trích xuất Base64
      const compressed = await this.compressAndResize(uri, 800);
      console.log('[ImageService] 2. Nén ảnh thành công:', {
        uri: compressed.uri,
        hasBase64: Boolean(compressed.base64),
        base64Length: compressed.base64?.length,
      });

      let res: ProcessImageResponse;

      if (compressed.base64) {
        // Gửi qua JSON Base64: Giải pháp tối ưu nhất cho React Native / Expo Go
        console.log('[ImageService] 3. Đang gửi ảnh qua JSON Base64 tới Backend API POST /image/process...');
        // [Code cũ]: res = await imageApi.processBase64(compressed.base64, 35000);
        res = await imageApi.processBase64(compressed.base64, this.REQUEST_TIMEOUT_MS);
      } else {
        // Fallback FormData nếu không trích xuất được base64
        console.log('[ImageService] 3. Đang gửi ảnh qua FormData tới Backend API POST /image/process...');
        const formData = new FormData();
        const filename = compressed.uri.split('/').pop()?.split('?')[0] || 'photo.jpg';
        const fileType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

        if (Platform.OS === 'web') {
          const fetchRes = await fetch(compressed.uri);
          const blob = await fetchRes.blob();
          formData.append('file', blob, filename);
        } else {
          formData.append('file', {
            uri: compressed.uri,
            name: filename,
            type: fileType,
          } as any);
        }
        // [Code cũ]: res = await imageApi.process(formData, 35000);
        res = await imageApi.process(formData, this.REQUEST_TIMEOUT_MS);
      }

      console.log('[ImageService] 4. Backend trả kết quả:', {
        success: res?.success,
        is_clothing: res?.is_clothing,
        color: res?.color,
        hasImageBase64: Boolean(res?.image_base64),
        processTime: res?.process_time_sec,
      });

      // Nếu AI phát hiện không phải trang phục để mặc
      if (res && (res.is_clothing === false || res.success === false)) {
        return {
          success: false,
          isClothing: false,
          rejectionReason:
            res.rejection_reason ||
            res.message ||
            'Vui lòng chọn hoặc chụp ảnh trang phục để mặc (Áo, Quần, Váy, Giày)!',
          uri,
          isTransparent: false,
        };
      }

      if (res && res.success && res.image_base64) {
        return {
          success: true,
          isClothing: true,
          uri: res.image_base64,
          isTransparent: true,
          color: res.color,
          palette: res.palette,
          processTimeSec: res.process_time_sec,
          category: res.category,
          name: res.name,
          formality: res.formality,
          contexts: res.contexts,
        };
      }

      throw new Error('Kết quả xử lý từ server không hợp lệ');
    } catch (error: any) {
      console.warn('[ImageService] Xử lý ảnh AI thất bại, chi tiết:', {
        name: error?.name,
        message: error?.message,
        status: error?.status,
        stack: error?.stack,
        raw: error,
      });
      // Cơ chế Graceful Degradation (Issue #19): Giữ nguyên ảnh gốc để người dùng không bị gián đoạn trải nghiệm
      return {
        success: false,
        uri: uri,
        isTransparent: false,
        isFallback: true,
        // [Code cũ]: errorMessage: error?.message || 'Không thể tách nền tự động, sử dụng ảnh gốc.',
        errorMessage: ImageService.FALLBACK_MESSAGE,
      };
    }
  }
}

