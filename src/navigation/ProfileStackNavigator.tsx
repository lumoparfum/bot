import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TermsScreen from '../screens/TermsScreen';
import HelpScreen from '../screens/HelpScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import SellerProfileScreen from '../screens/SellerProfileScreen';
import type { ProfileStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      {/* Ayni ekranlar HomeStack'te de var - Profil sekmesinden acilinca
          geri tusu Ana Sayfa'ya degil Profilim'e donsun diye burada da
          tanimli (bkz. types/navigation.ts). */}
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen as never} />
      <Stack.Screen name="SellerProfile" component={SellerProfileScreen as never} />
    </Stack.Navigator>
  );
}
