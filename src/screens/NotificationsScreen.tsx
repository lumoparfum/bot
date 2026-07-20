import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { IconButton } from '../components/IconButton';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { markAllNotificationsRead, markNotificationRead } from '../services/notificationFeed';
import { formatRelativeDate } from '../utils/format';
import type { AppNotification, NotificationType } from '../types/notification';
import type { HomeStackParamList, MainTabParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'Notifications'>,
  BottomTabScreenProps<MainTabParamList>
>;

function notificationIcon(type: NotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'favorite':
      return 'heart';
    case 'savedSearch':
      return 'bookmark';
    case 'business':
      return 'briefcase';
    case 'message':
    default:
      return 'chatbubble';
  }
}

export default function NotificationsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications();

  const handlePress = (notification: AppNotification) => {
    if (!user) return;
    if (!notification.read) markNotificationRead(user.uid, notification.id).catch(() => {});

    if (notification.type === 'message' && notification.conversationId) {
      navigation.navigate('Messages', {
        screen: 'Chat',
        params: {
          conversationId: notification.conversationId,
          otherUserId: notification.fromUserId ?? '',
          otherUserName: notification.fromUserName,
          otherUserPhoto: notification.fromUserPhoto,
          listingTitle: '',
        },
      });
    } else if (notification.listingId) {
      navigation.navigate('ListingDetail', { listingId: notification.listingId });
    }
  };

  const handleMarkAllRead = () => {
    if (!user) return;
    markAllNotificationsRead(user.uid, notifications).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton onPress={() => navigation.goBack()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </IconButton>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={handleMarkAllRead} hitSlop={8}>
            <Text style={styles.markAllText}>Tümünü Okundu İşaretle</Text>
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xxl + insets.bottom }]}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => handlePress(item)}>
            {!item.read && <View style={styles.unreadDot} />}
            {item.fromUserPhoto ? (
              <Image source={{ uri: item.fromUserPhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name={notificationIcon(item.type)} size={16} color={colors.primary} />
              </View>
            )}
            <View style={styles.rowText}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.body} numberOfLines={1}>
                {item.body}
              </Text>
              <Text style={styles.time}>{formatRelativeDate(item.createdAt)}</Text>
            </View>
            {item.listingImage && <Image source={{ uri: item.listingImage }} style={styles.thumb} />}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={28} color={colors.textFaint} />
            <Text style={styles.emptyText}>
              Henüz bildirimin yok. İlanlarına gelen beğeniler ve mesajlar burada görünecek.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    headerTitle: {
      ...typography.headline,
      color: colors.text,
    },
    markAllText: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '600',
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.primary,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    avatarFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.text,
    },
    body: {
      ...typography.caption,
      color: colors.textMuted,
    },
    time: {
      ...typography.caption,
      color: colors.textFaint,
    },
    thumb: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing.xl,
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    emptyText: {
      ...typography.subhead,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
