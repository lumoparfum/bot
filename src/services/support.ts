import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
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
