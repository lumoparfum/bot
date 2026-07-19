import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Sunucu tarafinda (Cloud Function) kullanicinin ilanlarini, fotograflarini,
// favorilerini, degerlendirmelerini, bildirimlerini ve Auth hesabini
// tamamen siler. Basarili donusten sonra client tarafinda ayrica signOut
// cagirmak gerekir (Auth oturumu yerelde hala "acik" gorunebilir).
export async function deleteAccount(): Promise<void> {
  const call = httpsCallable(functions, 'deleteAccount');
  await call();
}
