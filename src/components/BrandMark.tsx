import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '../constants/theme';

type Props = {
  size?: number;
};

export function BrandMark({ size = 36 }: Props) {
  const fontSize = size * 0.46;

  return (
    <View
      style={[
        styles.mark,
        shadows.card,
        { width: size, height: size, borderRadius: size * 0.1091 },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize,
            letterSpacing: -fontSize * 0.0217,
            transform: [{ translateY: -fontSize * 0.0293 }],
          },
        ]}
      >
        82
      </Text>
      <LinearGradient
        colors={[colors.primary, colors.primary, 'rgba(255, 107, 53, 0.25)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          width: fontSize * 0.5735,
          height: fontSize * 0.0293,
          marginTop: fontSize * 0.0589,
          borderRadius: 999,
        }}
      />
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
