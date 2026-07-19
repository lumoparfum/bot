import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';
import { spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useRequireAuth } from '../hooks/useRequireAuth';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
};

export function GuestPrompt({ icon, title, message }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const requireAuth = useRequireAuth();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.textFaint} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.button}>
        <PrimaryButton label="Giriş Yap" onPress={() => requireAuth()} />
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    title: {
      ...typography.headline,
      color: colors.text,
      marginTop: spacing.sm,
    },
    message: {
      ...typography.subhead,
      color: colors.textMuted,
      textAlign: 'center',
    },
    button: {
      marginTop: spacing.lg,
      width: '100%',
    },
  });
}
