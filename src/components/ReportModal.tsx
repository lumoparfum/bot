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
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { showAlert } from './AppAlert';
import { CategoryChip } from './CategoryChip';
import { PrimaryButton } from './PrimaryButton';
import type { ReportType } from '../types/report';

const REASON_OPTIONS: Record<ReportType, string[]> = {
  listing: ['Sahte İlan', 'Dolandırıcılık', 'Yanlış Kategori', 'Uygunsuz İçerik', 'Diğer'],
  user: ['Dolandırıcılık', 'Küfür/Hakaret', 'Sahte Profil', 'Diğer'],
  comment: ['Küfür/Hakaret', 'Spam', 'Yanıltıcı Bilgi', 'Diğer'],
};

type Props = {
  visible: boolean;
  title: string;
  reportType: ReportType;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export function ReportModal({ visible, title, reportType, onClose, onSubmit }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requiresDetail = selectedReason === 'Diğer';
  const canSubmit = !!selectedReason && (!requiresDetail || detail.trim().length > 0);

  const handleClose = () => {
    setSelectedReason(null);
    setDetail('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting || !selectedReason) return;
    const finalReason = detail.trim() ? `${selectedReason}: ${detail.trim()}` : selectedReason;
    setSubmitting(true);
    try {
      await onSubmit(finalReason);
      handleClose();
      showAlert('Teşekkürler', 'Şikayetin bize ulaştı, inceleyeceğiz.');
    } catch {
      showAlert('Hata', 'Şikayet gönderilemedi, tekrar dene.');
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

          <Text style={styles.label}>Sebep seç</Text>
          <View style={styles.chipWrap}>
            {REASON_OPTIONS[reportType].map((option) => (
              <CategoryChip
                key={option}
                label={option}
                selected={selectedReason === option}
                onPress={() => setSelectedReason(option)}
              />
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder={
              requiresDetail ? 'Lütfen kısaca açıkla...' : 'Ek detay eklemek istersen yazabilirsin (opsiyonel)'
            }
            placeholderTextColor={colors.textFaint}
            value={detail}
            onChangeText={setDetail}
            multiline
            textAlignVertical="top"
          />

          <PrimaryButton
            label="Şikayet Gönder"
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
    label: {
      ...typography.footnote,
      fontWeight: '600',
      color: colors.textMuted,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.text,
      minHeight: 70,
    },
  });
}
