import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { radius, spacing, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Variant = 'primary' | 'outline' | 'navy';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  icon?: ReactNode;
};

export function PrimaryButton({ label, onPress, disabled, loading, variant = 'primary', icon }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'outline' && styles.outline,
        variant === 'navy' && styles.navy,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && (variant === 'outline' ? styles.outlinePressed : styles.buttonPressed),
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.text : '#fff'} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, variant === 'outline' && styles.outlineLabel]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    button: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    outlinePressed: {
      backgroundColor: colors.surface,
    },
    navy: {
      backgroundColor: colors.navy,
    },
    buttonPressed: {
      backgroundColor: colors.primaryDark,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    label: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    outlineLabel: {
      color: colors.text,
    },
  });
}
