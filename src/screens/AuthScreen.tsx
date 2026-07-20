import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { showAlert } from '../components/AppAlert';
import { BrandMark } from '../components/BrandMark';
import { PrimaryButton } from '../components/PrimaryButton';
import { Wordmark } from '../components/Wordmark';
import { signInWithGoogle } from '../services/authService';
import { spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export default function AuthScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canGoBack = navigation.canGoBack();

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      if (navigation.canGoBack()) navigation.goBack();
    } catch {
      setError('Google ile giriş yapılamadı. Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  // TODO: Apple Developer üyeliği alınıp expo-apple-authentication
  // yapılandırıldığında gerçek Apple ile giriş buraya bağlanacak.
  const handleAppleSignIn = () => {
    showAlert('Yakında', 'Apple ile giriş çok yakında aktif olacak.');
  };

  return (
    <View style={styles.container}>
      {canGoBack && (
        <Pressable
          style={[styles.closeButton, { top: insets.top + spacing.sm }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>
      )}
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <BrandMark size={64} />
          <Wordmark size={34} />
          <Text style={styles.subtitle}>Ücretsiz. Güvenli. Yakınında.</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.buttons}>
          <PrimaryButton
            label="Google ile Giriş Yap"
            variant="outline"
            onPress={handleGoogleSignIn}
            loading={loading}
            icon={<Ionicons name="logo-google" size={18} color={colors.text} />}
          />
          {Platform.OS === 'ios' && (
            <PrimaryButton
              label="Apple ile Giriş Yap"
              variant="navy"
              onPress={handleAppleSignIn}
              icon={<Ionicons name="logo-apple" size={18} color="#fff" />}
            />
          )}
        </View>

        <Text style={styles.terms}>
          Devam ederek Stop82 Kullanım Şartları'nı kabul etmiş olursun.
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeButton: {
      position: 'absolute',
      right: spacing.md,
      zIndex: 1,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    brandBlock: {
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.xxl,
    },
    subtitle: {
      ...typography.subhead,
      color: colors.textMuted,
    },
    buttons: {
      gap: spacing.sm,
    },
    error: {
      color: colors.error,
      fontSize: 13,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    terms: {
      ...typography.caption,
      color: colors.textFaint,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });
}
