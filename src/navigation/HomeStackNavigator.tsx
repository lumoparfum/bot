import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ListingListScreen from '../screens/ListingListScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import SellerProfileScreen from '../screens/SellerProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SavedSearchesScreen from '../screens/SavedSearchesScreen';
import SwipeDiscoverScreen from '../screens/SwipeDiscoverScreen';
import ChatScreen from '../screens/ChatScreen';
import type { HomeStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ListingList" component={ListingListScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SavedSearches" component={SavedSearchesScreen} />
      <Stack.Screen name="SwipeDiscover" component={SwipeDiscoverScreen} />
      {/* MessagesStack'te de var - Letgo'daki gibi bir ilandan/bildirimden
          mesaja girince sekme atlamadan, bu stack'in ustune push edilsin diye. */}
      <Stack.Screen name="Chat" component={ChatScreen as never} />
    </Stack.Navigator>
  );
}
