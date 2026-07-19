import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
// @ts-expect-error - getReactNativePersistence exists at runtime in the RN
// build (@firebase/auth/dist/rn), but the package's "exports" map lists a
// platform-agnostic `types` condition ahead of `react-native`, so TS always
// resolves the web typings and doesn't see it. Known upstream packaging gap.
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase config values come from environment variables so keys never get
// hardcoded into source control. See .env.example for the required keys.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Native platforms need an explicit AsyncStorage-backed persistence layer;
// web falls back to the SDK's default (IndexedDB) persistence.
export const auth =
  Platform.OS === 'web'
    ? getAuth(firebaseApp)
    : initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
