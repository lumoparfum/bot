import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function CategoryChip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && styles.chipPressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  chipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  labelSelected: {
    color: '#fff',
  },
});
