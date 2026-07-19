import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type Props = {
  value: number;
  size?: number;
  onChange?: (value: number) => void;
};

export function StarRating({ value, size = 18, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({ row: { flexDirection: 'row', gap: 2 } }), []);
  const rounded = Math.round(value);
  const interactive = !!onChange;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rounded;
        const icon = filled ? 'star' : 'star-outline';
        if (!interactive) {
          return (
            <Ionicons
              key={star}
              name={icon}
              size={size}
              color={filled ? colors.primary : colors.textFaint}
            />
          );
        }
        return (
          <Pressable key={star} onPress={() => onChange?.(star)} hitSlop={4}>
            <Ionicons name={icon} size={size} color={filled ? colors.primary : colors.textFaint} />
          </Pressable>
        );
      })}
    </View>
  );
}
