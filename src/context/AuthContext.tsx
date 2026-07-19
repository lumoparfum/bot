import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type AuthContextValue = {
  isAuthenticated: boolean;
  phoneNumber: string | null;
  signIn: (phoneNumber: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Holds auth state in memory only. Real Firebase phone-auth verification
// isn't wired yet (see src/services/authService.ts) — once it is, signIn
// should be called with the verified Firebase user instead of a raw string.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: phoneNumber !== null,
      phoneNumber,
      signIn: (phone: string) => setPhoneNumber(phone),
      signOut: () => setPhoneNumber(null),
    }),
    [phoneNumber]
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
