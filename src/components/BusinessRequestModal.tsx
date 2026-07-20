import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from './AppAlert';
import { PrimaryButton } from './PrimaryButton';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (companyName: string, description: string) => Promise<void>;
};

export function BusinessRequestModal({ visible, onClose, onSubmit }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = companyName.trim().length >= 2 && description.trim().length >= 10;

  const handleClose = () => {
    setCompanyName('');
    setDescription('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(companyName, description);
      handleClose();
      showAlert(
        'Başvurun Alındı',
        'Stop82 ekibi başvurunu inceleyecek. Sonucu Ayarlar sayfasından ve bildirimlerden takip edebilirsin.'
      );
    } catch {
      showAlert('Hata', 'Başvuru gönderilemedi, tekrar dene.');
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
            <Text style={styles.title}>İşletme Hesabı Başvurusu</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Bilgiler Stop82 ekibi tarafından incelenir. Onaylanırsa profilinde "İşletme" rozeti
            görünür. Yanlış ya da yanıltıcı bilgi vermenin sorumluluğu tamamen sana aittir.
          </Text>

          <Text style={styles.label}>Firma Adı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn. Stop82 Elektronik Ltd. Şti."
            placeholderTextColor={colors.textFaint}
            value={companyName}
            onChangeText={setCompanyName}
          />

          <Text style={styles.label}>Ne İş Yapıyorsunuz?</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Kısaca firmanı ve ne sattığını anlat..."
            placeholderTextColor={colors.textFaint}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <PrimaryButton
            label="Başvuruyu Gönder"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
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
      flex: 1,
      marginRight: spacing.sm,
    },
    hint: {
      ...typography.caption,
      color: colors.textFaint,
      lineHeight: 17,
      marginTop: -spacing.sm,
    },
    label: {
      ...typography.footnote,
      fontWeight: '600',
      color: colors.textMuted,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.text,
    },
    textArea: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.text,
      minHeight: 90,
    },
  });
}
