import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { ReportInput } from '../types/report';

// Sikayetler kalici bir kayit - ilan/yorum sahibi tarafindan gorulemez ya da
// silinemez, sadece Firebase Console'dan (proje sahibi) incelenebilir.
export async function submitReport(input: ReportInput): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    ...input,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}
