import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { showAlert } from '../components/AppAlert';
import { IconButton } from '../components/IconButton';
import { OfferModal } from '../components/OfferModal';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { blockUser } from '../services/blocks';
import {
  deleteConversationForUser,
  markConversationRead,
  respondToOffer,
  sendCounterOffer,
  sendMessage,
  sendOffer,
  subscribeToMessages,
} from '../services/chat';
import type { ChatMessage } from '../types/chat';
import type { MainTabParamList, MessagesStackParamList } from '../types/navigation';

const QUICK_REPLIES = [
  'Hâlâ satılık mı?',
  'Son fiyat nedir?',
  'Nerede buluşabiliriz?',
  'Uygun, alıyorum',
];

// Karsi taraf hic yanit vermeden art arda spam gibi mesaj/teklif atilmasin diye -
// karsi taraf bir kere yanit verince (son mesaj onun olunca) sayac otomatik sifirlanir.
const MAX_CONSECUTIVE_UNANSWERED = 7;

function countConsecutiveFromMe(messages: ChatMessage[], myUid: string): number {
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderId !== myUid) break;
    count++;
  }
  return count;
}

type Props = CompositeScreenProps<
  NativeStackScreenProps<MessagesStackParamList, 'Chat'>,
  BottomTabScreenProps<MainTabParamList>
>;

