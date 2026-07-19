import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

type Props = {
  size?: number;
};

export function BrandMark({ size = 36 }: Props) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Text style={[styles.text, { fontSize: size * 0.46 }]}>82</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.primary,
    fontWeight: '900',
  },
});
