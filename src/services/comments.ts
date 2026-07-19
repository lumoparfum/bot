import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import type { ListingComment } from '../types/comment';

// Kucuk bir kufur/hakaret listesi - istemci tarafinda ilk savunma hatti.
// Kesin/tam kapsamli degil, kaba spam'i ve acik hakareti engellemek icin.
const BANNED_WORDS = [
  'amk',
  'aq',
  'orospu',
  'piç',
  'yavşak',
  'göt herif',
  'siktir',
  'ibne',
  'pezevenk',
  'şerefsiz',
];

export function containsBannedWord(text: string): boolean {
  const normalized = text.toLocaleLowerCase('tr-TR');
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : Date.now();
}

function mapComment(id: string, data: DocumentData): ListingComment {
  return {
    id,
    authorId: data.authorId,
    authorName: data.authorName,
    authorPhoto: data.authorPhoto ?? null,
    text: data.text,
    hidden: data.hidden ?? false,
    createdAt: toMillis(data.createdAt),
  };
}

export function subscribeToComments(
  listingId: string,
  callback: (comments: ListingComment[]) => void
): Unsubscribe {
  const q = query(collection(db, 'listings', listingId, 'comments'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => mapComment(d.id, d.data())).filter((c) => !c.hidden)
    );
  });
}

export async function addComment(
  listingId: string,
  authorId: string,
  authorName: string,
  authorPhoto: string | null,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, 'listings', listingId, 'comments'), {
    authorId,
    authorName,
    authorPhoto,
    text: trimmed,
    hidden: false,
    createdAt: serverTimestamp(),
  });
}

// Yorum veritabanindan silinmez, sadece herkesten gizlenir - boylece bir
// sikayet/kanit izi kalir. Sadece ilan sahibi cagirabilir (Firestore kurali).
export async function hideComment(listingId: string, commentId: string): Promise<void> {
  await updateDoc(doc(db, 'listings', listingId, 'comments', commentId), { hidden: true });
}

export async function deleteOwnComment(listingId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'listings', listingId, 'comments', commentId));
}
