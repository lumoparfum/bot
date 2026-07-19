import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Stop82',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

export async function savePushToken(uid: string, token: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { pushToken: token });
}

export async function getNotificationPermissionStatus(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const result = await Notifications.getPermissionsAsync();
  return { granted: result.status === 'granted', canAskAgain: result.canAskAgain };
}

// Android'de bir kere reddedilen bildirim izni genelde uygulama icinden
// tekrar sorulamaz (canAskAgain=false) - bu durumda kullaniciyi sistem
// ayarlarina yonlendirmek gerekir.
export function openSystemNotificationSettings(): void {
  Linking.openSettings();
}
