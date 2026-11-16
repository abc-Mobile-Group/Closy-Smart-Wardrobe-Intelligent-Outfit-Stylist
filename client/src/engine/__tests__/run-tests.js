/**
 * Test Runner cho ColorHarmonyEngine
 * Chạy: node client/src/engine/__tests__/run-tests.js
 */

class ColorHarmonyEngine {
  static isNeutral(color) {
    return color.s < 15 || color.l < 15 || color.l > 88;
  }

  static getHueDistance(h1, h2) {
    const diff = Math.abs(h1 - h2) % 360;
    return Math.min(diff, 360 - diff);
  }

  static evaluateHarmony(color1, color2) {
    const isNeutral1 = this.isNeutral(color1);
    const isNeutral2 = this.isNeutral(color2);
    const hueDistance = this.getHueDistance(color1.h, color2.h);

    if (isNeutral1 || isNeutral2) {
      return {
        score: 3,
        harmonyType: 'neutral',
        hueDistance,
        title: 'Trung tính an toàn',
      };
    }

    if (hueDistance < 35) {
      return {
        score: 3,
        harmonyType: 'analogous',
        hueDistance,
        title: 'Tương đồng sắc thái (Tone sur tone)',
      };
    }

    if (hueDistance >= 150 && hueDistance <= 210) {
      return {
        score: 2,
        harmonyType: 'complementary',
        hueDistance,
        title: 'Tương phản bổ sung',
      };
    }

    return {
      score: -2,
      harmonyType: 'clash',
      hueDistance,
      title: 'Xung đột chói gắt',
    };
  }
}

const CLOSET_COLORS = {
  WHITE: { name: 'Trắng', h: 0, s: 0, l: 100 },
  BLACK: { name: 'Đen', h: 222, s: 47, l: 11 },
  CREAM: { name: 'Kem', h: 42, s: 35, l: 94 },
  GRAY: { name: 'Xám', h: 0, s: 0, l: 50 },
  BEIGE: { name: 'Be', h: 40, s: 12, l: 82 },
  NAVY: { name: 'Xanh đậm/Navy', h: 219, s: 47, l: 26 },
  BLUE: { name: 'Xanh dương', h: 207, s: 90, l: 54 },
  SKY_BLUE: { name: 'Xanh da trời', h: 200, s: 75, l: 60 },
  DUSTY_PINK: { name: 'Hồng pastel', h: 350, s: 45, l: 75 },
  RED: { name: 'Đỏ tươi', h: 0, s: 80, l: 50 },
  DEEP_RED: { name: 'Đỏ mận', h: 350, s: 70, l: 40 },
  ORANGE: { name: 'Cam', h: 30, s: 90, l: 50 },
  YELLOW: { name: 'Vàng tươi', h: 50, s: 95, l: 55 },
  OLIVE: { name: 'Xanh ô liu', h: 82, s: 25, l: 37 },
  TEAL: { name: 'Xanh lục lam', h: 180, s: 70, l: 45 },
  LIME_GREEN: { name: 'Xanh nõn chuối', h: 80, s: 85, l: 50 },
  MAGENTA: { name: 'Hồng cánh sen', h: 310, s: 80, l: 50 },
};

