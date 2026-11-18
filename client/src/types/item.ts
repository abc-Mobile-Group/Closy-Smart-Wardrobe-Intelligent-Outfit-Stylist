export type Category = 'Áo' | 'Quần' | 'Váy' | 'Đầm' | 'Giày';

export type Formality = 1 | 3 | 5;

export type ContextType = 'Đi học' | 'Đi làm' | 'Đi chơi' | 'Hẹn hò';

export interface WardrobeItem {
  id: number;
  name: string;
  category: Category;
  image_path: string;
  relative_image_path?: string;
  color_h: number;     // 0-360
  color_s: number;     // 0-100
  color_l: number;     // 0-100
  color_hex?: string;
  color_name?: string;
  formality: Formality; // 1 | 3 | 5
  contexts: string;     // Chuỗi phân tách bằng dấu phẩy: "Đi học,Đi làm"
  last_worn?: string | null;
  wear_count: number;
  created_at: string;
}

export interface CreateItemDTO {
  name: string;
  category: Category;
  image_path: string;
  color_h: number;
  color_s: number;
  color_l: number;
  color_hex?: string;
  color_name?: string;
  formality: Formality;
  contexts: string[];
}

