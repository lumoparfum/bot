import {
  Timestamp,
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import { deleteListingImages, uploadListingImages } from './storage';
import type { Listing, ListingCondition, ListingLocation } from '../types/listing';

const listingsRef = collection(db, 'listings');

function mapListing(id: string, data: DocumentData): Listing {
  return {
    id,
    title: data.title,
    description: data.description,
    price: data.price,
    category: data.category,
    subcategory: data.subcategory ?? null,
    condition: data.condition,
    images: data.images ?? [],
    location: data.location ?? { label: '', latitude: null, longitude: null },
    sellerId: data.sellerId,
    sellerName: data.sellerName,
    sellerPhotoURL: data.sellerPhotoURL ?? null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    status: data.status ?? 'active',
    viewCount: data.viewCount ?? 0,
    soldTo: data.soldTo ?? null,
    favoriteCount: data.favoriteCount ?? 0,
    priceHistory: Array.isArray(data.priceHistory) ? data.priceHistory : [],
    attributes: data.attributes ?? {},
  };
}

export type NewListingInput = {
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory: string | null;
  attributes: Record<string, string>;
  condition: ListingCondition;
  localImageUris: string[];
  location: ListingLocation;
  sellerId: string;
  sellerName: string;
  sellerPhotoURL: string | null;
};

export async function createListing(input: NewListingInput): Promise<string> {
  const newDocRef = doc(listingsRef);
  // Once Firestore belgesi (sellerId ile) olusturulur, fotograflar SONRA
  // yuklenir - storage.rules'daki listings/{listingId} yazma kurali sahiplik
  // icin bu belgeye bakiyor, oncesinde belge yoksa yukleme reddedilir.
  await setDoc(newDocRef, {
    title: input.title,
    description: input.description,
    price: input.price,
    category: input.category,
    subcategory: input.subcategory,
    attributes: input.attributes,
    condition: input.condition,
    images: [],
    location: input.location,
    sellerId: input.sellerId,
    sellerName: input.sellerName,
    sellerPhotoURL: input.sellerPhotoURL,
    createdAt: serverTimestamp(),
    status: 'active',
    viewCount: 0,
    soldTo: null,
    favoriteCount: 0,
    priceHistory: [{ price: input.price, changedAt: Date.now() }],
  });
  const images = await uploadListingImages(newDocRef.id, input.sellerId, input.localImageUris);
  await updateDoc(newDocRef, { images });
  return newDocRef.id;
}

export const DAILY_LISTING_LIMIT = 3;

export type ListingCreationCheck = { allowed: boolean; reason: 'daily_limit' | 'duplicate' | null };

// Bot/spam onlemi: (1) bir kullanici gunde en fazla DAILY_LISTING_LIMIT ilan
// verebilir, (2) ayni baslik+fiyatla son 24 saat icinde ikinci kez ilan
// veremez. Bu istemci tarafi bir kontrol - uygulamayi normal kullanan
// gercek kullanicilari caydirir, ama Firestore'a dogrudan yazan bir script'i
// engellemez (bunun icin sunucu tarafi bir gate gerekir).
export async function checkListingCreationAllowed(
  sellerId: string,
  title: string,
  price: number
): Promise<ListingCreationCheck> {
  const listings = await fetchListingsBySeller(sellerId);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayCount = listings.filter((listing) => listing.createdAt >= startOfToday.getTime()).length;
  if (todayCount >= DAILY_LISTING_LIMIT) {
    return { allowed: false, reason: 'daily_limit' };
  }

  const normalizedTitle = title.trim().toLocaleLowerCase('tr-TR');
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const isDuplicate = listings.some(
    (listing) =>
      listing.createdAt >= oneDayAgo &&
      listing.price === price &&
      listing.title.trim().toLocaleLowerCase('tr-TR') === normalizedTitle
  );
  if (isDuplicate) {
    return { allowed: false, reason: 'duplicate' };
  }

  return { allowed: true, reason: null };
}

// Fotograflarin ekrandaki sirasi ("kapak fotografi" hangisi) korunsun diye
// tek bir sirali liste kullanilir - "once eskiler, sonra yeniler" gibi sabit
// bir birlestirme yapilirsa, kullanici yeni eklediği bir fotografi kapak
// yapmak isteyip eskilerden birini geriye alsa bile kaydedilen sirada yine
// tum eski fotograflar basa dusuyordu.
export type ListingImageSlot = { kind: 'existing'; url: string } | { kind: 'new'; uri: string };

export type ListingUpdateInput = {
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory: string | null;
  attributes: Record<string, string>;
  condition: ListingCondition;
  location: ListingLocation;
  images: ListingImageSlot[];
  sellerId: string;
};

export async function updateListing(
  listingId: string,
  input: ListingUpdateInput,
  previousPrice: number
): Promise<void> {
  const newUris = input.images.filter((slot) => slot.kind === 'new').map((slot) => slot.uri);
  const uploadedUrls = await uploadListingImages(listingId, input.sellerId, newUris);
  let uploadIndex = 0;
  const images = input.images.map((slot) =>
    slot.kind === 'existing' ? slot.url : uploadedUrls[uploadIndex++]
  );
  const updates: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    price: input.price,
    category: input.category,
    subcategory: input.subcategory,
    attributes: input.attributes,
    condition: input.condition,
    location: input.location,
    images,
  };
  // Fiyat gercekten degistiyse gecmise bir kayit ekle - "fiyat dustu" gostergesi bunu kullanir.
  if (input.price !== previousPrice) {
    updates.priceHistory = arrayUnion({ price: input.price, changedAt: Date.now() });
  }
  await updateDoc(doc(db, 'listings', listingId), updates);
}

