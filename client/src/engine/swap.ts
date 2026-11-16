import { WardrobeItem } from '../types/item';
import { ColorHarmonyEngine } from './ColorHarmonyEngine';
import { calculateItemContextScore, DisplayItem, mapWardrobeItemToDisplay } from './suggest';

export const outfitSignature = (items: DisplayItem[]) =>
  JSON.stringify(items.map((item) => String(item.id)).sort());

function slot(item: Pick<DisplayItem, 'category' | 'name'>): string {
  if (item.category === 'Đầm' || (item.category === 'Váy' && /đầm|dress/i.test(item.name))) return 'dress';
  if (item.category === 'Quần' || item.category === 'Váy') return 'bottom';
  return item.category;
}

export function outfitHarmony(items: DisplayItem[], wardrobe: WardrobeItem[]) {
  const top = items.find((item) => slot(item) === 'Áo');
  const bottom = items.find((item) => slot(item) === 'bottom');
  if (!top || !bottom) return null;
  const color = (item: DisplayItem) => {
    const raw = wardrobe.find((entry) => String(entry.id) === String(item.id));
    return raw ? { h: raw.color_h, s: raw.color_s, l: raw.color_l }
      : ColorHarmonyEngine.hexToHsl(item.colorHex || '#FFFFFF');
  };
  return ColorHarmonyEngine.evaluateHarmony(color(top), color(bottom));
}

/** Keep locked slots intact; cycle through unseen alternatives before repeating. */
export function swapOutfit(
  current: DisplayItem[], wardrobe: WardrobeItem[], lockedIds: string[],
  context: string, seen: ReadonlySet<string>, random: () => number = Math.random,
): DisplayItem[] | null {
  const currentIds = new Set(current.map((item) => String(item.id)));
  const choices = current.map((item) => {
    if (lockedIds.includes(String(item.id))) return [item];
    const alternatives = wardrobe.filter((candidate) =>
      slot(candidate) === slot(item) && !currentIds.has(String(candidate.id)),
    ).map(mapWardrobeItemToDisplay);
    return alternatives.length ? alternatives : [item];
  });
  let best: DisplayItem[] | null = null;
  let bestScore = -Infinity;
  let bestUnseen: DisplayItem[] | null = null;
  let bestUnseenScore = -Infinity;
  const currentSignature = outfitSignature(current);
  const visit = (items: DisplayItem[]) => {
    if (items.length < choices.length) {
      for (const item of choices[items.length]) {
        if (!items.some((existing) => String(existing.id) === String(item.id))) visit([...items, item]);
      }
      return;
    }
    const signature = outfitSignature(items);
    if (signature === currentSignature) return;
    const score = items.reduce((total, item) => {
      const raw = wardrobe.find((entry) => String(entry.id) === String(item.id));
      return total + (raw ? calculateItemContextScore(raw, context) : 0);
    }, 0) + (outfitHarmony(items, wardrobe)?.score ?? 0) * 10 + random() * 2;
    if (score > bestScore) { best = items; bestScore = score; }
    if (!seen.has(signature) && score > bestUnseenScore) {
      bestUnseen = items; bestUnseenScore = score;
    }
  };
  visit([]);
  return bestUnseen ?? best;
}
