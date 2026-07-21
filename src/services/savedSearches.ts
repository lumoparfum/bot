import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import type { SavedSearch } from '../types/savedSearch';

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : Date.now();
}

function mapSavedSearch(id: string, data: DocumentData): SavedSearch {
  return {
    id,
    uid: data.uid,
    query: data.query ?? '',
    category: data.category ?? null,
    subcategory: data.subcategory ?? null,
    attributes: data.attributes ?? {},
    minPrice: data.minPrice ?? null,
    maxPrice: data.maxPrice ?? null,
    createdAt: toMillis(data.createdAt),
  };
}

export async function createSavedSearch(params: {
  uid: string;
  query: string;
  category: string | null;
  subcategory: string | null;
  attributes: Record<string, string>;
  minPrice: number | null;
  maxPrice: number | null;
}): Promise<void> {
  await addDoc(collection(db, 'savedSearches'), {
    ...params,
    createdAt: serverTimestamp(),
  });
}

export async function fetchSavedSearches(uid: string): Promise<SavedSearch[]> {
  // Not: composite index gerekmesin diye orderBy burada yapilmiyor,
  // sonuc az sayida oldugu icin JS tarafinda sirala.
  const q = query(collection(db, 'savedSearches'), where('uid', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapSavedSearch(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSavedSearch(id: string): Promise<void> {
  await deleteDoc(doc(db, 'savedSearches', id));
}
