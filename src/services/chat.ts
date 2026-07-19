import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import type { ChatMessage, Conversation } from '../types/chat';

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : Date.now();
}

function mapConversation(id: string, data: DocumentData): Conversation {
  return {
    id,
    listingId: data.listingId,
    listingTitle: data.listingTitle,
    listingImage: data.listingImage ?? null,
    participantIds: data.participantIds ?? [],
    buyerId: data.buyerId,
    buyerName: data.buyerName,
    buyerPhotoURL: data.buyerPhotoURL ?? null,
    sellerId: data.sellerId,
    sellerName: data.sellerName,
    sellerPhotoURL: data.sellerPhotoURL ?? null,
    lastMessage: data.lastMessage ?? '',
    lastMessageAt: toMillis(data.lastMessageAt),
    lastSenderId: data.lastSenderId ?? '',
    unreadCount: data.unreadCount ?? {},
  };
}

function mapMessage(id: string, data: DocumentData): ChatMessage {
  return {
    id,
    senderId: data.senderId,
    text: data.text,
    createdAt: toMillis(data.createdAt),
  };
}

function conversationDocId(listingId: string, buyerId: string): string {
  return `${listingId}_${buyerId}`;
}

export async function getOrCreateConversation(params: {
  listingId: string;
  listingTitle: string;
  listingImage: string | null;
  sellerId: string;
  sellerName: string;
  sellerPhotoURL: string | null;
  buyerId: string;
  buyerName: string;
  buyerPhotoURL: string | null;
}): Promise<string> {
  const id = conversationDocId(params.listingId, params.buyerId);
  const ref = doc(db, 'conversations', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      listingId: params.listingId,
      listingTitle: params.listingTitle,
      listingImage: params.listingImage,
      participantIds: [params.buyerId, params.sellerId],
      buyerId: params.buyerId,
      buyerName: params.buyerName,
      buyerPhotoURL: params.buyerPhotoURL,
      sellerId: params.sellerId,
      sellerName: params.sellerName,
      sellerPhotoURL: params.sellerPhotoURL,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastSenderId: '',
      unreadCount: { [params.buyerId]: 0, [params.sellerId]: 0 },
    });
  }
  return id;
}

export function subscribeToConversations(
  uid: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  const q = query(collection(db, 'conversations'), where('participantIds', 'array-contains', uid));
  return onSnapshot(q, (snapshot) => {
    // Henuz hic mesaj gonderilmemis (sadece "Mesaj Gonder"e dokunulup acilmis)
    // sohbetler listede "bos" olarak gorunmesin.
    const list = snapshot.docs
      .map((d) => mapConversation(d.id, d.data()))
      .filter((c) => c.lastMessage !== '');
    list.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    callback(list);
  });
}

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => mapMessage(d.id, d.data())));
  });
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  recipientId: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
    [`unreadCount.${recipientId}`]: increment(1),
  });
}

export async function markConversationRead(conversationId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`unreadCount.${uid}`]: 0,
  });
}
