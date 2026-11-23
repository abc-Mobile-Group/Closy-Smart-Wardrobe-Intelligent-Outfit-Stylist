import { create } from 'zustand';
import { WardrobeService } from '../services/WardrobeService';
import { CreateItemDTO, WardrobeItem } from '../types/item';

interface WardrobeState {
  items: WardrobeItem[];
  isLoading: boolean;
  error: string | null;
  loadItems: () => Promise<void>;
  addItem: (dto: CreateItemDTO) => Promise<WardrobeItem>;
  updateItem: (
    id: number,
    data: {
      name?: string;
      category?: string;
      color_name?: string;
      color_hex?: string;
      formality?: number;
      contexts?: string[];
    },
  ) => Promise<WardrobeItem | null>;
  deleteItem: (id: number) => Promise<void>;
}

export const useWardrobeStore = create<WardrobeState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  loadItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const next = await WardrobeService.getItems();
      const prev = get().items;
      const same =
        prev.length === next.length &&
        prev.every((p, i) => {
          const n = next[i];
          return (
            p.id === n.id && p.name === n.name && p.category === n.category &&
            p.color_h === n.color_h && p.color_s === n.color_s && p.color_l === n.color_l &&
            p.formality === n.formality && p.contexts === n.contexts &&
            p.image_path === n.image_path && p.last_worn === n.last_worn
          );
        });
      // Không tạo mảng mới khi dữ liệu không đổi -> tránh gọi lại API gợi ý thừa
      set(same ? { isLoading: false } : { items: next, isLoading: false });
    } catch (e: any) {
      console.warn('Lỗi tải danh sách đồ từ SQLite:', e);
      set({ error: e?.message || 'Không thể tải tủ đồ', isLoading: false });
    }
  },

  addItem: async (dto: CreateItemDTO) => {
    set({ isLoading: true, error: null });
    try {
      const newItem = await WardrobeService.addItem(dto);
      set((state) => ({
        items: [newItem, ...state.items],
        isLoading: false,
      }));
      return newItem;
    } catch (e: any) {
      console.error('Lỗi thêm món đồ vào SQLite:', e);
      set({ error: e?.message || 'Không thể lưu món đồ', isLoading: false });
      throw e;
    }
  },

  updateItem: async (id, data) => {
    try {
      const updated = await WardrobeService.updateItem(id, data);
      if (updated) {
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? updated : item)),
        }));
      }
      return updated;
    } catch (e: any) {
      console.error('Lỗi cập nhật món đồ:', e);
      throw e;
    }
  },

  deleteItem: async (id: number) => {
    try {
      await WardrobeService.deleteItem(id);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
    } catch (e: any) {
      console.error('Lỗi xóa món đồ khỏi SQLite:', e);
      throw e;
    }
  },
}));

