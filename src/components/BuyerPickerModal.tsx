import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Buyer = { buyerId: string; buyerName: string; buyerPhotoURL: string | null };

type Props = {
  visible: boolean;
  buyers: Buyer[];
  onClose: () => void;
  onSelect: (buyerId: string | null) => void;
};

export function BuyerPickerModal({ visible, buyers, onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const handleSelect = (buyerId: string | null) => {
    onSelect(buyerId);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Kime Sattın?</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Bu ilan hakkında seninle mesajlaşan kişilerden alıcıyı seçersen, ilanını değerlendirebilir.
          </Text>

          {buyers.map((buyer) => (
            <Pressable
              key={buyer.buyerId}
              style={styles.row}
              onPress={() => handleSelect(buyer.buyerId)}
            >
              {buyer.buyerPhotoURL ? (
                <Image source={{ uri: buyer.buyerPhotoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{buyer.buyerName.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.rowLabel} numberOfLines={1}>
                {buyer.buyerName}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          ))}

          <Pressable style={styles.row} onPress={() => handleSelect(null)}>
            <View style={styles.avatarFallback}>
              <Ionicons name="help-outline" size={17} color={colors.textMuted} />
            </View>
            <Text style={styles.rowLabel}>Uygulama dışından biri / bilmiyorum</Text>
          </Pressable>
        </Pressable>
      </Pressable>
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
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.title3,
      color: colors.text,
      flex: 1,
      marginRight: spacing.sm,
    },
    hint: {
      ...typography.subhead,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    avatarFallback: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarFallbackText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 14,
    },
    rowLabel: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },
  });
}
