import { Platform } from 'react-native';

export const colors = {
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
// (Android) since RN doesn't unify the two.
export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#141B33',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: { elevation: 3 },
    default: {},
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#141B33',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  }),
};
