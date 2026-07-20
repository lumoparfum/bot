import { Platform } from 'react-native';

export type ColorPalette = typeof lightColors;

export const lightColors = {
  primary: '#FF6B35',
  primaryDark: '#E24E17',
  primaryLight: '#FFE4D6',

  navy: '#1A2238',
  navyLight: '#2A3455',

  background: '#FFFFFF',
  surface: '#F6F7FB',
  surfaceAlt: '#EFF1F6',

  border: '#E7E8EE',
  divider: '#EDEEF3',

  text: '#1A2238',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnNavy: '#FFFFFF',

  success: '#1FAA59',
  error: '#E4483A',
  warning: '#F5A623',
};

// Vurgu rengi (accent) - kullanicinin Ayarlar'dan secebilecegi tercih.
// BrandMark/Wordmark BILEREK lightColors.primary'yi sabit kullaniyor (marka
// rengi turuncu kalsin diye) - bu yuzden lightColors/darkColors'in kendisini
// degistirmek yerine applyAccent ile SADECE useTheme() uzerinden gelen
// colors objesinde primary/primaryDark/primaryLight'i degistiriyoruz.
export type AccentKey = 'orange' | 'rose' | 'gold';

export const ACCENT_LABELS: Record<AccentKey, string> = {
  orange: 'Turuncu',
  rose: 'Gül',
  gold: 'Altın',
};

// Secim noktasinda kucuk bir renk topu gostermek icin - her zaman "acik"
// (light mode) tondaki primary kullanilir, tema koyu/acik farketmeksizin
// ayni renk noktasi tutarli gorunsun diye.
export const ACCENT_SWATCHES: Record<AccentKey, string> = {
  orange: '#FF6B35',
  rose: '#E8547A',
  gold: '#C9932E',
};

type AccentOverride = { primary: string; primaryDark: string; primaryLight: string };

const ACCENT_OVERRIDES: Record<AccentKey, { light: AccentOverride; dark: AccentOverride }> = {
  orange: {
    light: { primary: '#FF6B35', primaryDark: '#E24E17', primaryLight: '#FFE4D6' },
    dark: { primary: '#FF7A47', primaryDark: '#FF6B35', primaryLight: '#3A2418' },
  },
  rose: {
    light: { primary: '#E8547A', primaryDark: '#C93862', primaryLight: '#FBDCE0' },
    dark: { primary: '#F2708F', primaryDark: '#E8547A', primaryLight: '#3A1F28' },
  },
  gold: {
    light: { primary: '#C9932E', primaryDark: '#A6741C', primaryLight: '#F7E8C9' },
    dark: { primary: '#D9A94A', primaryDark: '#C9932E', primaryLight: '#332A16' },
  },
};

export function applyAccent(base: ColorPalette, isDark: boolean, accent: AccentKey): ColorPalette {
  if (accent === 'orange') return base;
  return { ...base, ...ACCENT_OVERRIDES[accent][isDark ? 'dark' : 'light'] };
}

export const darkColors: ColorPalette = {
  primary: '#FF7A47',
  primaryDark: '#FF6B35',
  primaryLight: '#3A2418',

  navy: '#2A3455',
  navyLight: '#3A4568',

  background: '#12151F',
  surface: '#1B1F2C',
  surfaceAlt: '#242A3A',

  border: '#2C3242',
  divider: '#262C3B',

  text: '#F2F3F7',
  textMuted: '#9AA3B8',
  textFaint: '#6B7386',
  textOnPrimary: '#FFFFFF',
  textOnNavy: '#FFFFFF',

  success: '#34C77B',
  error: '#FF6B60',
  warning: '#F7B84B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

// Loosely mirrors Apple's HIG type scale so the app reads like a native iOS
// app rather than a generic cross-platform one.
export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.2 },
  title1: { fontSize: 28, fontWeight: '700' as const },
  title2: { fontSize: 22, fontWeight: '700' as const },
  title3: { fontSize: 20, fontWeight: '600' as const },
  headline: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  subhead: { fontSize: 15, fontWeight: '400' as const },
  footnote: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

// Soft, native-feeling elevation. Spread across shadow* (iOS) and elevation
// (Android) since RN doesn't unify the two. Kept identical across themes —
// shadows read fine on both light and dark surfaces at this opacity.
export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
    },
    android: { elevation: 3 },
    default: {},
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  }),
};
