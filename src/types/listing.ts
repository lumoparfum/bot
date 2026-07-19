export type ListingCondition = 'Sıfır' | 'Az Kullanılmış' | 'İkinci El';

export type ListingLocation = {
  label: string;
  latitude: number | null;
  longitude: number | null;
};

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
};

export const categories = [
  'Elektronik',
  'Ev Eşyası',
  'Giyim',
  'Araç',
  'Mobilya',
  'Spor & Outdoor',
  'Kitap & Hobi',
  'Anne & Bebek',
];

export const conditions: ListingCondition[] = ['Sıfır', 'Az Kullanılmış', 'İkinci El'];
