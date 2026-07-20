import { Timestamp, addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from './firebase';
import type { SupportRequestInput } from '../types/support';

// Destek talepleri: reports koleksiyonuyla ayni guvenlik modeli - sadece
// gonderen olusturabilir, kimse okuyup degistiremez. Sadece Firebase
// Console'dan (proje sahibi) incelenir.
export async function createSupportRequest(input: SupportRequestInput): Promise<void> {
  await addDoc(collection(db, 'supportRequests'), {
    ...input,
    status: 'open',
    createdAt: serverTimestamp(),
  });
}

export const DAILY_SUPPORT_REQUEST_LIMIT = 3;

// Spam onlemi: checkListingCreationAllowed ile ayni desen - gunde en fazla
// DAILY_SUPPORT_REQUEST_LIMIT destek talebi gonderilebilir. Istemci tarafi
// bir kontrol, normal kullaniciyi caydirir ama Firestore'a dogrudan yazan
// bir script'i engellemez.
export async function checkSupportRequestAllowed(uid: string): Promise<boolean> {
  const q = query(collection(db, 'supportRequests'), where('uid', '==', uid));
  const snapshot = await getDocs(q);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayCount = snapshot.docs.filter((docSnap) => {
    const createdAt = docSnap.data().createdAt;
    return createdAt instanceof Timestamp && createdAt.toMillis() >= startOfToday.getTime();
  }).length;

  return todayCount < DAILY_SUPPORT_REQUEST_LIMIT;
}
