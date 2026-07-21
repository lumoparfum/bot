import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, orkideColors, type ColorPalette } from '../constants/theme';

// 'orkide', Sistem/Acik/Koyu'nun disinda TAM bagimsiz dorduncu bir tema -
// isDark'a bagli degil, kendi sabit renk paletini kullanir.
export type ThemeMode = 'system' | 'light' | 'dark' | 'orkide';

const STORAGE_KEY = 'stop82.themeMode';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system' || saved === 'orkide') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  // Orkide acik bir tema (koyu statu bar/nav degil) - status bar/react
  // navigation tema secimi buna gore isDark'i false okur.
  const isDark = mode === 'orkide' ? false : mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = mode === 'orkide' ? orkideColors : isDark ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark,
      colors,
      setMode,
    }),
    [mode, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
