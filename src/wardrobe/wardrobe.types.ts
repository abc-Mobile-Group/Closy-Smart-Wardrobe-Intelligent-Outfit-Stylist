export enum Category { TOP = 'top', BOTTOM = 'bottom', SHOES = 'shoes', OUTERWEAR = 'outerwear', DRESS = 'dress' }
export enum Occasion { SCHOOL = 'school', WORK = 'work', CASUAL_DATE = 'casual_date' }
export enum ItemSource { CAMERA = 'camera', GALLERY = 'gallery', CAPSULE = 'capsule' }

export interface WardrobeItem {
  id: string;
  userId: string;
  name: string;
  category: Category;
  colorHex: string;
  occasions: Occasion[];
  source: ItemSource;
  imageUrl?: string;
  lastWornAt: string | null;
  createdAt: string;
}
