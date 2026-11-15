/**
 * ColorHarmonyEngine: Bộ quy tắc toán học đo độ hòa hợp màu sắc (Color Harmony)
 * dựa trên không gian màu HSL theo chuẩn thời trang Closy (Local-First).
 * 
 * Tiêu chí nghiệm thu (Acceptance Criteria / Definition of Done):
 * 1. Xử lý độc lập tại client (Local-First).
 * 2. Vùng màu trung tính (Neutral): Saturation < 15 hoặc Lightness < 15 hoặc Lightness > 88 (trắng, đen, be, xám).
 * 3. Khoảng cách góc màu trên vòng tròn sắc độ H (0 - 360°):
 *    d = min(|H1 - H2|, 360 - |H1 - H2|).
 * 4. Quy tắc chấm điểm thời trang:
 *    - Cặp có ít nhất 1 màu trung tính: +3 điểm (an toàn, dễ phối).
 *    - Cặp màu tương đồng (Monochrome / Analogous: d < 35°): +3 điểm.
 *    - Cặp màu tương phản bổ sung (Complementary: 150° <= d <= 210°): +2 điểm.
 *    - Cặp màu xung đột chói gắt: -2 điểm.
 */

export interface HSLColor {
  h: number; // 0 - 360
  s: number; // 0 - 100
  l: number; // 0 - 100
  name?: string;
  hex?: string;
}

export type HarmonyType = 'neutral' | 'analogous' | 'complementary' | 'clash';

export interface HarmonyScoreResult {
  score: number;
  harmonyType: HarmonyType;
  hueDistance: number;
  isFirstNeutral: boolean;
  isSecondNeutral: boolean;
  title: string;
  description: string;
  badgeText: string;
}

export class ColorHarmonyEngine {
  /**
   * Kiểm tra màu có thuộc vùng màu trung tính (Neutral) hay không:
   * Saturation < 15 hoặc Lightness < 15 (đen) hoặc Lightness > 88 (trắng, kem, be)
   */
  static isNeutral(color: HSLColor): boolean {
    return color.s < 15 || color.l < 15 || color.l > 88;
  }

  /**
   * Tính khoảng cách góc ngắn nhất trên vòng tròn sắc độ Hue (0 - 360°):
   * d = min(|H1 - H2|, 360 - |H1 - H2|)
   */
  static getHueDistance(h1: number, h2: number): number {
    const diff = Math.abs(h1 - h2) % 360;
    return Math.min(diff, 360 - diff);
  }

  /**
   * Chấm điểm và phân loại độ hòa hợp giữa 2 màu sắc (Áo & Quần / Chân váy / Phụ kiện)
   */
  static evaluateHarmony(color1: HSLColor, color2: HSLColor): HarmonyScoreResult {
    const isNeutral1 = this.isNeutral(color1);
    const isNeutral2 = this.isNeutral(color2);
    const hueDistance = this.getHueDistance(color1.h, color2.h);

    // 1. Cặp có ít nhất 1 màu trung tính: +3 điểm (an toàn, dễ phối)
    if (isNeutral1 || isNeutral2) {
      return {
        score: 3,
        harmonyType: 'neutral',
        hueDistance,
        isFirstNeutral: isNeutral1,
        isSecondNeutral: isNeutral2,
        title: 'Trung tính an toàn',
        badgeText: '+3 Trung tính',
        description: 'Màu trung tính giúp tổng thể hài hòa, thanh lịch và tôn vinh trang phục đi kèm.',
      };
    }

    // 2. Cặp màu tương đồng (Monochrome / Analogous: d < 35°): +3 điểm
    if (hueDistance < 35) {
      return {
        score: 3,
        harmonyType: 'analogous',
        hueDistance,
        isFirstNeutral: false,
        isSecondNeutral: false,
        title: 'Tương đồng sắc thái (Tone sur tone)',
        badgeText: '+3 Tone sur tone',
        description: 'Các tông màu liền kề trên vòng tròn màu tạo cảm giác liền mạch, tinh tế và cao ráo.',
      };
    }

    // 3. Cặp màu tương phản bổ sung (Complementary: 150° <= d <= 210°): +2 điểm
    if (hueDistance >= 150 && hueDistance <= 210) {
      return {
        score: 2,
        harmonyType: 'complementary',
        hueDistance,
        isFirstNeutral: false,
        isSecondNeutral: false,
        title: 'Tương phản bổ sung',
        badgeText: '+2 Tương phản',
        description: 'Sự đối lập màu sắc tạo điểm nhấn thị giác mạnh mẽ, trẻ trung và cá tính.',
      };
    }

    // 4. Cặp màu xung đột chói gắt: -2 điểm
    return {
      score: -2,
      harmonyType: 'clash',
      hueDistance,
      isFirstNeutral: false,
      isSecondNeutral: false,
      title: 'Xung đột chói gắt',
      badgeText: '-2 Khó phối',
      description: 'Hai màu sắc có góc lệch chênh vênh, dễ gây cảm giác rối mắt nếu không có phụ kiện tiết chế.',
    };
  }

  /**
   * Chuyển đổi mã HEX sang HSL
   */
  static hexToHsl(hex: string): HSLColor {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map((c) => c + c).join('');
    }

    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
      hex: `#${cleanHex.toUpperCase()}`,
    };
  }
}
