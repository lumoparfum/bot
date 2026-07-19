import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import type { AppNotification } from '../types/notification';

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : Date.now();
}

function mapNotification(id: string, data: DocumentData): AppNotification {
  return {
    id,
    type: data.type,
    title: data.title,
    body: data.body,
    listingId: data.listingId ?? null,
    listingImage: data.listingImage ?? null,
    conversationId: data.conversationId ?? null,
    fromUserId: data.fromUserId,
    fromUserName: data.fromUserName,
    fromUserPhoto: data.fromUserPhoto ?? null,
    read: data.read ?? false,
    createdAt: toMillis(data.createdAt),
  };
}

export function subscribeToNotifications(
  uid: string,
  callback: (notifications: AppNotification[]) => void
): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => mapNotification(d.id, d.data())));
  });
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), { read: true });
}

export async function markAllNotificationsRead(
  uid: string,
  notifications: AppNotification[]
): Promise<void> {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  const batch = writeBatch(db);
  unread.forEach((n) => {
    batch.update(doc(db, 'users', uid, 'notifications', n.id), { read: true });
  });
  await batch.commit();
}
