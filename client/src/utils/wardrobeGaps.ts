import { isBottom, isDress, isTop } from '../engine/suggest';
import { Category, WardrobeItem } from '../types/item';

export interface WardrobeGap {
  title: string;
  message: string;
  /** Chữ trên nút hành động chính */
  cta: string;
  /** Danh mục nên chọn sẵn khi mở màn Thêm món */
  category?: Category;
}

const TITLE = 'Chưa đủ trang phục để phối';

/**
 * Trạng thái Empty/Incomplete: nói rõ tủ đồ đang thiếu gì (ví dụ có 3 áo nhưng chưa có quần).
 * Dùng cùng định nghĩa áo/quần/đầm với engine gợi ý nên thông báo luôn khớp với việc phối được hay không.
 */
export function describeMissing(items: WardrobeItem[]): WardrobeGap {
  if (!items || items.length === 0) {
    return {
      title: TITLE,
      message: 'Tủ đồ của bạn đang trống. Hãy chụp hoặc thêm vài món để Closy gợi ý nhé!',
      cta: 'Thêm món đầu tiên',
    };
  }

  const dresses = items.filter(isDress).length;
  const tops = items.filter(isTop).length;
  const bottoms = items.filter(isBottom).length;
  const jackets = items.filter((i) => i.category === 'Áo' && /khoác/i.test(i.name || '')).length;

  if (dresses === 0 && tops > 0 && bottoms === 0) {
    return {
      title: TITLE,
      message: `Bạn có ${tops} áo nhưng chưa có quần hoặc chân váy. Thêm một chiếc quần để Closy phối được.`,
      cta: 'Thêm quần/váy',
      category: 'Quần',
    };
  }

  if (dresses === 0 && bottoms > 0 && tops === 0) {
    const jacketNote = jackets > 0 ? ' (Áo khoác chưa được dùng để lập bộ.)' : '';
    return {
      title: TITLE,
      message: `Bạn có ${bottoms} quần/váy nhưng chưa có áo.${jacketNote} Thêm một chiếc áo để Closy phối được.`,
      cta: 'Thêm áo',
      category: 'Áo',
    };
  }

  if (dresses === 0 && tops === 0 && bottoms === 0) {
    return {
      title: TITLE,
      message: 'Bạn cần ít nhất một chiếc đầm, hoặc một áo kèm quần/chân váy. Giày và áo khoác chưa đủ để lập bộ.',
      cta: 'Thêm món đồ',
      category: 'Áo',
    };
  }

  return {
    title: 'Chưa tìm được bộ phù hợp',
    message: 'Thử đổi bối cảnh khác hoặc thêm món để có nhiều lựa chọn hơn.',
    cta: 'Thêm món đồ',
  };
}
