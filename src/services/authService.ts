import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
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
  let response;
  try {
    response = await GoogleSignin.signIn();
  } catch (err: any) {
    // Kullanici hesap secme ekranindan geri cikarsa bu bir hata degil -
    // Apple tarafindaki ERR_REQUEST_CANCELED ile ayni koda esitleyip
    // AuthScreen'in tek bir yerden, sessizce gecmesini sagliyoruz.
    if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
      throw Object.assign(new Error('İptal edildi.'), { code: 'ERR_REQUEST_CANCELED' });
    }
    throw err;
  }
  if (response.type !== 'success' || !response.data.idToken) {
    throw new Error('Google girişi tamamlanamadı.');
  }
  const credential = GoogleAuthProvider.credential(response.data.idToken);
  return signInWithCredential(auth, credential);
}

// Apple sadece kullanicinin ILK Apple ile girisinde ad bilgisini verir,
// sonraki girislerde fullName alani hep bos gelir - o yuzden Firebase
// profiline sadece o ilk seferde, displayName henuz yoksa yaziyoruz.
async function signInWithAppleIOS() {
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

// Android'de iOS'un native "Apple ile giris" ekrani yok - bunun yerine
// tarayici tabanli OAuth akisi kullanilir: Apple'in yetkilendirme
// sayfasini acariz, Apple sonucu POST ile appleAuthCallback Cloud
// Function'ina gonderir, o da ozel bir uygulama linkine (stop82://)
// yonlendirir, biz de oradan id_token'i okuyup Firebase'e teslim ederiz.
// APPLE_SERVICES_ID, Apple Developer hesabinda ayrica olusturulacak bir
// "Services ID" degeri - hesap aktiflesince buraya girilecek.
const APPLE_SERVICES_ID = process.env.EXPO_PUBLIC_APPLE_SERVICES_ID;
const APPLE_AUTH_CALLBACK_URL = 'https://europe-west1-stop82-d19c6.cloudfunctions.net/appleAuthCallback';
const APP_AUTH_REDIRECT = 'stop82://auth-callback';

async function signInWithAppleAndroid() {
  if (!APPLE_SERVICES_ID) {
    throw new Error('Apple ile giriş şu anda yapılandırılmıyor, birazdan tekrar dene.');
  }
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const authUrl =
    'https://appleid.apple.com/auth/authorize?' +
    new URLSearchParams({
      client_id: APPLE_SERVICES_ID,
      redirect_uri: APPLE_AUTH_CALLBACK_URL,
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email',
      state,
    }).toString();

  const result = await WebBrowser.openAuthSessionAsync(authUrl, APP_AUTH_REDIRECT);
  if (result.type !== 'success' || !result.url) {
    // Kullanici tarayiciyi kendi kapatirsa (cancel/dismiss) bu bir hata
    // degil - iOS'taki ERR_REQUEST_CANCELED ile ayni koda esleyip
    // AuthScreen'in zaten sessizce gectigi yolu kullaniyoruz.
    if (result.type === 'cancel' || result.type === 'dismiss') {
      const cancelError = Object.assign(new Error('İptal edildi.'), { code: 'ERR_REQUEST_CANCELED' });
      throw cancelError;
    }
    throw new Error('Apple girişi tamamlanamadı.');
  }

  const query = result.url.split('?')[1] ?? '';
  const params = new URLSearchParams(query);
  const idToken = params.get('id_token');
  if (!idToken || params.get('state') !== state) {
    throw new Error('Apple girişi doğrulanamadı.');
  }

  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = provider.credential({ idToken });
  const signInResult = await signInWithCredential(auth, firebaseCredential);

  const userField = params.get('user');
  if (userField && !signInResult.user.displayName) {
    try {
      const parsed = JSON.parse(userField);
      const displayName = [parsed?.name?.firstName, parsed?.name?.lastName].filter(Boolean).join(' ');
      if (displayName) await updateProfile(signInResult.user, { displayName });
    } catch {
      // Apple'dan beklenmeyen bir format gelirse ad atlanir, giris yine de tamamlanir.
    }
  }
  return signInResult;
}

export async function signInWithApple() {
  return Platform.OS === 'ios' ? signInWithAppleIOS() : signInWithAppleAndroid();
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
