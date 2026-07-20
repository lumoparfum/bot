import { Timestamp, addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import type { BusinessRequest } from '../types/business';

function mapRequest(id: string, data: DocumentData): BusinessRequest {
  return {
    id,
    uid: data.uid,
    companyName: data.companyName,
    description: data.description,
    status: data.status,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
  };
}

// Isletme hesabi basvurusu - Stop82 ekibi Firebase Console'dan inceleyip
// status'u 'approved'/'rejected' yapana kadar 'pending' kalir. Onaylanirsa
// bir Cloud Function otomatik olarak users/{uid}.accountType'i gunceller.
export async function submitBusinessRequest(
  uid: string,
  companyName: string,
  description: string
): Promise<void> {
  await addDoc(collection(db, 'businessRequests'), {
    uid,
    companyName: companyName.trim(),
    description: description.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function fetchLatestBusinessRequest(uid: string): Promise<BusinessRequest | null> {
  const q = query(collection(db, 'businessRequests'), where('uid', '==', uid));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const requests = snapshot.docs.map((d) => mapRequest(d.id, d.data()));
  requests.sort((a, b) => b.createdAt - a.createdAt);
  return requests[0];
}
