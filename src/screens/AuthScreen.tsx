import { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '../components/BrandMark';
import { PrimaryButton } from '../components/PrimaryButton';
import { signInWithGoogle } from '../services/authService';
import { spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function AuthScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setError('Google ile giriş yapılamadı. Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  // TODO: Apple Developer üyeliği alınıp expo-apple-authentication
  // yapılandırıldığında gerçek Apple ile giriş buraya bağlanacak.
  const handleAppleSignIn = () => {
    Alert.alert('Yakında', 'Apple ile giriş çok yakında aktif olacak.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <BrandMark size={64} />
          <Text style={styles.title}>Stop82</Text>
          <Text style={styles.subtitle}>İkinci el, ilk elden fırsat</Text>
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
    title: {
      ...typography.largeTitle,
      color: colors.navy,
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
