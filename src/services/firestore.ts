import {
  Timestamp,
  addDoc,
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
    condition: data.condition,
    images: data.images ?? [],
    location: data.location ?? { label: '', latitude: null, longitude: null },
    sellerId: data.sellerId,
    sellerName: data.sellerName,
    sellerPhotoURL: data.sellerPhotoURL ?? null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    status: data.status ?? 'active',
  };
}

export type NewListingInput = {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: ListingCondition;
  localImageUris: string[];
  location: ListingLocation;
  sellerId: string;
  sellerName: string;
  sellerPhotoURL: string | null;
};

export async function createListing(input: NewListingInput): Promise<string> {
  const newDocRef = doc(listingsRef);
  const images = await uploadListingImages(newDocRef.id, input.localImageUris);
  await setDoc(newDocRef, {
    title: input.title,
    description: input.description,
    price: input.price,
    category: input.category,
    condition: input.condition,
    images,
    location: input.location,
    sellerId: input.sellerId,
    sellerName: input.sellerName,
    sellerPhotoURL: input.sellerPhotoURL,
    createdAt: serverTimestamp(),
    status: 'active',
  });
  return newDocRef.id;
}

export async function markListingSold(listingId: string, sellerId: string): Promise<void> {
  await updateDoc(doc(db, 'listings', listingId), { status: 'sold' });
  await updateDoc(doc(db, 'users', sellerId), { salesCount: increment(1) });
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
  await deleteDoc(doc(db, 'listings', id));
  await deleteListingImages(id).catch(() => {});
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
  await setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
