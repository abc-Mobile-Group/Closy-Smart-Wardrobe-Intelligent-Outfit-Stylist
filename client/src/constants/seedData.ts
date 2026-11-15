export interface SeedItem {
  id: string;
  name: string;
  category: 'Áo' | 'Quần' | 'Váy' | 'Đầm' | 'Giày';
  colorName: string;
  context: string;
  image: any;
}

// Bỏ toàn bộ mock data đồ mẫu theo yêu cầu: Chỉ sử dụng trang phục thật của người dùng
export const SEED_ITEMS: SeedItem[] = [];

export const CLOSY_LOGO = require('../../assets/seed/closy-logo.png');
export const ONBOARDING_HERO = require('../../assets/seed/onboarding-hero.png');
export const GOOGLE_LOGO = require('../../assets/seed/google-g.png');

