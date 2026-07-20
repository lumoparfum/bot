import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  await setDoc(doc(db, 'users', blockerId, 'blockedUsers', blockedId), {
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', blockerId, 'blockedUsers', blockedId));
}

export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', blockerId, 'blockedUsers', blockedId));
  return snap.exists();
}

// Engellenen kullanicilarin ilanlari ana akista gorunmesin diye - sadece
// mesajlasmayi degil, icerigi de gizlemek "engelleme" hissini tamamliyor.
export async function fetchBlockedUserIds(uid: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'blockedUsers'));
  return snap.docs.map((d) => d.id);
}
