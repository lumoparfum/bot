import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { AppAlertProvider } from './src/components/AppAlert';
import { AuthProvider } from './src/context/AuthContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { MessagesProvider } from './src/context/MessagesContext';
import { NotificationsProvider } from './src/context/NotificationsContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type NotificationNavData = {
  conversationId?: string;
  otherUserId?: string;
  otherUserName?: string;
  otherUserPhoto?: string | null;
  listingTitle?: string;
  listingId?: string;
};

function navigateFromNotificationData(data: NotificationNavData) {
  if (data.conversationId) {
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
  } else if (data.listingId) {
    // Favori ve kayitli arama bildirimleri sadece listingId taniyor -
    // bunlara dokununca ilgili ilana gitmesi lazim, oncesinde hicbir
    // yere gitmiyordu.
    navigationRef.navigate('Main', {
      screen: 'HomeTab',
      params: {
        screen: 'ListingDetail',
        params: { listingId: data.listingId },
      },
    });
  }
}

function ThemedApp() {
  const { isDark, colors } = useTheme();
  // Bildirime dokunup uygulama SOGUK baslatildiginda (kapaliyken), bu
  // dinleyici abone olmadan once (hatta NavigationContainer hic mount
  // olmadan once - RootNavigator auth yuklenirken baska bir agac (loading
  // View) donduruyor, "Main" ekrani henuz navigator'e kayitli bile degil)
  // yanit zaten olusmus olabiliyordu - bu yuzden navigasyon hazir olana
  // kadar bekleyip (NavigationContainer'in onReady'si) SONRA isliyoruz.
  // Bunu atlarsak navigate('Main', ...) sessizce basarisiz oluyor ve
  // kullanici mesaj yerine ana sayfada kaliyordu.
  const pendingNotificationData = useRef<NotificationNavData | null>(null);
  const isNavReady = useRef(false);

  useEffect(() => {
    function handleResponse(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as NotificationNavData | undefined;
      if (!data) return;
      if (isNavReady.current) {
        navigateFromNotificationData(data);
      } else {
        pendingNotificationData.current = data;
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
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
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={() => {
        isNavReady.current = true;
        if (pendingNotificationData.current) {
          const data = pendingNotificationData.current;
          pendingNotificationData.current = null;
          navigateFromNotificationData(data);
        }
      }}
    >
      <AppAlertProvider>
        <RootNavigator />
      </AppAlertProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    // OTA guncellemeler varsayilan olarak bir sonraki acilista devreye
    // giriyor - kullaniciya "uygulamayi 2 kere ac" dedirtmemek icin, varsa
    // yeni surumu indirip bu oturumda hemen uyguluyoruz.
    if (__DEV__) return;
    Updates.checkForUpdateAsync()
      .then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : null))
      .then((fetched) => (fetched ? Updates.reloadAsync() : null))
      .catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            <MessagesProvider>
              <NotificationsProvider>
                <ThemedApp />
              </NotificationsProvider>
            </MessagesProvider>
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
