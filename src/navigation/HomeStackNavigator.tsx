import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ListingListScreen from '../screens/ListingListScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import type { HomeStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ListingList" component={ListingListScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
    </Stack.Navigator>
  );
}
