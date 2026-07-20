import { Text } from 'react-native';
import type { TextStyle } from 'react-native';
import { lightColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

// Kutu olmadan "Stop82" yazi markasi - "82" kismi markanin sabit turuncusuyla
// vurgulanir (n11.com'daki gibi: harfler notr, rakam vurgulu). BrandMark
// (kutulu ikon) uygulama ikonu/splash gibi tek basina bir mark gereken
// yerlerde kalir; bu, ekran ici baslik olarak kullanilir.
type Props = {
  size?: number;
};

export function Wordmark({ size = 22 }: Props) {
  const { colors } = useTheme();
  const style: TextStyle = {
    fontSize: size,
    fontWeight: '800',
    letterSpacing: -size * 0.02,
    color: colors.text,
  };

  return (
    <Text style={style}>
      Stop
      <Text style={{ color: lightColors.primary }}>82</Text>
    </Text>
  );
}
