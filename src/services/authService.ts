import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success' || !response.data.idToken) {
    throw new Error('Google girişi tamamlanamadı.');
  }
  const credential = GoogleAuthProvider.credential(response.data.idToken);
  return signInWithCredential(auth, credential);
}

export async function updateDisplayName(name: string) {
  if (!auth.currentUser) return;
  await updateProfile(auth.currentUser, { displayName: name });
}

export async function updateProfilePhoto(photoURL: string) {
  if (!auth.currentUser) return;
  await updateProfile(auth.currentUser, { photoURL });
}

export async function signOutUser() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Kullanıcı Google ile giriş yapmadıysa (ör. ileride Apple ile girdiyse) sorun değil.
  }
  await firebaseSignOut(auth);
}
