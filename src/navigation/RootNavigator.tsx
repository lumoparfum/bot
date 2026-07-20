import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BrandMark } from '../components/BrandMark';
import { Wordmark } from '../components/Wordmark';
import AuthScreen from '../screens/AuthScreen';
import MainTabNavigator from './MainTabNavigator';
import { spacing, typography, type ColorPalette } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { initializing } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <BrandMark size={56} />
        <Wordmark size={26} />
        <Text style={styles.tagline}>Ücretsiz. Güvenli. Yakınında.</Text>
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      </View>
    );
  }

  // Giris yapmadan da gezinilebilsin (ilanlara bakma, arama vs.) - kimlik
  // gerektiren aksiyonlar (mesaj, ilan verme, favori) tiklandiginda useRequireAuth
  // bu ekrani modal olarak acar ve basarili girişte kendini kapatir.
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.background,
    },
    tagline: {
      ...typography.subhead,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    spinner: {
      marginTop: spacing.xl,
    },
  });
}
