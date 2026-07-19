export type ListingCondition = 'Sıfır' | 'Az Kullanılmış' | 'İkinci El';

export type Listing = {
  id: string;
  title: string;
  price: number;
  category: string;
  location: string;
  createdAt: string; // ISO date
  images: string[];
  description: string;
  condition: ListingCondition;
  sellerName: string;
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

export const mockListings: Listing[] = [
  {
    id: '1',
    title: 'iPhone 14 Pro 256GB Uzay Grisi',
    price: 32500,
    category: 'Elektronik',
    location: 'Kadıköy, İstanbul',
    createdAt: '2026-07-18T09:30:00.000Z',
    images: [
      'https://picsum.photos/seed/stop82-iphone-1/900/900',
      'https://picsum.photos/seed/stop82-iphone-2/900/900',
      'https://picsum.photos/seed/stop82-iphone-3/900/900',
    ],
    description:
      'Faturalı, kutulu, hiçbir çizik yok. Tüm aksesuarları mevcut. Pil sağlığı %94. Değişim olmaz, ciddi alıcılarla görüşülür.',
    condition: 'Az Kullanılmış',
    sellerName: 'Emre K.',
  },
  {
    id: '2',
    title: 'Chester Koltuk Takımı 3+2+1',
    price: 18500,
    category: 'Mobilya',
    location: 'Çankaya, Ankara',
    createdAt: '2026-07-17T14:10:00.000Z',
    images: [
      'https://picsum.photos/seed/stop82-sofa-1/900/900',
      'https://picsum.photos/seed/stop82-sofa-2/900/900',
    ],
    description:
      '2 yıllık, kedi/köpek yok, sigara içilmeyen evde kullanıldı. Kumaş yıpranması yok. Ev taşınması nedeniyle satılık.',
    condition: 'Az Kullanılmış',
    sellerName: 'Selin A.',
  },
  {
    id: '3',
    title: 'Trek Marlin 7 Dağ Bisikleti',
    price: 14750,
    category: 'Spor & Outdoor',
    location: 'Bornova, İzmir',
    createdAt: '2026-07-17T08:00:00.000Z',
    images: [
      'https://picsum.photos/seed/stop82-bike-1/900/900',
      'https://picsum.photos/seed/stop82-bike-2/900/900',
    ],
    description:
      '29" jant, hidrolik disk fren, 2023 model. Periyodik bakımları yapıldı, orijinal parçalarında herhangi bir değişiklik yok.',
    condition: 'Az Kullanılmış',
    sellerName: 'Doğukan T.',
  },
  {
    id: '4',
    title: 'Bosch Serie 6 Çamaşır Makinesi 9kg',
    price: 9200,
    category: 'Ev Eşyası',
    location: 'Nilüfer, Bursa',
    createdAt: '2026-07-16T19:45:00.000Z',
    images: ['https://picsum.photos/seed/stop82-washer-1/900/900'],
    description:
      'A+++ enerji sınıfı, sessiz motor. 1 yıl garantisi devam ediyor, faturası mevcut. Kapıdan teslim, nakliye alıcıya ait.',
    condition: 'Az Kullanılmış',
    sellerName: 'Merve Y.',
  },
  {
    id: '5',
    title: 'The North Face Mont, L Beden',
    price: 2450,
    category: 'Giyim',
    location: 'Beşiktaş, İstanbul',
    createdAt: '2026-07-16T11:20:00.000Z',
    images: [
      'https://picsum.photos/seed/stop82-jacket-1/900/900',
      'https://picsum.photos/seed/stop82-jacket-2/900/900',
    ],
    description: 'Sadece birkaç kez giyildi, orijinal etiketi hâlâ üstünde. Su geçirmez kumaş.',
    condition: 'Az Kullanılmış',
    sellerName: 'Ali V.',
  },
  {
    id: '6',
    title: 'IKEA Bebek Beşiği + Yatak Seti',
    price: 3100,
    category: 'Anne & Bebek',
    location: 'Muratpaşa, Antalya',
    createdAt: '2026-07-15T16:05:00.000Z',
    images: ['https://picsum.photos/seed/stop82-crib-1/900/900'],
    description: 'Temiz kullanım, sökülüp paketlenebilir durumda. Yatak seti hijyenik olarak yıkandı.',
    condition: 'Az Kullanılmış',
    sellerName: 'Zeynep D.',
  },
  {
    id: '7',
    title: 'PlayStation 5 Slim + 2 Kol',
    price: 21900,
    category: 'Elektronik',
    location: 'Konak, İzmir',
    createdAt: '2026-07-15T09:15:00.000Z',
    images: [
      'https://picsum.photos/seed/stop82-ps5-1/900/900',
      'https://picsum.photos/seed/stop82-ps5-2/900/900',
    ],
    description: 'Kutulu, faturalı. 3 oyun hediye. Garanti süresi devam ediyor.',
    condition: 'Az Kullanılmış',
    sellerName: 'Kerem B.',
  },
  {
    id: '8',
    title: 'Yamaha Akustik Gitar Seti',
    price: 4650,
    category: 'Kitap & Hobi',
    location: 'Kartal, İstanbul',
    createdAt: '2026-07-14T13:40:00.000Z',
    images: ['https://picsum.photos/seed/stop82-guitar-1/900/900'],
    description: 'Kılıf, akort aleti ve mızraplarla birlikte satılır. Yeni başlayanlar için ideal.',
    condition: 'Sıfır',
    sellerName: 'Naz P.',
  },
];

export function getListingById(id: string): Listing | undefined {
  return mockListings.find((listing) => listing.id === id);
}

export function formatPrice(price: number): string {
  return `${price.toLocaleString('tr-TR')} ₺`;
}

export function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Az önce';
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
}
