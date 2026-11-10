export interface SeedItem {
  id: string;
  name: string;
  category: 'Áo' | 'Quần' | 'Váy' | 'Giày';
  colorName: string;
  context: string;
  image: any;
}

export const SEED_ITEMS: SeedItem[] = [
  {
    id: '1',
    name: 'Áo thun kem',
    category: 'Áo',
    colorName: 'Kem',
    context: 'Đi học',
    image: require('../../assets/seed/ao-thun-kem.png'),
  },
  {
    id: '2',
    name: 'Sơ mi trắng',
    category: 'Áo',
    colorName: 'Trắng',
    context: 'Đi làm',
    image: require('../../assets/seed/so-mi-trang.png'),
  },
  {
    id: '3',
    name: 'Áo khoác ô liu',
    category: 'Áo',
    colorName: 'Ô liu',
    context: 'Đi chơi',
    image: require('../../assets/seed/ao-khoac-o-liu.png'),
  },
  {
    id: '4',
    name: 'Jeans xanh đậm',
    category: 'Quần',
    colorName: 'Xanh đậm',
    context: 'Đi học',
    image: require('../../assets/seed/jeans-xanh-dam.png'),
  },
  {
    id: '5',
    name: 'Quần kaki be',
    category: 'Quần',
    colorName: 'Be',
    context: 'Đi làm',
    image: require('../../assets/seed/quan-kaki-be.png'),
  },
  {
    id: '6',
    name: 'Chân váy đen',
    category: 'Váy',
    colorName: 'Đen',
    context: 'Hẹn hò',
    image: require('../../assets/seed/chan-vay-den.png'),
  },
  {
    id: '7',
    name: 'Sneaker trắng',
    category: 'Giày',
    colorName: 'Trắng',
    context: 'Mọi dịp',
    image: require('../../assets/seed/sneaker-trang.png'),
  },
];

export const CLOSY_LOGO = require('../../assets/seed/closy-logo.png');
export const ONBOARDING_HERO = require('../../assets/seed/onboarding-hero.png');
export const GOOGLE_LOGO = require('../../assets/seed/google-g.png');

