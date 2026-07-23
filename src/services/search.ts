// Ana sayfa/kesfet artik Firestore'dan TUM ilanlari sinirsiz cekmek yerine
// (bkz. performans incelemesi - 50bin ilanda bu hem cok pahali hem yavas
// olurdu) kendi sunucumuzdaki Meilisearch'e sayfali sekilde soruyor. Firestore
// hala "gercek" veri kaynagi - Cloud Functions (onListingCreatedSyncSearch vb.)
// her ilan degisikliginde bu indeksi otomatik guncelliyor.
//
// Burada kullanilan anahtar SADECE arama yetkili (search-only), Meilisearch'te
// olusturulurken indeks yazma/silme yapamayacak sekilde sinirlandirildi - bu
// yuzden istemci kodunda acikca durmasi guvenlik riski degil.
import type { Listing } from '../types/listing';

const MEILI_HOST = 'https://search.stop82.com';
const MEILI_SEARCH_KEY = 'ec7836634550a79fa6564ff6d32d0f6df9b7e80940152d841526158011a8ba73';

export type SearchSortOption = 'newest' | 'priceAsc' | 'priceDesc' | 'distance';

export type SearchListingsParams = {
  query?: string;
  category?: string | null;
  subcategory?: string | null;
  condition?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: SearchSortOption;
  userLocation?: { latitude: number; longitude: number } | null;
  radiusKm?: number | null;
  cityLabel?: string | null;
  excludeSellerIds?: string[];
  page: number;
  hitsPerPage: number;
};

export type SearchListingsResult = {
  hits: (Listing & { distanceKm: number | null })[];
  totalHits: number;
  hasMore: boolean;
};

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function searchListings(params: SearchListingsParams): Promise<SearchListingsResult> {
  const filters: string[] = ['status = "active"'];
  if (params.category) filters.push(`category = "${escapeFilterValue(params.category)}"`);
  if (params.subcategory) filters.push(`subcategory = "${escapeFilterValue(params.subcategory)}"`);
  if (params.condition) filters.push(`condition = "${escapeFilterValue(params.condition)}"`);
  if (params.minPrice != null) filters.push(`price >= ${params.minPrice}`);
  if (params.maxPrice != null) filters.push(`price <= ${params.maxPrice}`);
  if (params.excludeSellerIds && params.excludeSellerIds.length > 0) {
    params.excludeSellerIds.forEach((id) => filters.push(`sellerId != "${escapeFilterValue(id)}"`));
  }
  if (params.userLocation && params.radiusKm != null) {
    filters.push(
      `_geoRadius(${params.userLocation.latitude}, ${params.userLocation.longitude}, ${params.radiusKm * 1000})`
    );
  } else if (params.cityLabel) {
    // Km secilmemis ("Tumu") - sadece sehir adina gore filtrele.
    filters.push(`locationLabel = "${escapeFilterValue(params.cityLabel)}"`);
  }

  const sort: string[] = [];
  if (params.sort === 'priceAsc') sort.push('price:asc');
  else if (params.sort === 'priceDesc') sort.push('price:desc');
  else if (params.sort === 'distance' && params.userLocation) {
    sort.push(`_geoPoint(${params.userLocation.latitude}, ${params.userLocation.longitude}):asc`);
  } else {
    sort.push('createdAt:desc');
  }
  // Asil siralama fiyat/tarih olsa bile, konumumuz varsa mesafeyi ikincil
  // (esitlik bozucu) kriter olarak ekleyip kart uzerinde mesafe etiketinin
  // her zaman gorunmesini sagliyoruz - eskiden (istemci tarafi hesapla)
  // siralamadan bagimsiz hep gosteriliyordu.
  if (params.sort !== 'distance' && params.userLocation) {
    sort.push(`_geoPoint(${params.userLocation.latitude}, ${params.userLocation.longitude}):asc`);
  }

  const res = await fetch(`${MEILI_HOST}/indexes/listings/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MEILI_SEARCH_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: params.query?.trim() || '',
      filter: filters.join(' AND '),
      sort,
      limit: params.hitsPerPage,
      offset: params.page * params.hitsPerPage,
    }),
  });
  if (!res.ok) {
    throw new Error(`Arama basarisiz: ${res.status}`);
  }
  const data = await res.json();
  const hits: (Listing & { distanceKm: number | null })[] = data.hits.map((hit: any) => ({
    id: hit.id,
    title: hit.title,
    description: hit.description,
    category: hit.category,
    subcategory: hit.subcategory || null,
    condition: hit.condition,
    price: hit.price,
    location: {
      label: hit.locationLabel ?? '',
      latitude: hit._geo?.lat ?? null,
      longitude: hit._geo?.lng ?? null,
    },
    sellerId: hit.sellerId,
    sellerName: hit.sellerName,
    sellerPhotoURL: hit.sellerPhotoURL ?? null,
    images: hit.images ?? [],
    status: hit.status ?? 'active',
    soldTo: hit.soldTo ?? null,
    createdAt: hit.createdAt,
    viewCount: hit.viewCount ?? 0,
    favoriteCount: hit.favoriteCount ?? 0,
    priceHistory: hit.priceHistory ?? [],
    attributes: hit.attributes ?? {},
    distanceKm: hit._geoDistance != null ? hit._geoDistance / 1000 : null,
  }));

  return {
    hits,
    totalHits: data.estimatedTotalHits ?? hits.length,
    hasMore: params.page * params.hitsPerPage + hits.length < (data.estimatedTotalHits ?? 0),
  };
}
