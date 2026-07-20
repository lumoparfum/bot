import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import SellerProfileScreen from '../screens/SellerProfileScreen';
import type { MessagesStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      {/* HomeStack'te de var - sohbetten satici profiline gecince geri
          tusu sohbete donsun diye burada da tanimli. */}
      <Stack.Screen name="SellerProfile" component={SellerProfileScreen as never} />
    </Stack.Navigator>
  );
}
