import { Pressable, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { colors, shadows } from '../constants/theme';

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

const styles = StyleSheet.create({
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
