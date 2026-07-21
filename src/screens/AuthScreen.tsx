import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandMark } from '../components/BrandMark';
import { PrimaryButton } from '../components/PrimaryButton';
import { Wordmark } from '../components/Wordmark';
import { signInWithApple, signInWithGoogle } from '../services/authService';
import { spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export default function AuthScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  // Ayri durumlar - ikisi de ayni "loading" degiskenini paylasirsa, birine
  // basinca iki buton da donmeye basliyordu.
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canGoBack = navigation.canGoBack();

  // authService.ts icinde bilerek firlatilan (Firebase/native SDK hatasi
  // olmayan, .code alani tasimayan) hatalar zaten anlasilir Turkce mesaj
  // iceriyor - o zaman genel mesajla ezmek yerine oldugu gibi gosteriyoruz.
  const messageFor = (err: any, fallback: string) =>
    !err?.code && typeof err?.message === 'string' ? err.message : fallback;

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      if (navigation.canGoBack()) navigation.goBack();
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        // GECICI TESHIS: bkz. handleAppleSignIn - ayni sebeple gercek hata
        // kodu/mesaji goruntuye ekleniyor.
        const debugSuffix = ` [${err?.code ?? 'no-code'}: ${err?.message ?? 'no-message'}]`;
        setError(messageFor(err, 'Google ile giriş yapılamadı. Lütfen tekrar dene.') + debugSuffix);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setAppleLoading(true);
    try {
      await signInWithApple();
      if (navigation.canGoBack()) navigation.goBack();
    } catch (err: any) {
      // Kullanici kendi vazgecip iptal ederse (ERR_REQUEST_CANCELED) sessizce
      // cik - bu bir hata degil, kullanicinin kendi tercihi.
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        // GECICI TESHIS: gercek hata kodu/mesaji goruntuye ekleniyor - Apple
        // girisindeki gizemli hatanin gercek sebebini gormek icin. Sebep
        // bulununca bu satir kaldirilacak.
        const debugSuffix = ` [${err?.code ?? 'no-code'}: ${err?.message ?? 'no-message'}]`;
        setError(messageFor(err, 'Apple ile giriş yapılamadı. Lütfen tekrar dene.') + debugSuffix);
      }
    } finally {
      setAppleLoading(false);
    }
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
            loading={googleLoading}
            disabled={appleLoading}
            icon={<Ionicons name="logo-google" size={18} color={colors.text} />}
          />
          <PrimaryButton
            label="Apple ile Giriş Yap"
            variant="navy"
            onPress={handleAppleSignIn}
            loading={appleLoading}
            disabled={googleLoading}
            icon={<Ionicons name="logo-apple" size={18} color="#fff" />}
          />
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
