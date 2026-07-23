import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
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
    hiddenFor: data.hiddenFor ?? [],
  };
}

function mapMessage(id: string, data: DocumentData): ChatMessage {
  return {
    id,
    senderId: data.senderId,
    text: data.text,
    createdAt: toMillis(data.createdAt),
    type: data.type ?? 'text',
    offerAmount: data.offerAmount ?? null,
    offerStatus: data.offerStatus ?? null,
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
      hiddenFor: [],
    });
  }
  return id;
}

// Bir ilan icin gercekten mesajlasilmis (bos olmayan) konusmalardaki
// alicilari listeler - satici "satildi" derken "kime sattin" secimi icin.
export async function fetchListingBuyers(
  listingId: string
): Promise<{ buyerId: string; buyerName: string; buyerPhotoURL: string | null }[]> {
  const q = query(collection(db, 'conversations'), where('listingId', '==', listingId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => d.data())
    .filter((c) => c.lastMessage !== '')
    .map((c) => ({
      buyerId: c.buyerId,
      buyerName: c.buyerName,
      buyerPhotoURL: c.buyerPhotoURL ?? null,
    }));
}

export async function fetchConversation(conversationId: string): Promise<Conversation | null> {
  const snap = await getDoc(doc(db, 'conversations', conversationId));
  if (!snap.exists()) return null;
  return mapConversation(snap.id, snap.data());
}

export function subscribeToConversations(
  uid: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  const q = query(collection(db, 'conversations'), where('participantIds', 'array-contains', uid));
  return onSnapshot(q, (snapshot) => {
    // Henuz hic mesaj gonderilmemis (sadece "Mesaj Gonder"e dokunulup acilmis)
    // sohbetler ve kullanicinin kendi listesinden sildigi sohbetler gorunmesin.
    const list = snapshot.docs
      .map((d) => mapConversation(d.id, d.data()))
      .filter((c) => c.lastMessage !== '' && !c.hiddenFor.includes(uid));
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

async function touchConversation(
  conversationId: string,
  senderId: string,
  recipientId: string,
  lastMessage: string
): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage,
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
    [`unreadCount.${recipientId}`]: increment(1),
    // Karsi taraf sohbeti daha once kendi listesinden sildiyse, yeni mesajla
    // birlikte tekrar listesinde gorunsun.
    hiddenFor: arrayRemove(recipientId),
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
    type: 'text',
    offerAmount: null,
    offerStatus: null,
    createdAt: serverTimestamp(),
  });
  await touchConversation(conversationId, senderId, recipientId, trimmed);
}

export async function sendOffer(
  conversationId: string,
  senderId: string,
  recipientId: string,
  amount: number
): Promise<void> {
  const summary = `₺${amount.toLocaleString('tr-TR')} teklif etti`;
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId,
    text: summary,
    type: 'offer',
    offerAmount: amount,
    offerStatus: 'pending',
    createdAt: serverTimestamp(),
  });
  await touchConversation(conversationId, senderId, recipientId, summary);
}

export async function respondToOffer(
  conversationId: string,
  messageId: string,
  status: 'accepted' | 'declined'
): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    offerStatus: status,
  });
}

// Karsi teklif: onceki teklif "countered" olarak isaretlenip artik
// Kabul Et/Reddet gostermiyor, yeni bir "pending" teklif mesaji ekleniyor -
// pazarlik boylece bir zincir gibi ilerliyor (Dolap'taki "Karsi Teklif Ver"
// ile ayni mantik).
export async function sendCounterOffer(
  conversationId: string,
  originalMessageId: string,
  senderId: string,
  recipientId: string,
  amount: number
): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', originalMessageId), {
    offerStatus: 'countered',
  });
  await sendOffer(conversationId, senderId, recipientId, amount);
}

export async function markConversationRead(conversationId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`unreadCount.${uid}`]: 0,
  });
}

export async function deleteConversationForUser(conversationId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), {
    hiddenFor: arrayUnion(uid),
  });
}
