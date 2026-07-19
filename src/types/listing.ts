import type { Ionicons } from '@expo/vector-icons';

export type ListingCondition = 'Sıfır' | 'Az Kullanılmış' | 'İkinci El';

export type ListingLocation = {
  label: string;
  latitude: number | null;
  longitude: number | null;
};

export type ListingStatus = 'active' | 'sold';

export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: ListingCondition;
  images: string[];
  location: ListingLocation;
  sellerId: string;
  sellerName: string;
  sellerPhotoURL: string | null;
  createdAt: number;
  status: ListingStatus;
  viewCount: number;
};

export const categories = [
  'Elektronik',
  'Telefon',
  'Bilgisayar',
  'Ev Eşyası',
  'Mobilya',
  'Giyim',
  'Ayakkabı & Çanta',
  'Araç',
  'Emlak',
  'Anne & Bebek',
  'Spor & Outdoor',
  'Kitap & Hobi',
  'Oyun & Konsol',
  'Diğer',
];

// Kategori sohbet balonlarinda gosterilen ikonlar (Ionicons glyph adlari).
export const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Tümü: 'apps-outline',
  Elektronik: 'hardware-chip-outline',
  Telefon: 'phone-portrait-outline',
  Bilgisayar: 'laptop-outline',
  'Ev Eşyası': 'home-outline',
  Mobilya: 'cube-outline',
  Giyim: 'shirt-outline',
  'Ayakkabı & Çanta': 'bag-handle-outline',
  Araç: 'car-outline',
  Emlak: 'business-outline',
  'Anne & Bebek': 'happy-outline',
  'Spor & Outdoor': 'basketball-outline',
  'Kitap & Hobi': 'book-outline',
  'Oyun & Konsol': 'game-controller-outline',
  Diğer: 'ellipsis-horizontal-outline',
};

export const conditions: ListingCondition[] = ['Sıfır', 'Az Kullanılmış', 'İkinci El'];
