import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleAuthProvider,
  OAuthProvider,
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

// Apple sadece kullanicinin ILK Apple ile girisinde ad bilgisini verir,
// sonraki girislerde fullName alani hep bos gelir - o yuzden Firebase
// profiline sadece o ilk seferde, displayName henuz yoksa yaziyoruz.
export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error('Apple girişi tamamlanamadı.');
  }
  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = provider.credential({ idToken: credential.identityToken });
  const result = await signInWithCredential(auth, firebaseCredential);

  if (!result.user.displayName && credential.fullName?.givenName) {
    const displayName = [credential.fullName.givenName, credential.fullName.familyName]
      .filter(Boolean)
      .join(' ');
    if (displayName) await updateProfile(result.user, { displayName });
  }
  return result;
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
