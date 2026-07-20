// Ayni Firebase projesi (mobil uygulamanin kullandigi) - client config
// gizli degildir, erisim kontrolu Firestore guvenlik kurallariyla saglanir.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBxxFqxmPLG7u40KYcdCQFXOxWDNzTO8HA',
  authDomain: 'stop82-d19c6.firebaseapp.com',
  projectId: 'stop82-d19c6',
  storageBucket: 'stop82-d19c6.firebasestorage.app',
  messagingSenderId: '83899072995',
  appId: '1:83899072995:web:8cd2af0fb8e10ec89b60d6',
  measurementId: 'G-BZFEGD3LG2',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.stop82Waitlist = async function stop82Waitlist(email) {
  await addDoc(collection(db, 'waitlist'), {
    email,
    createdAt: serverTimestamp(),
    source: 'web',
  });
};
