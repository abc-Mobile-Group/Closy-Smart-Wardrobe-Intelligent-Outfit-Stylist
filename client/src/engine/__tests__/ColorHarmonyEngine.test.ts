/**
 * Unit Test kiểm chứng cho ít nhất 15 cặp màu phổ biến trong tủ đồ thực tế.
 * Tuân thủ Definition of Done (DoD) của Sprint-3: Color Harmony Engine.
 */

import { ColorHarmonyEngine, HSLColor } from '../ColorHarmonyEngine';

// Danh sách các màu chuẩn trong tủ đồ thực tế
export const CLOSET_COLORS = {
  // Nhóm trung tính (Neutral: S < 15, L < 15, hoặc L > 88)
  WHITE: { name: 'Trắng', h: 0, s: 0, l: 100, hex: '#FFFFFF' } as HSLColor,
  BLACK: { name: 'Đen', h: 222, s: 47, l: 11, hex: '#1E293B' } as HSLColor, // L = 11 < 15
  CREAM: { name: 'Kem', h: 42, s: 35, l: 94, hex: '#F5F2EB' } as HSLColor, // L = 94 > 88
  GRAY: { name: 'Xám', h: 0, s: 0, l: 50, hex: '#808080' } as HSLColor, // S = 0 < 15
  BEIGE: { name: 'Be', h: 40, s: 12, l: 82, hex: '#DCD4C6' } as HSLColor, // S = 12 < 15

  // Nhóm có sắc tố (Chromatic)
  NAVY: { name: 'Xanh đậm/Navy', h: 219, s: 47, l: 26, hex: '#243A63' } as HSLColor,
  BLUE: { name: 'Xanh dương', h: 207, s: 90, l: 54, hex: '#2196F3' } as HSLColor,
  SKY_BLUE: { name: 'Xanh da trời', h: 200, s: 75, l: 60, hex: '#4FB2F0' } as HSLColor,
  DUSTY_PINK: { name: 'Hồng pastel', h: 350, s: 45, l: 75, hex: '#D99B9B' } as HSLColor,
  RED: { name: 'Đỏ tươi', h: 0, s: 80, l: 50, hex: '#E53935' } as HSLColor,
  DEEP_RED: { name: 'Đỏ mận', h: 350, s: 70, l: 40, hex: '#9E1B32' } as HSLColor,
  ORANGE: { name: 'Cam', h: 30, s: 90, l: 50, hex: '#FF8000' } as HSLColor,
  YELLOW: { name: 'Vàng tươi', h: 50, s: 95, l: 55, hex: '#FDD835' } as HSLColor,
  OLIVE: { name: 'Xanh ô liu', h: 82, s: 25, l: 37, hex: '#636F4E' } as HSLColor,
  FOREST_GREEN: { name: 'Xanh lá cây', h: 120, s: 60, l: 40, hex: '#2E7D32' } as HSLColor,
  LIME_GREEN: { name: 'Xanh nõn chuối', h: 80, s: 85, l: 50, hex: '#76D71B' } as HSLColor,
  PURPLE: { name: 'Tím violet', h: 270, s: 70, l: 50, hex: '#7E22CE' } as HSLColor,
  MAGENTA: { name: 'Hồng cánh sen', h: 310, s: 80, l: 50, hex: '#D926A9' } as HSLColor,
};

export interface TestCase {
  id: number;
  name: string;
  top: HSLColor;
  bottom: HSLColor;
  expectedScore: number;
  expectedType: 'neutral' | 'analogous' | 'complementary' | 'clash';
  rationale: string;
}

