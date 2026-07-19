import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../context/MessagesContext';
import { formatRelativeDate } from '../utils/format';
import type { Conversation } from '../types/chat';
import type { MessagesStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<MessagesStackParamList, 'ChatList'>;

export default function ChatListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { conversations } = useMessages();

  const openChat = (conversation: Conversation) => {
    if (!user) return;
    const isSeller = user.uid === conversation.sellerId;
    const otherUserId = isSeller ? conversation.buyerId : conversation.sellerId;
    const otherUserName = isSeller ? conversation.buyerName : conversation.sellerName;
    const otherUserPhoto = isSeller ? conversation.buyerPhotoURL : conversation.sellerPhotoURL;
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      otherUserId,
      otherUserName,
      otherUserPhoto,
      listingTitle: conversation.listingTitle,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Mesajlar</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSeller = user?.uid === item.sellerId;
          const otherName = isSeller ? item.buyerName : item.sellerName;
          const otherPhoto = isSeller ? item.buyerPhotoURL : item.sellerPhotoURL;
          const unread = user ? item.unreadCount[user.uid] ?? 0 : 0;
          return (
            <Pressable style={styles.row} onPress={() => openChat(item)}>
              {item.listingImage ? (
                <Image source={{ uri: item.listingImage }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Ionicons name="image-outline" size={20} color={colors.textFaint} />
                </View>
              )}
              <View style={styles.rowText}>
                <View style={styles.rowTop}>
                  <Text style={styles.otherName} numberOfLines={1}>
                    {otherName}
                  </Text>
                  <Text style={styles.time}>{formatRelativeDate(item.lastMessageAt)}</Text>
                </View>
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {item.listingTitle}
                </Text>
                <Text
                  style={[styles.lastMessage, unread > 0 && styles.lastMessageUnread]}
                  numberOfLines={1}
                >
                  {item.lastMessage || 'Sohbeti başlat'}
                </Text>
              </View>
              {unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={28} color={colors.textFaint} />
            <Text style={styles.emptyText}>
              Henüz mesajın yok. Bir ilana "Mesaj Gönder" dediğinde burada görünecek.
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
    topBar: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    topBarTitle: {
      ...typography.title2,
      color: colors.text,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    thumbPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    otherName: {
      ...typography.headline,
      color: colors.text,
      flexShrink: 1,
    },
    time: {
      ...typography.caption,
      color: colors.textFaint,
    },
    listingTitle: {
      ...typography.caption,
      color: colors.textMuted,
    },
    lastMessage: {
      ...typography.subhead,
      color: colors.textMuted,
    },
    lastMessageUnread: {
      color: colors.text,
      fontWeight: '600',
    },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
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