export async function incrementListingView(listingId: string): Promise<void> {
  await updateDoc(doc(db, 'listings', listingId), { viewCount: increment(1) }).catch(() => {});
}

// buyerId verilirse (satici sohbet gecmisinden aliciyi secmisse), o alici
// bu saticiyi degerlendirebilir hale gelir - reviews kurali buna bakiyor.
export async function markListingSold(
  listingId: string,
  sellerId: string,
  buyerId?: string | null
): Promise<void> {
  await updateDoc(doc(db, 'listings', listingId), { status: 'sold', soldTo: buyerId ?? null });
  await updateDoc(doc(db, 'users', sellerId), { salesCount: increment(1) });
  if (buyerId) {
    await setDoc(doc(db, 'users', sellerId, 'buyers', buyerId), {
      listingId,
      createdAt: serverTimestamp(),
    });
  }
}

export async function fetchAccountType(uid: string): Promise<'individual' | 'business'> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.data()?.accountType === 'business' ? 'business' : 'individual';
}

export async function setAccountType(uid: string, accountType: 'individual' | 'business'): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { accountType });
}

export async function fetchListings(): Promise<Listing[]> {
  const q = query(listingsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapListing(d.id, d.data()));
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  const snapshot = await getDoc(doc(db, 'listings', id));
  if (!snapshot.exists()) return null;
  return mapListing(snapshot.id, snapshot.data());
}

export async function fetchListingsBySeller(sellerId: string): Promise<Listing[]> {
  // Not: composite index gerekmesin diye orderBy burada yapilmiyor,
  // sonuc az sayida oldugu icin JS tarafinda sirala.
  const q = query(listingsRef, where('sellerId', '==', sellerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapListing(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteListing(id: string): Promise<void> {
  // Once fotograflar silinir (storage.rules sahiplik icin bu belgenin hala
  // var olmasina bakiyor), Firestore belgesi EN SON silinir.
  await deleteListingImages(id).catch(() => {});
  await deleteDoc(doc(db, 'listings', id));
}

// Favoriler: users/{uid}/favorites/{listingId}
export async function fetchFavoriteIds(uid: string): Promise<string[]> {
  const snapshot = await getDocs(collection(db, 'users', uid, 'favorites'));
  return snapshot.docs.map((d) => d.id);
}

export async function setFavorite(uid: string, listingId: string, favorited: boolean): Promise<void> {
  const favRef = doc(db, 'users', uid, 'favorites', listingId);
  if (favorited) {
    await setDoc(favRef, { createdAt: serverTimestamp() });
  } else {
    await deleteDoc(favRef);
  }
}

export async function fetchFavoriteListings(uid: string): Promise<Listing[]> {
  const ids = await fetchFavoriteIds(uid);
  const listings = await Promise.all(ids.map((id) => fetchListingById(id)));
  return listings.filter((listing): listing is Listing => listing !== null);
}

// Kullanici profili: users/{uid}
export async function ensureUserProfile(
  uid: string,
  data: { displayName: string | null; email: string | null; photoURL: string | null }
): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  // lastActiveAt burada, tek bir yazimda guncellenir - ayri bir paralel
  // updateDoc cagrisi, profil belgesi henuz olusmamisken "no document to
  // update" hatasiyla sessizce basarisiz olabiliyordu.
  const payload: Record<string, unknown> = { ...data, updatedAt: serverTimestamp(), lastActiveAt: serverTimestamp() };
  // createdAt sadece profil ilk olusturulurken yazilir - "hesap yasi" rozeti
  // her girişte sifirlanmasin diye sonraki merge'lerde bu alana dokunulmaz.
  if (!snap.exists()) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(ref, payload, { merge: true });
}
