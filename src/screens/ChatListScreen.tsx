import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { showAlert } from '../components/AppAlert';
import { GuestPrompt } from '../components/GuestPrompt';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../context/MessagesContext';
import { deleteConversationForUser } from '../services/chat';
import { formatRelativeDate } from '../utils/format';
import type { Conversation } from '../types/chat';
import type { MessagesStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<MessagesStackParamList, 'ChatList'>;

export default function ChatListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { conversations } = useMessages();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const handleRowPress = (conversation: Conversation) => {
    if (selectionMode) {
      toggleSelect(conversation.id);
      return;
    }
    openChat(conversation);
  };

  const handleLongPress = (conversation: Conversation) => {
    setSelectionMode(true);
    setSelectedIds(new Set([conversation.id]));
  };

  const handleDeleteSelected = () => {
    if (!user || selectedIds.size === 0) return;
    const count = selectedIds.size;
    showAlert(
      'Sohbetleri Sil',
      `${count} sohbet mesaj listenden kaldırılacak. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const results = await Promise.allSettled(
              Array.from(selectedIds).map((id) => deleteConversationForUser(id, user.uid))
            );
            setSelectionMode(false);
            setSelectedIds(new Set());
            if (results.some((r) => r.status === 'rejected')) {
              showAlert('Hata', 'Bazı sohbetler silinemedi, tekrar dene.');
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Mesajlar</Text>
        </View>
        <GuestPrompt
          icon="chatbubbles-outline"
          title="Mesajlarını görmek için giriş yap"
          message="Alıcı ve satıcılarla yazışabilmek için önce hesabına giriş yapman gerekiyor."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Mesajlar</Text>
        {conversations.length > 0 && (
          <Pressable onPress={toggleSelectionMode} hitSlop={8}>
            <Text style={styles.editLink}>{selectionMode ? 'İptal' : 'Düzenle'}</Text>
          </Pressable>
        )}
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
          const selected = selectedIds.has(item.id);
          return (
            <Pressable
              style={styles.row}
              onPress={() => handleRowPress(item)}
              onLongPress={() => handleLongPress(item)}
            >
              {selectionMode && (
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={selected ? colors.primary : colors.textFaint}
                />
              )}
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

      {selectionMode && selectedIds.size > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionBarText}>{selectedIds.size} seçili</Text>
          <Pressable style={styles.selectionBarButton} onPress={handleDeleteSelected}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.selectionBarButtonText}>Sil</Text>
          </Pressable>
        </View>
      )}
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    topBarTitle: {
      ...typography.title2,
      color: colors.text,
    },
    editLink: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.primary,
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
    selectionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      backgroundColor: colors.background,
    },
    selectionBarText: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.text,
    },
    selectionBarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.error,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    selectionBarButtonText: {
      ...typography.caption,
      fontWeight: '700',
      color: '#fff',
    },
  });
}
