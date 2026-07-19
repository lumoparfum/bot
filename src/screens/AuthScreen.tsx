import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandMark } from '../components/BrandMark';
import { PrefixInput } from '../components/PrefixInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, typography } from '../constants/theme';

type Step = 'phone' | 'otp';

const PHONE_DIGITS_LENGTH = 10; // e.g. 5XX XXX XX XX, without the +90 prefix
const OTP_LENGTH = 6;

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPhoneValid = phoneNumber.replace(/\D/g, '').length === PHONE_DIGITS_LENGTH;
  const isCodeValid = code.length === OTP_LENGTH;

  const handleSendCode = async () => {
    if (!isPhoneValid) {
      setError('Lütfen geçerli bir telefon numarası girin.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // TODO: authService.sendOtp(`+90${digits}`, recaptchaVerifier) burada
      // çağrılacak. reCAPTCHA doğrulayıcısı henüz bağlanmadı (bkz.
      // src/services/authService.ts).
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isCodeValid) {
      setError('Lütfen 6 haneli kodu girin.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // TODO: authService.confirmOtp(confirmationResult, code) burada
      // çağrılacak. Gerçek doğrulama bağlanana kadar girişi burada
      // optimistik olarak tamamlıyoruz ki uygulamanın geri kalanı
      // gezilebilsin.
      signIn(`+90${phoneNumber.replace(/\D/g, '')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <BrandMark size={64} />
          <Text style={styles.title}>Stop82</Text>
        </View>
        <Text style={styles.subtitle}>
          {step === 'phone'
            ? 'Kayıt Ol / Giriş Yap'
            : `+90 ${phoneNumber} numarasına gönderilen kodu girin`}
        </Text>

        {step === 'phone' ? (
          <View style={styles.field}>
            <Text style={styles.label}>Telefon Numarası</Text>
            <PrefixInput
              prefix="+90"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="5XX XXX XX XX"
              keyboardType="phone-pad"
              maxLength={13}
            />
          </View>
        ) : (
          <View style={styles.field}>
            <Text style={styles.label}>Doğrulama Kodu</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              value={code}
              onChangeText={setCode}
            />
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <PrimaryButton
          label={step === 'phone' ? 'Kod Gönder' : 'Doğrula'}
          onPress={step === 'phone' ? handleSendCode : handleVerifyCode}
          loading={loading}
        />

        {step === 'otp' && (
          <Text
            style={styles.changeNumber}
            onPress={() => {
              setStep('phone');
              setCode('');
              setError(null);
            }}
          >
            Numarayı değiştir
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.largeTitle,
    color: colors.navy,
  },
  subtitle: {
    ...typography.subhead,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.footnote,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 10,
    color: colors.text,
    textAlign: 'center',
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  changeNumber: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