export default function ChatScreen({ route, navigation }: Props) {
  const { conversationId, otherUserId, otherUserName, otherUserPhoto, listingTitle } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [counterOfferTarget, setCounterOfferTarget] = useState<ChatMessage | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, setMessages);
    return unsubscribe;
  }, [conversationId]);

  // Alt bosluk (insets.bottom) sadece klavye kapaliyken home indicator'i
  // temizlemek icin gerekli - klavye acikken KeyboardAvoidingView zaten her
  // seyi yukari itiyor, bu sabit padding orada gereksiz bosluk birakip mesaj
  // kutusunun klavyeden "kopuk" durmasina (dengesizlik) yol aciyordu.
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) markConversationRead(conversationId, user.uid).catch(() => {});
    }, [conversationId, user])
  );

  const openOtherProfile = () => {
    // Sekmeler arasi navigate('HomeTab', {...}) geri tusunu sohbete degil
    // Ana Sayfa'ya donduruyordu - ekran artik bu stack'te de tanimli.
    navigation.navigate('SellerProfile', {
      sellerId: otherUserId,
      sellerName: otherUserName,
    });
  };

  // Karsi taraf yanit vermeden ust uste MAX_CONSECUTIVE_UNANSWERED'den fazla
  // mesaj/teklif gonderilemez - true donerse uyari zaten gosterilmis demektir.
  const blockedBySpamLimit = () => {
    if (!user) return false;
    if (countConsecutiveFromMe(messages, user.uid) < MAX_CONSECUTIVE_UNANSWERED) return false;
    showAlert(
      'Yanıt Bekleniyor',
      `${otherUserName} henüz yanıt vermedi. Yanıt gelmeden art arda daha fazla mesaj gönderemezsin.`
    );
    return true;
  };

  const handleSend = async (overrideText?: string) => {
    const value = (overrideText ?? text).trim();
    if (!user || !value || sending) return;
    if (blockedBySpamLimit()) return;
    setText('');
    setSending(true);
    try {
      await sendMessage(conversationId, user.uid, otherUserId, value);
    } catch (error: any) {
      // Basarisiz olursa yazdigin mesaj kaybolmasin diye kutuya geri koyuyoruz.
      setText(value);
      if (error?.code === 'permission-denied') {
        showAlert('Mesaj gönderilemedi', 'Bu kullanıcıya mesaj gönderemiyorsun.');
      } else {
        showAlert('Hata', 'Mesaj gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleBlock = () => {
    if (!user) return;
    showAlert(
      'Kullanıcıyı Engelle',
      `${otherUserName} bir daha sana mesaj gönderemeyecek. Bu sohbet mesaj listenden kaldırılacak. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.uid, otherUserId);
              await deleteConversationForUser(conversationId, user.uid);
              navigation.goBack();
            } catch {
              showAlert('Hata', 'Engellenemedi, tekrar dene.');
            }
          },
        },
      ]
    );
  };

  const handleMoreOptions = () => {
    showAlert(otherUserName, undefined, [
      { text: 'Kullanıcıyı Engelle', style: 'destructive', onPress: handleBlock },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const handleSendOffer = async (amount: number) => {
    if (!user || blockedBySpamLimit()) return;
    await sendOffer(conversationId, user.uid, otherUserId, amount);
  };

  const handleRespondToOffer = (message: ChatMessage, status: 'accepted' | 'declined') => {
    respondToOffer(conversationId, message.id, status).catch(() => {
      showAlert('Hata', 'İşlem gerçekleştirilemedi, tekrar dene.');
    });
  };

  const handleSendCounterOffer = async (amount: number) => {
    if (!user || !counterOfferTarget || blockedBySpamLimit()) return;
    await sendCounterOffer(conversationId, counterOfferTarget.id, user.uid, otherUserId, amount);
  };

  // Alici/satici bulusmayi tam bu ekranda konusuyor - guvenlik uyarisi tek
  // satirlik banner'da bogulmasin diye dokununca acilan somut bir liste.
  const handleSafetyTips = () => {
    showAlert(
      'Güvenli Alışveriş',
      '• Kalabalık, halka açık ve aydınlık bir yerde buluş.\n• Ürünü görüp kontrol etmeden ödeme yapma.\n• Kapora ya da önden havale isteyen satıcıya güvenme.\n• Şüpheli bir davranışla karşılaşırsan profildeki "Şikayet Et" seçeneğini kullan.'
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton onPress={() => navigation.goBack()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </IconButton>
        <Pressable style={styles.headerIdentity} onPress={openOtherProfile}>
          {otherUserPhoto ? (
            <Image source={{ uri: otherUserPhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{otherUserName.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUserName}
            </Text>
            <Text style={styles.headerListing} numberOfLines={1}>
              {listingTitle}
            </Text>
          </View>
        </Pressable>
        <IconButton onPress={handleMoreOptions} accessibilityLabel="Diğer seçenekler">
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
        </IconButton>
      </View>

      <Pressable style={styles.safetyBanner} onPress={handleSafetyTips}>
        <Ionicons name="shield-checkmark-outline" size={13} color={colors.textFaint} />
        <Text style={styles.safetyBannerText}>
          Güvenli buluşma ve ödeme için dokun
        </Text>
        <Ionicons name="chevron-forward" size={12} color={colors.textFaint} />
      </Pressable>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const isMine = item.senderId === user?.uid;

            if (item.type === 'offer') {
              const canRespond = !isMine && item.offerStatus === 'pending';
              return (
                <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
                  <View style={styles.offerCard}>
                    <View style={styles.offerHeader}>
                      <Ionicons name="pricetag" size={16} color={colors.primary} />
                      <Text style={styles.offerAmount}>
                        ₺{(item.offerAmount ?? 0).toLocaleString('tr-TR')}
                      </Text>
                    </View>
                    <Text style={styles.offerStatusText}>
                      {item.offerStatus === 'accepted'
                        ? 'Teklif kabul edildi'
                        : item.offerStatus === 'declined'
                          ? 'Teklif reddedildi'
                          : item.offerStatus === 'countered'
                            ? 'Karşı teklif verildi'
                            : 'Teklif bekleniyor'}
                    </Text>
                    {canRespond && (
                      <>
                        <View style={styles.offerActions}>
                          <Pressable
                            style={styles.offerDeclineButton}
                            onPress={() => handleRespondToOffer(item, 'declined')}
                          >
                            <Text style={styles.offerDeclineText}>Reddet</Text>
                          </Pressable>
                          <Pressable
                            style={styles.offerAcceptButton}
                            onPress={() => handleRespondToOffer(item, 'accepted')}
                          >
                            <Text style={styles.offerAcceptText}>Kabul Et</Text>
                          </Pressable>
                        </View>
                        <Pressable
                          style={styles.offerCounterButton}
                          onPress={() => setCounterOfferTarget(item)}
                        >
                          <Text style={styles.offerCounterText}>Karşı Teklif Ver</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              );
            }

            return (
              <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.text}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>İlk mesajı sen gönder.</Text>
            </View>
          }
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickReplyRow}
          contentContainerStyle={styles.quickReplyContent}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_REPLIES.map((reply) => (
            <Pressable key={reply} style={styles.quickReplyChip} onPress={() => handleSend(reply)}>
              <Text style={styles.quickReplyText}>{reply}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View
          style={[
            styles.inputRow,
            { paddingBottom: keyboardVisible ? spacing.sm : insets.bottom + spacing.sm },
          ]}
        >
          <Pressable style={styles.offerButton} onPress={() => setOfferModalVisible(true)} hitSlop={6}>
            <Ionicons name="pricetag-outline" size={19} color={colors.primary} />
          </Pressable>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Mesaj yaz..."
            placeholderTextColor={colors.textFaint}
            multiline
          />
          <Pressable
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="send" size={17} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <OfferModal
        visible={offerModalVisible}
        onClose={() => setOfferModalVisible(false)}
        onSubmit={handleSendOffer}
      />

      <OfferModal
        visible={!!counterOfferTarget}
        onClose={() => setCounterOfferTarget(null)}
        onSubmit={handleSendCounterOffer}
        title="Karşı Teklif Ver"
        submitLabel="Karşı Teklifi Gönder"
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
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    safetyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
    },
    safetyBannerText: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textFaint,
    },
    headerIdentity: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    avatarFallback: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarFallbackText: {
      color: colors.primary,
      fontWeight: '700',
    },
    headerText: {
      flex: 1,
      gap: 1,
    },
    headerName: {
      ...typography.headline,
      color: colors.text,
    },
    headerListing: {
      ...typography.caption,
      color: colors.textMuted,
    },
    messageList: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.xs,
    },
    bubbleRow: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    bubbleRowMine: {
      justifyContent: 'flex-end',
    },
    bubble: {
      maxWidth: '78%',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
    },
    bubbleTheirs: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: radius.sm,
    },
    bubbleMine: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: radius.sm,
    },
    bubbleText: {
      ...typography.body,
      color: colors.text,
    },
    bubbleTextMine: {
      color: '#fff',
    },
    offerCard: {
      maxWidth: '78%',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    offerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    offerAmount: {
      ...typography.title3,
      color: colors.text,
    },
    offerStatusText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    offerActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    offerDeclineButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    offerDeclineText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textMuted,
    },
    offerAcceptButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.primary,
    },
    offerAcceptText: {
      ...typography.caption,
      fontWeight: '600',
      color: '#fff',
    },
    offerCounterButton: {
      alignItems: 'center',
      paddingVertical: spacing.xs + 2,
      marginTop: 2,
    },
    offerCounterText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.primary,
    },
    quickReplyRow: {
      flexGrow: 0,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    quickReplyContent: {
      gap: spacing.sm,
    },
    quickReplyChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickReplyText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.text,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    offerButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      maxHeight: 100,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
      color: colors.text,
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    emptyState: {
      paddingTop: spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      ...typography.subhead,
      color: colors.textMuted,
    },
  });
}
