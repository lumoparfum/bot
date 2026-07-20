import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import type { Review, UserRatingSummary } from '../types/review';

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : Date.now();
}

function mapReview(id: string, data: DocumentData): Review {
  return {
    id,
    raterId: data.raterId,
    raterName: data.raterName,
    raterPhotoURL: data.raterPhotoURL ?? null,
    rating: data.rating,
    comment: data.comment ?? '',
    createdAt: toMillis(data.createdAt),
  };
}

// Sadece bu saticidan onayli bir alisveris yapmis (satici "satildi" derken
// secmis) kullanicilar degerlendirme birakabilir - fake/rastgele yorum onlemi.
export async function hasPurchasedFrom(buyerId: string, sellerId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', sellerId, 'buyers', buyerId));
  return snap.exists();
}

export async function fetchUserRatingSummary(uid: string): Promise<UserRatingSummary> {
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.data();
  return {
    ratingSum: data?.ratingSum ?? 0,
    ratingCount: data?.ratingCount ?? 0,
    salesCount: data?.salesCount ?? 0,
    contactedCount: data?.contactedCount ?? 0,
    responseCount: data?.responseCount ?? 0,
    responseTimeTotalMinutes: data?.responseTimeTotalMinutes ?? 0,
    accountType: data?.accountType === 'business' ? 'business' : 'individual',
    createdAt: data?.createdAt instanceof Timestamp ? data.createdAt.toMillis() : null,
    lastActiveAt: data?.lastActiveAt instanceof Timestamp ? data.lastActiveAt.toMillis() : null,
  };
}

export async function fetchUserReviews(uid: string): Promise<Review[]> {
  const q = query(collection(db, 'users', uid, 'reviews'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapReview(d.id, d.data()));
}

export async function submitReview(params: {
  ratedUserId: string;
  raterId: string;
  raterName: string;
  raterPhotoURL: string | null;
  rating: number;
  comment: string;
}): Promise<void> {
  const userRef = doc(db, 'users', params.ratedUserId);
  const reviewRef = doc(db, 'users', params.ratedUserId, 'reviews', params.raterId);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const reviewSnap = await tx.get(reviewRef);

    const prevRating = reviewSnap.exists() ? (reviewSnap.data().rating as number) : 0;
    const currentSum = userSnap.data()?.ratingSum ?? 0;
    const currentCount = userSnap.data()?.ratingCount ?? 0;

    const newSum = currentSum - prevRating + params.rating;
    const newCount = reviewSnap.exists() ? currentCount : currentCount + 1;

    tx.set(
      reviewRef,
      {
        raterId: params.raterId,
        raterName: params.raterName,
        raterPhotoURL: params.raterPhotoURL,
        rating: params.rating,
        comment: params.comment.trim(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    tx.set(userRef, { ratingSum: newSum, ratingCount: newCount }, { merge: true });
  });
}
