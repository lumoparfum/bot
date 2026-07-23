import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { showAlert } from './AppAlert';
import { PrefixInput } from './PrefixInput';
import { PrimaryButton } from './PrimaryButton';
import { formatNumberInput } from '../utils/format';

// Ust siniri olmadan "1000000000000000300000000" gibi anlamsiz tekliflerin
// gonderilip kabul edilebilmesi bir gercek bug'di - ikinci el pazarinda hicbir
// urun bu rakama yaklasmaz bile, 100 milyon TL zaten cok comert bir tavan.
const MAX_OFFER_AMOUNT = 100_000_000;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  title?: string;
  submitLabel?: string;
};

export function OfferModal({
  visible,
  onClose,
  onSubmit,
  title = 'Teklif Ver',
  submitLabel = 'Teklifi Gönder',
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setAmount('');
    onClose();
  };

  const handleSubmit = async () => {
    const value = Number(amount);
    if (!value || value <= 0 || submitting) return;
    if (value > MAX_OFFER_AMOUNT) {
      showAlert('Geçersiz Tutar', `Teklif en fazla ₺${MAX_OFFER_AMOUNT.toLocaleString('tr-TR')} olabilir.`);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(value);
      handleClose();
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        showAlert('Teklif gönderilemedi', 'Bu kullanıcıya teklif gönderemiyorsun.');
      } else {
        showAlert('Hata', 'Teklif gönderilemedi, tekrar dene.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <PrefixInput
            prefix="₺"
            value={formatNumberInput(amount)}
            onChangeText={(t) =>
              setAmount(t.replace(/[^0-9]/g, '').slice(0, String(MAX_OFFER_AMOUNT).length))
            }
            placeholder="0"
            keyboardType="number-pad"
          />

          <PrimaryButton
            label={submitLabel}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!amount || Number(amount) <= 0 || Number(amount) > MAX_OFFER_AMOUNT}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(26, 34, 56, 0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.title3,
      color: colors.text,
    },
  });
}
