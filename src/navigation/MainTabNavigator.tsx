import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeStackNavigator from './HomeStackNavigator';
import AddListingScreen from '../screens/AddListingScreen';
import MessagesStackNavigator from './MessagesStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import { shadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useMessages } from '../context/MessagesContext';
import type { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Bu ekranlar kendi tam-ekran ust/alt kontrollerini cizdigi icin, uzerlerinde
// asagida uygulamanin sekme cubugu ikinci bir alt bar gibi durup gorunumu
// bozmasin diye tab bar'i gizliyoruz.
const FULLSCREEN_ROUTES = new Set([
  'ListingDetail',
  'SellerProfile',
  'Chat',
  'Settings',
  'Notifications',
  'Terms',
  'SavedSearches',
  'Help',
]);

export default function MainTabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { totalUnread } = useMessages();

  const baseTabBarStyle = {
    backgroundColor: colors.background,
    borderTopColor: colors.divider,
    height: 62 + insets.bottom,
    paddingTop: 8,
    paddingBottom: insets.bottom + 8,
    ...shadows.raised,
  };

  const hideTabBarWhenNested = ({ route }: { route: { name: string; params?: object } }) => {
    const focusedRoute = getFocusedRouteNameFromRoute(route);
    const hidden = focusedRoute ? FULLSCREEN_ROUTES.has(focusedRoute) : false;
    return { tabBarStyle: hidden ? { display: 'none' as const } : baseTabBarStyle };
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: baseTabBarStyle,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={({ route }) => ({
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
          ...hideTabBarWhenNested({ route }),
        })}
      />
      <Tab.Screen
        name="AddListing"
        component={AddListingScreen}
        options={{
          title: 'İlan Ver',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStackNavigator}
        options={({ route }) => ({
          title: 'Mesajlar',
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              color={color}
              size={size}
            />
          ),
          ...hideTabBarWhenNested({ route }),
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={({ route }) => ({
          title: 'Profilim',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size} />
          ),
          ...hideTabBarWhenNested({ route }),
        })}
      />
    </Tab.Navigator>
  );
}
