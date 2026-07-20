import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { signOutUser } from '../services/authService';
import { ensureUserProfile } from '../services/firestore';
import { registerForPushNotificationsAsync, savePushToken } from '../services/notifications';

function touchLastActive(uid: string) {
  updateDoc(doc(db, 'users', uid), { lastActiveAt: serverTimestamp() }).catch(() => {});
}

type AuthContextValue = {
  isAuthenticated: boolean;
  user: User | null;
  initializing: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
      if (firebaseUser) {
        ensureUserProfile(firebaseUser.uid, {
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        }).catch(() => {});
        registerForPushNotificationsAsync()
          .then((token) => {
            if (token) return savePushToken(firebaseUser.uid, token);
          })
          .catch(() => {});
      }
    });
    return unsubscribe;
  }, []);

  // "Son gorulme" rozeti icin - uygulama on plana her donduğunde (soguk
  // acilis onAuthStateChanged ile zaten kapsanir) tazelenir.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && auth.currentUser) {
        touchLastActive(auth.currentUser.uid);
      }
    });
    return () => subscription.remove();
  }, []);

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser } as User);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: user !== null,
      user,
      initializing,
      signOut: signOutUser,
      refreshUser,
    }),
    [user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
