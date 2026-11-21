import { describe, test, expect } from '@jest/globals';
import { ColorHarmonyEngine as E } from '../src/engine/ColorHarmonyEngine';

describe('ColorHarmonyEngine', () => {
  test('isNeutral: trắng, đen, xám là trung tính; đỏ tươi thì không', () => {
    expect(E.isNeutral({ h: 0, s: 0, l: 100 })).toBe(true);
    expect(E.isNeutral({ h: 0, s: 50, l: 10 })).toBe(true);
    expect(E.isNeutral({ h: 0, s: 5, l: 50 })).toBe(true);
    expect(E.isNeutral({ h: 0, s: 80, l: 50 })).toBe(false);
  });

  test('getHueDistance tính theo vòng tròn', () => {
    expect(E.getHueDistance(350, 10)).toBe(20);
    expect(E.getHueDistance(0, 180)).toBe(180);
    expect(E.getHueDistance(90, 90)).toBe(0);
  });

  test('chấm điểm: trung tính +3, tương đồng +3, tương phản +2, xung đột -2', () => {
    const red = { h: 0, s: 80, l: 50 };
    expect(E.evaluateHarmony({ h: 0, s: 0, l: 100 }, red).score).toBe(3);
    expect(E.evaluateHarmony(red, { h: 20, s: 80, l: 50 }).harmonyType).toBe('analogous');
    expect(E.evaluateHarmony(red, { h: 180, s: 80, l: 50 }).score).toBe(2);
    expect(E.evaluateHarmony(red, { h: 100, s: 80, l: 50 })).toMatchObject({ score: -2, harmonyType: 'clash' });
  });

  test('hexToHsl', () => {
    expect(E.hexToHsl('#FFFFFF')).toMatchObject({ h: 0, s: 0, l: 100 });
    expect(E.hexToHsl('#FF0000')).toMatchObject({ h: 0, s: 100, l: 50 });
  });
});