const TEST_CASES = [
  { id: 1, name: 'Sơ mi Trắng + Quần Đen', top: CLOSET_COLORS.WHITE, bottom: CLOSET_COLORS.BLACK, expScore: 3, expType: 'neutral' },
  { id: 2, name: 'Áo Trắng + Jeans Navy', top: CLOSET_COLORS.WHITE, bottom: CLOSET_COLORS.NAVY, expScore: 3, expType: 'neutral' },
  { id: 3, name: 'Áo Kem + Quần Đen', top: CLOSET_COLORS.CREAM, bottom: CLOSET_COLORS.BLACK, expScore: 3, expType: 'neutral' },
  { id: 4, name: 'Áo Xám + Quần Be', top: CLOSET_COLORS.GRAY, bottom: CLOSET_COLORS.BEIGE, expScore: 3, expType: 'neutral' },
  { id: 5, name: 'Áo Đỏ + Quần Đen', top: CLOSET_COLORS.RED, bottom: CLOSET_COLORS.BLACK, expScore: 3, expType: 'neutral' },
  { id: 6, name: 'Áo Ô liu + Quần Be', top: CLOSET_COLORS.OLIVE, bottom: CLOSET_COLORS.BEIGE, expScore: 3, expType: 'neutral' },
  { id: 7, name: 'Áo Xanh da trời + Quần Navy', top: CLOSET_COLORS.SKY_BLUE, bottom: CLOSET_COLORS.NAVY, expScore: 3, expType: 'analogous' },
  { id: 8, name: 'Áo Đỏ mận + Váy Hồng pastel', top: CLOSET_COLORS.DEEP_RED, bottom: CLOSET_COLORS.DUSTY_PINK, expScore: 3, expType: 'analogous' },
  { id: 9, name: 'Áo Đỏ cam (H=10) + Váy Đỏ mận (H=350)', top: { h: 10, s: 80, l: 50 }, bottom: CLOSET_COLORS.DEEP_RED, expScore: 3, expType: 'analogous' },
  { id: 10, name: 'Áo Cam + Quần Vàng mustard', top: CLOSET_COLORS.ORANGE, bottom: CLOSET_COLORS.YELLOW, expScore: 3, expType: 'analogous' },
  { id: 11, name: 'Áo Xanh dương + Quần Cam', top: CLOSET_COLORS.BLUE, bottom: CLOSET_COLORS.ORANGE, expScore: 2, expType: 'complementary' },
  { id: 12, name: 'Áo Đỏ tươi + Váy Xanh lục lam', top: CLOSET_COLORS.RED, bottom: CLOSET_COLORS.TEAL, expScore: 2, expType: 'complementary' },
  { id: 13, name: 'Áo Vàng tươi + Chân váy Tím đối xứng', top: CLOSET_COLORS.YELLOW, bottom: { h: 230, s: 70, l: 50 }, expScore: 2, expType: 'complementary' },
  { id: 14, name: 'Áo Cam rực + Chân váy Hồng sen', top: CLOSET_COLORS.ORANGE, bottom: CLOSET_COLORS.MAGENTA, expScore: -2, expType: 'clash' },
  { id: 15, name: 'Áo Đỏ cờ + Quần Vàng chanh', top: CLOSET_COLORS.RED, bottom: { h: 70, s: 90, l: 50 }, expScore: -2, expType: 'clash' },
  { id: 16, name: 'Áo Xanh chuối + Quần Xanh dương chói', top: CLOSET_COLORS.LIME_GREEN, bottom: { h: 220, s: 90, l: 50 }, expScore: -2, expType: 'clash' },
];

console.log('=== CHẠY BỘ KIỂM THỬ COLOR HARMONY ENGINE (16 CẶP MÀU) ===\n');
let passed = 0;
for (const tc of TEST_CASES) {
  const res = ColorHarmonyEngine.evaluateHarmony(tc.top, tc.bottom);
  const ok = res.score === tc.expScore && res.harmonyType === tc.expType;
  if (ok) {
    passed++;
    console.log(`[PASS] #${tc.id} ${tc.name}: Điểm ${res.score} (${res.harmonyType}) | Khoảng cách góc d=${res.hueDistance}°`);
  } else {
    console.error(`[FAIL] #${tc.id} ${tc.name}: Kỳ vọng ${tc.expScore} (${tc.expType}), nhưng ra ${res.score} (${res.harmonyType})`);
  }
}

console.log(`\nKết quả: ${passed}/${TEST_CASES.length} test passed.`);
if (passed === TEST_CASES.length) {
  console.log('✓ TOÀN BỘ 16/16 TEST CASE ĐẠT CHUẨN THỜI TRANG 100%!');
} else {
  process.exit(1);
}
