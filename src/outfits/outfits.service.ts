import { BadRequestException, Injectable } from '@nestjs/common';
import { WardrobeService } from '../wardrobe/wardrobe.service';
import { Category, WardrobeItem } from '../wardrobe/wardrobe.types';
import { evaluateHarmony } from './color-harmony';
import { ConfirmWearDto, SuggestDto } from './outfits.dto';

const DAY = 86_400_000;
const daysSince = (iso: string | null, createdAt: string) => Math.floor((Date.now() - new Date(iso ?? createdAt).getTime()) / DAY);

@Injectable()
export class OutfitsService {
  private history: Array<{ id: number; userId: string; itemIds: string[]; occasion?: string; wornAt: string }> = [];
  constructor(private readonly wardrobe: WardrobeService) {}

  suggest(dto: SuggestDto) {
    const started = Date.now();
    const userId = dto.userId || 'demo';
    const prog = this.wardrobe.progress(userId);
    if (!prog.onboarding.unlocked) {
      throw new BadRequestException({
        message: `Tủ đồ chưa đủ để phối: cần ≥${prog.onboarding.required} món, đang có ${prog.onboarding.count}; thiếu danh mục: ${prog.onboarding.missingCategories.join(', ') || 'không'}.`,
        hint: 'Gọi POST /wardrobe/capsule-basics để nạp nhanh.',
      });
    }
    const pool = this.wardrobe.all(userId).filter((i) => i.occasions.includes(dto.occasion));
    const locked = (dto.lockedItemIds || []).map((id) => this.wardrobe.get(id));
    const by = (c: Category) => pool.filter((i) => i.category === c);
    const hot = dto.weather ? dto.weather.tempC >= 30 : false;
    const cold = dto.weather ? dto.weather.tempC <= 20 || dto.weather.rain === true : false;

    // sinh tổ hợp: (top × bottom | dress) × shoes [+ outerwear nếu lạnh/mưa]
    let combos: WardrobeItem[][] = [];
    const bodies: WardrobeItem[][] = [
      ...by(Category.TOP).flatMap((t) => by(Category.BOTTOM).map((b) => [t, b])),
      ...by(Category.DRESS).map((d) => [d]),
    ];
    for (const body of bodies) for (const s of by(Category.SHOES)) {
      const base = [...body, s];
      combos.push(base, ...(cold ? by(Category.OUTERWEAR).map((o) => [...base, o]) : []));
    }
    // ràng buộc Lock: mọi món khóa phải có mặt trong bộ
    combos = combos.filter((c) => locked.every((l) => c.some((i) => i.id === l.id)));
    if (!combos.length) throw new BadRequestException('Không tạo được bộ nào với các món đã khóa và bối cảnh này. Hãy bỏ khóa hoặc thêm đồ.');

    const excluded = new Set(dto.excludeSignatures || []);
    const scored = combos.map((items) => {
      const h = evaluateHarmony(items.map((i) => i.colorHex));
      // US04: cộng nhẹ (≤0.1) cho món lâu chưa mặc, chỉ khi màu đã hợp
      const revive = (Math.max(...items.map((i) => Math.min(daysSince(i.lastWornAt, i.createdAt), 30))) / 30) * 0.1;
      const signature = items.map((i) => i.id).sort().join('+');
      return { items, harmony: h, signature, score: +(h.score + (h.type === 'clash' ? 0 : revive)).toFixed(3) };
    }).filter((o) => o.harmony.type !== 'clash' && !excluded.has(o.signature)).sort((a, b) => b.score - a.score);

    // chọn tối đa 3 bộ khác nhau (mỗi bộ có ít nhất 1 món không trùng bộ đã chọn)
    const picked: typeof scored = [];
    for (const o of scored) {
      if (picked.length === 3) break;
      if (picked.every((p) => p.items.some((i) => !o.items.some((x) => x.id === i.id)) && o.items.some((i) => !p.items.some((x) => x.id === i.id)))) picked.push(o);
    }
    const outfits = picked.map((o, idx) => ({
      rank: idx + 1, signature: o.signature, score: o.score,
      harmony: { type: o.harmony.type, label: o.harmony.label },
      explanation: [o.harmony.label, dto.weather ? (hot ? 'Hợp trời nóng' : cold ? 'Có lớp ngoài cho trời mát/mưa' : 'Hợp thời tiết') : null].filter(Boolean).join(' • '),
      items: o.items.map((i) => ({ id: i.id, name: i.name, category: i.category, colorHex: i.colorHex, locked: locked.some((l) => l.id === i.id), daysSinceWorn: i.lastWornAt ? daysSince(i.lastWornAt, i.createdAt) : null })),
    }));
    return { occasion: dto.occasion, weatherUsed: !!dto.weather, count: outfits.length, outfits, processingMs: Date.now() - started };
  }

  confirmWear(dto: ConfirmWearDto) {
    this.wardrobe.markWorn(dto.itemIds); // 404 nếu id sai
    const entry = { id: this.history.length + 1, userId: dto.userId || 'demo', itemIds: dto.itemIds, occasion: dto.occasion, wornAt: new Date().toISOString() };
    this.history.push(entry);
    return { message: 'Đã lưu vào lịch sử mặc', entry, updatedItems: dto.itemIds.map((id) => ({ id, lastWornAt: this.wardrobe.get(id).lastWornAt })) };
  }

  getHistory(userId = 'demo') { return this.history.filter((h) => h.userId === userId); }
}
