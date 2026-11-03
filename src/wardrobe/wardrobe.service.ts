import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateItemDto } from './wardrobe.dto';
import { Category, ItemSource, Occasion, WardrobeItem } from './wardrobe.types';

const MIN_ITEMS = 5;
const CAPSULE: Array<[string, Category, string, Occasion[]]> = [
  ['Áo thun trắng', Category.TOP, '#FFFFFF', [Occasion.SCHOOL, Occasion.CASUAL_DATE]],
  ['Áo sơ mi xanh navy', Category.TOP, '#1F3A5F', [Occasion.WORK, Occasion.CASUAL_DATE]],
  ['Áo hoodie xám', Category.TOP, '#8A8D91', [Occasion.SCHOOL]],
  ['Áo sơ mi be', Category.TOP, '#D8C8A8', [Occasion.WORK, Occasion.CASUAL_DATE]],
  ['Quần jeans xanh nhạt', Category.BOTTOM, '#7FA3C7', [Occasion.SCHOOL, Occasion.CASUAL_DATE]],
  ['Quần tây đen', Category.BOTTOM, '#1A1A1A', [Occasion.WORK, Occasion.CASUAL_DATE]],
  ['Quần chinos be', Category.BOTTOM, '#C9B38C', [Occasion.WORK, Occasion.SCHOOL]],
  ['Giày sneaker trắng', Category.SHOES, '#F5F5F5', [Occasion.SCHOOL, Occasion.CASUAL_DATE]],
  ['Giày loafer đen', Category.SHOES, '#111111', [Occasion.WORK, Occasion.CASUAL_DATE]],
];

@Injectable()
export class WardrobeService {
  private items = new Map<string, WardrobeItem>();

  create(dto: CreateItemDto): WardrobeItem {
    const item: WardrobeItem = {
      id: randomUUID(), userId: dto.userId || 'demo', name: dto.name, category: dto.category,
      colorHex: dto.colorHex.toUpperCase(), occasions: dto.occasions, source: dto.source || ItemSource.CAMERA,
      imageUrl: dto.imageUrl, lastWornAt: null, createdAt: new Date().toISOString(),
    };
    this.items.set(item.id, item);
    return item;
  }

  addCapsule(userId = 'demo') {
    const added = CAPSULE.map(([name, category, colorHex, occasions]) =>
      this.create({ userId, name, category, colorHex, occasions, source: ItemSource.CAPSULE }));
    return { added, ...this.progress(userId) };
  }

  list(userId = 'demo', category?: Category, occasion?: Occasion) {
    const items = this.all(userId).filter((i) => (!category || i.category === category) && (!occasion || i.occasions.includes(occasion)));
    return { total: items.length, items, ...this.progress(userId) };
  }

  get(id: string) {
    const it = this.items.get(id);
    if (!it) throw new NotFoundException(`Item ${id} not found`);
    return it;
  }

  all(userId: string) { return [...this.items.values()].filter((i) => i.userId === userId); }

  markWorn(ids: string[]) { const now = new Date().toISOString(); ids.forEach((id) => (this.get(id).lastWornAt = now)); }

  /** Tiến độ mở khóa phối đồ: >= 5 món và đủ danh mục (top, bottom/dress, shoes) */
  progress(userId: string) {
    const items = this.all(userId);
    const has = (c: Category) => items.some((i) => i.category === c);
    const missing: string[] = [];
    if (!has(Category.TOP) && !has(Category.DRESS)) missing.push('top');
    if (!has(Category.BOTTOM) && !has(Category.DRESS)) missing.push('bottom');
    if (!has(Category.SHOES)) missing.push('shoes');
    return {
      onboarding: {
        count: items.length, required: MIN_ITEMS, missingCategories: missing,
        unlocked: items.length >= MIN_ITEMS && missing.length === 0,
      },
    };
  }
}
