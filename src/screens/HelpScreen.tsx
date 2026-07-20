import { useMemo, useState } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { showAlert } from '../components/AppAlert';
import { CategoryChip } from '../components/CategoryChip';
import { IconButton } from '../components/IconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { checkSupportRequestAllowed, createSupportRequest, DAILY_SUPPORT_REQUEST_LIMIT } from '../services/support';
import type { ProfileStackParamList } from '../types/navigation';
import type { SupportRequestType } from '../types/support';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Help'>;

type FaqItem = { id: string; question: string; answer: string };

const REQUEST_TYPES: { type: SupportRequestType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'bug', label: 'Hata Bildir', icon: 'bug-outline' },
  { type: 'suggestion', label: 'Öneri', icon: 'bulb-outline' },
  { type: 'other', label: 'Diğer', icon: 'chatbubble-outline' },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'free',
    question: 'Stop82 gerçekten tamamen ücretsiz mi?',
    answer:
      'Evet. İlan vermek, mesajlaşmak, yorum yapmak, hiçbir işlem için ücret ya da komisyon almıyoruz, öne çıkarma diye bir şey yok. Stop82\'nin mottosu bu: bedava kalmaya devam edecek.',
  },
  {
    id: 'payment',
    question: 'Ödeme nasıl yapılıyor, Stop82 aracı oluyor mu?',
    answer:
      'Hayır. Stop82 alım satıma taraf değildir ve hiçbir zaman para tutmaz. Alıcı ve satıcı fiyatta anlaşıp ödemeyi kendi aralarında, tercihen elden teslimle yapar.',
  },
  {
    id: 'scam',
    question: 'Bir kullanıcı beni dolandırmaya çalışıyor, ne yapmalıyım?',
    answer:
      'İlan, yorum ya da profildeki "Şikayet Et" seçeneğini kullan; bildirdiğin içerik kalıcı olarak kayıt altına alınır. Asla önden ödeme yapma ve mümkünse güvenli, kalabalık bir yerde buluş.',
  },
  {
    id: 'noreply',
    question: 'Satıcı mesajıma cevap vermiyor, ne yapmalıyım?',
    answer:
      'Satıcının profilinde "Genelde ... içinde yanıtlıyor" rozetini kontrol edebilirsin. Makul bir süre içinde cevap gelmezse başka bir satıcıyla iletişime geçmeni öneririz.',
  },
  {
    id: 'expiry',
    question: 'İlanım ne zaman kaldırılır?',
    answer:
      'İlanlar güncel kalsın diye yayından 15 gün sonra fotoğraflarıyla birlikte otomatik olarak silinir. Ürünü sattıysan ilan sayfasından "Satıldı" olarak işaretleyebilirsin.',
  },
  {
    id: 'delete',
    question: 'Hesabımı ve verilerimi nasıl silerim?',
    answer:
      'Ayarlar sayfasının en altındaki "Hesabımı Kalıcı Olarak Sil" seçeneğiyle hesabını ve tüm verilerini anında ve kalıcı olarak silebilirsin.',
  },
];

export default function HelpScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<SupportRequestType | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const toggleFaq = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSend = async () => {
    if (!requireAuth() || !user) return;
    const trimmed = message.trim();
    if (!trimmed || !requestType || sending) return;

    setSending(true);
    try {
      const allowed = await checkSupportRequestAllowed(user.uid);
      if (!allowed) {
        showAlert(
          'Günlük gönderim sınırına ulaştın',
          `Spam ve botları önlemek için günde en fazla ${DAILY_SUPPORT_REQUEST_LIMIT} mesaj gönderilebiliyor. Yarın tekrar dene.`
        );
        return;
      }
      await createSupportRequest({
        uid: user.uid,
        userName: user.displayName ?? 'Stop82 Kullanıcısı',
        userEmail: user.email,
        type: requestType,
        message: trimmed,
      });
      setMessage('');
      setRequestType(null);
      showAlert('Teşekkürler', 'Mesajın bize ulaştı, en kısa sürede döneceğiz.');
    } catch {
      showAlert('Hata', 'Mesajın gönderilemedi, tekrar dene.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton onPress={() => navigation.goBack()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </IconButton>
        <Text style={styles.headerTitle}>Yardım ve Destek</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Sık Sorulan Sorular</Text>
          <View style={styles.card}>
            {FAQ_ITEMS.map((item, index) => {
              const expanded = expandedId === item.id;
              return (
                <View
                  key={item.id}
                  style={index < FAQ_ITEMS.length - 1 ? styles.faqRowDivider : undefined}
                >
                  <Pressable style={styles.faqRow} onPress={() => toggleFaq(item.id)}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textFaint}
                    />
                  </Pressable>
                  {expanded && (
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Bize Ulaş</Text>
          <View style={styles.card}>
            <View style={styles.contactBlock}>
              <Text style={styles.contactHint}>
                Karşılaştığın bir sorunu, şikayeti ya da önerini yaz, sana en kısa sürede döneceğiz.
              </Text>
              <View style={styles.typeRow}>
                {REQUEST_TYPES.map((item) => (
                  <CategoryChip
                    key={item.type}
                    label={item.label}
                    icon={item.icon}
                    selected={requestType === item.type}
                    onPress={() => setRequestType(item.type)}
                  />
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Mesajını yaz..."
                placeholderTextColor={colors.textFaint}
                multiline
                textAlignVertical="top"
              />
              <PrimaryButton
                label={sending ? 'Gönderiliyor...' : 'Gönder'}
                onPress={handleSend}
                disabled={!message.trim() || !requestType || sending}
                loading={sending}
                icon={!sending ? <Ionicons name="send-outline" size={16} color="#fff" /> : undefined}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    headerTitle: {
      ...typography.headline,
      color: colors.text,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    sectionLabel: {
      ...typography.footnote,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    faqRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    faqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    faqQuestion: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },
    faqAnswer: {
      ...typography.subhead,
      color: colors.textMuted,
      lineHeight: 21,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    contactBlock: {
      padding: spacing.md,
      gap: spacing.md,
    },
    contactHint: {
      ...typography.subhead,
      color: colors.textMuted,
    },
    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.text,
      minHeight: 100,
      backgroundColor: colors.background,
    },
  });
}
