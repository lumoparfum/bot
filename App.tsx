import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { MessagesProvider } from './src/context/MessagesContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function ThemedApp() {
  const { isDark, colors } = useTheme();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | {
            conversationId?: string;
            otherUserId?: string;
            otherUserName?: string;
            otherUserPhoto?: string | null;
            listingTitle?: string;
          }
        | undefined;
      if (!data?.conversationId || !navigationRef.isReady()) return;
      navigationRef.navigate('Main', {
        screen: 'Messages',
        params: {
          screen: 'Chat',
          params: {
            conversationId: data.conversationId,
            otherUserId: data.otherUserId ?? '',
            otherUserName: data.otherUserName ?? '',
            otherUserPhoto: data.otherUserPhoto ?? null,
            listingTitle: data.listingTitle ?? '',
          },
        },
      });
    });
    return () => subscription.remove();
  }, []);

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            <MessagesProvider>
              <ThemedApp />
            </MessagesProvider>
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