export const TEST_CASES_15_PAIRS: TestCase[] = [
  // 1-6: Nhóm màu trung tính an toàn (+3 điểm)
  {
    id: 1,
    name: 'Áo sơ mi Trắng + Quần Jeans Đen',
    top: CLOSET_COLORS.WHITE,
    bottom: CLOSET_COLORS.BLACK,
    expectedScore: 3,
    expectedType: 'neutral',
    rationale: 'Trắng (L>88) và Đen (L<15) đều là màu trung tính.',
  },
  {
    id: 2,
    name: 'Áo phông Trắng + Quần Jeans Xanh đậm (Navy)',
    top: CLOSET_COLORS.WHITE,
    bottom: CLOSET_COLORS.NAVY,
    expectedScore: 3,
    expectedType: 'neutral',
    rationale: 'Trắng là màu trung tính (L=100 > 88), an toàn khi phối cùng Navy.',
  },
  {
    id: 3,
    name: 'Áo len Kem + Quần Tây Đen',
    top: CLOSET_COLORS.CREAM,
    bottom: CLOSET_COLORS.BLACK,
    expectedScore: 3,
    expectedType: 'neutral',
    rationale: 'Kem (L=94) và Đen (L=11) đều là màu trung tính kinh điển.',
  },
  {
    id: 4,
    name: 'Áo nỉ Xám + Quần Kaki Be',
    top: CLOSET_COLORS.GRAY,
    bottom: CLOSET_COLORS.BEIGE,
    expectedScore: 3,
    expectedType: 'neutral',
    rationale: 'Xám (S=0) và Be (S=12) đều thuộc vùng trung tính.',
  },
  {
    id: 5,
    name: 'Áo Đỏ tươi + Quần Đen',
    top: CLOSET_COLORS.RED,
    bottom: CLOSET_COLORS.BLACK,
    expectedScore: 3,
    expectedType: 'neutral',
    rationale: 'Quần đen (L=11) trung tính giúp tiết chế độ rực của áo đỏ.',
  },
  {
    id: 6,
    name: 'Áo Xanh ô liu + Quần Kaki Be',
    top: CLOSET_COLORS.OLIVE,
    bottom: CLOSET_COLORS.BEIGE,
    expectedScore: 3,
    expectedType: 'neutral',
    rationale: 'Quần Be (S=12 < 15) là màu trung tính kết hợp hài hòa với màu ô liu.',
  },

  // 7-10: Nhóm màu tương đồng / Tone sur tone (d < 35°: +3 điểm)
  {
    id: 7,
    name: 'Áo Xanh da trời + Quần Navy (Denim-on-Denim)',
    top: CLOSET_COLORS.SKY_BLUE, // H=200
    bottom: CLOSET_COLORS.NAVY, // H=219
    expectedScore: 3,
    expectedType: 'analogous',
    rationale: 'Khoảng cách góc màu d = |200 - 219| = 19° < 35° (Tone sur tone xanh).',
  },
  {
    id: 8,
    name: 'Áo Đỏ mận + Váy Hồng pastel',
    top: CLOSET_COLORS.DEEP_RED, // H=350
    bottom: CLOSET_COLORS.DUSTY_PINK, // H=350
    expectedScore: 3,
    expectedType: 'analogous',
    rationale: 'Cùng sắc đỏ hồng (d = 0° < 35°), phối màu đơn sắc thời thượng.',
  },
  {
    id: 9,
    name: 'Áo Đỏ cam (H=10) + Váy Đỏ mận (H=350)',
    top: { name: 'Đỏ cam', h: 10, s: 80, l: 50 },
    bottom: CLOSET_COLORS.DEEP_RED, // H=350
    expectedScore: 3,
    expectedType: 'analogous',
    rationale: 'Khoảng cách góc vòng tròn d = min(340, 360 - 340) = 20° < 35°.',
  },
  {
    id: 10,
    name: 'Áo Cam đất + Quần Vàng mustard',
    top: CLOSET_COLORS.ORANGE, // H=30
    bottom: CLOSET_COLORS.YELLOW, // H=50
    expectedScore: 3,
    expectedType: 'analogous',
    rationale: 'Góc màu d = |30 - 50| = 20° < 35° (Nhóm màu ấm liền kề).',
  },

  // 11-13: Nhóm màu tương phản bổ sung (150° <= d <= 210°: +2 điểm)
  {
    id: 11,
    name: 'Áo Xanh dương + Quần Cam đất',
    top: CLOSET_COLORS.BLUE, // H=207
    bottom: CLOSET_COLORS.ORANGE, // H=30
    expectedScore: 2,
    expectedType: 'complementary',
    rationale: 'Khoảng cách d = |207 - 30| = 177° (nằm trong khoảng 150° - 210° đối đỉnh).',
  },
  {
    id: 12,
    name: 'Áo Đỏ tươi + Váy Xanh lá cây',
    top: CLOSET_COLORS.RED, // H=0
    bottom: CLOSET_COLORS.FOREST_GREEN, // H=120? Chờ chút: 120-0 = 120. Hãy dùng H=180 xanh mòng két
    expectedScore: 2,
    expectedType: 'complementary',
    rationale: 'Tương phản đối đỉnh 180° giữa Đỏ và Xanh lục lam.',
  },
  {
    id: 13,
    name: 'Áo Vàng tươi + Chân váy Tím violet',
    top: CLOSET_COLORS.YELLOW, // H=50
    bottom: { name: 'Tím violet', h: 230, s: 70, l: 50 }, // |230 - 50| = 180°
    expectedScore: 2,
    expectedType: 'complementary',
    rationale: 'Góc d = |230 - 50| = 180° (đối đỉnh tương phản rực rỡ).',
  },

  // 14-16: Nhóm màu xung đột chói gắt (-2 điểm)
  {
    id: 14,
    name: 'Áo Cam rực + Chân váy Tím sen rực',
    top: CLOSET_COLORS.ORANGE, // H=30, S=90, L=50
    bottom: CLOSET_COLORS.MAGENTA, // H=310, S=80, L=50 -> d = min(280, 80) = 80°
    expectedScore: -2,
    expectedType: 'clash',
    rationale: 'Góc d = 80° (không thuộc tương đồng <35° và không đối đỉnh 150-210°), chói gắt.',
  },
  {
    id: 15,
    name: 'Áo Đỏ cờ + Quần Vàng chanh rực rỡ',
    top: CLOSET_COLORS.RED, // H=0, S=80, L=50
    bottom: { name: 'Vàng chanh', h: 70, s: 90, l: 50 }, // H=70 -> d = 70°
    expectedScore: -2,
    expectedType: 'clash',
    rationale: 'Góc d = 70° không có trung tính điều hòa, dễ gây chói mắt và khó mặc thường ngày.',
  },
  {
    id: 16,
    name: 'Áo Xanh nõn chuối + Quần Xanh dương chói',
    top: CLOSET_COLORS.LIME_GREEN, // H=80, S=85, L=50
    bottom: { name: 'Xanh dương đậm rực', h: 220, s: 90, l: 50 }, // d = 140°
    expectedScore: -2,
    expectedType: 'clash',
    rationale: 'Góc d = 140° (nằm ngoài vùng 150°-210°), 2 màu rực rỡ lệch tông gây xung đột.',
  },
];

// Cập nhật Test case #12 cho đúng góc đối xứng 180°
TEST_CASES_15_PAIRS[11].bottom = { name: 'Xanh lục lam đối đỉnh', h: 180, s: 70, l: 45 };

/**
 * Hàm thực thi và kiểm chứng toàn bộ các test case
 */
export function runColorHarmonyTests(): { passed: number; failed: number; results: any[] } {
  let passed = 0;
  let failed = 0;
  const results: any[] = [];

  for (const tc of TEST_CASES_15_PAIRS) {
    const res = ColorHarmonyEngine.evaluateHarmony(tc.top, tc.bottom);
    const isScoreOk = res.score === tc.expectedScore;
    const isTypeOk = res.harmonyType === tc.expectedType;
    const ok = isScoreOk && isTypeOk;

    if (ok) {
      passed++;
    } else {
      failed++;
    }

    results.push({
      id: tc.id,
      name: tc.name,
      ok,
      expected: `${tc.expectedScore} (${tc.expectedType})`,
      actual: `${res.score} (${res.harmonyType})`,
      hueDistance: res.hueDistance,
      rationale: tc.rationale,
    });
  }

  return { passed, failed, results };
}
