import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { shadows, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'light' | 'translucent';
  size?: number;
  accessibilityLabel?: string;
};

export function IconButton({
  children,
  onPress,
  variant = 'light',
  size = 38,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'light' ? styles.light : styles.translucent,
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    light: {
      backgroundColor: colors.background,
      ...shadows.card,
    },
    translucent: {
      backgroundColor: 'rgba(26, 34, 56, 0.45)',
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
