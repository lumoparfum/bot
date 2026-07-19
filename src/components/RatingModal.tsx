import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { PrimaryButton } from './PrimaryButton';
import { StarRating } from './StarRating';

type Props = {
  visible: boolean;
  targetName: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
};

export function RatingModal({ visible, targetName, onClose, onSubmit }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setRating(5);
    setComment('');
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{targetName} kullanıcısını değerlendir</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.starsRow}>
            <StarRating value={rating} size={32} onChange={setRating} />
          </View>

          <TextInput
            style={styles.commentInput}
            placeholder="Deneyimini kısaca anlat (opsiyonel)"
            placeholderTextColor={colors.textFaint}
            value={comment}
            onChangeText={setComment}
            multiline
            textAlignVertical="top"
          />

          <PrimaryButton label="Gönder" onPress={handleSubmit} loading={submitting} />
        </View>
      </View>
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
    starsRow: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    commentInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.text,
      minHeight: 80,
    },
  });
}
