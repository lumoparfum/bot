import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { showAlert } from '../components/AppAlert';
import { BuyerPickerModal } from '../components/BuyerPickerModal';
import { CommentsSection } from '../components/CommentsSection';
import { FullscreenImageViewer } from '../components/FullscreenImageViewer';
import { IconButton } from '../components/IconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { ReportModal } from '../components/ReportModal';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { formatPrice, formatRelativeDate } from '../utils/format';
import {
  deleteListing,
  fetchListingById,
  incrementListingView,
  markListingSold,
} from '../services/firestore';
import { fetchListingBuyers, getOrCreateConversation } from '../services/chat';
import { submitReport } from '../services/reports';
import { useAuth } from '../context/AuthContext';
import { useFavorites, useIsFavorite } from '../context/FavoritesContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import type { Listing } from '../types/listing';
import type { HomeStackParamList, MainTabParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'ListingDetail'>,
  BottomTabScreenProps<MainTabParamList>
>;

export default function ListingDetailScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { toggleFavorite } = useFavorites();
  // route param'daki listingId kullanilir (henuz yuklenmemis olabilecek
  // "listing" state'i degil) - hook'lar erken return'lerden ONCE, kosulsuz
  // cagrilmali.
  const favorited = useIsFavorite(listingId);
  const requireAuth = useRequireAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [buyerPickerVisible, setBuyerPickerVisible] = useState(false);
  const [listingBuyers, setListingBuyers] = useState<
    { buyerId: string; buyerName: string; buyerPhotoURL: string | null }[]
  >([]);

  const hasCountedView = useRef(false);

  // useFocusEffect kullanilir ki duzenleme ekranindan geri donulunce
  // (fiyat/foto degisikligi) burasi guncel veriyi yeniden ceksin. Goruntulenme
  // sayaci sadece ilk kez odaklanildiginda bir kez artar, her geri donuste degil.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchListingById(listingId)
        .then((result) => {
          if (cancelled) return;
          setListing(result);
          if (result && result.sellerId !== user?.uid && !hasCountedView.current) {
            hasCountedView.current = true;
            incrementListingView(listingId);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listingId])
  );

  if (loading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>İlan bulunamadı.</Text>
        <PrimaryButton label="Geri Dön" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const imageHeight = width;
  const isOwnListing = user?.uid === listing.sellerId;
  const priceDropFrom = (() => {
    if (listing.priceHistory.length < 2) return null;
    const previous = listing.priceHistory[listing.priceHistory.length - 2].price;
    return previous > listing.price ? previous : null;
  })();

  const handleMessage = async () => {
    if (!requireAuth() || !user) return;
    try {
      const conversationId = await getOrCreateConversation({
        listingId: listing.id,
        listingTitle: listing.title,
        listingImage: listing.images[0] ?? null,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        sellerPhotoURL: listing.sellerPhotoURL,
        buyerId: user.uid,
        buyerName: user.displayName ?? 'Stop82 Kullanıcısı',
        buyerPhotoURL: user.photoURL,
      });
      // Letgo'daki gibi: Mesajlar sekmesine ATLAMAK yerine (ki bu "sekmeler
      // arasi karisiklik" hissi veriyordu - geri tusu bazen ilana degil
      // sohbet listesine donuyordu) Chat, ayni stack'in (bu ekranin oldugu
      // yigin) ustune dogrudan push ediliyor. Boylece geri tusu her zaman
      // tam geldigin sirayla (Chat -> Ilan -> Ana Sayfa) geri gider.
      navigation.navigate('Chat', {
        conversationId,
        otherUserId: listing.sellerId,
        otherUserName: listing.sellerName,
        otherUserPhoto: listing.sellerPhotoURL,
        listingTitle: listing.title,
      });
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        showAlert('Mesaj gönderilemedi', 'Bu satıcıya mesaj gönderemiyorsun.');
      } else {
        showAlert('Hata', 'Sohbet açılamadı. İnternet bağlantını kontrol edip tekrar dene.');
      }
    }
  };

  const confirmMarkSold = (buyerId: string | null) => {
    showAlert('Satıldı Olarak İşaretle', 'Bu ilanı satıldı olarak işaretlemek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İşaretle',
        onPress: async () => {
          try {
            await markListingSold(listing.id, listing.sellerId, buyerId);
            setListing({ ...listing, status: 'sold', soldTo: buyerId });
          } catch {
            showAlert('Hata', 'İşaretlenemedi, tekrar dene.');
          }
        },
      },
    ]);
  };

  const handleMarkSold = async () => {
    try {
      const buyers = await fetchListingBuyers(listing.id);
      if (buyers.length > 0) {
        setListingBuyers(buyers);
        setBuyerPickerVisible(true);
      } else {
        confirmMarkSold(null);
      }
    } catch {
      confirmMarkSold(null);
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddListing', { editListingId: listing.id });
  };

  const handleOpenReport = () => {
    if (!requireAuth()) return;
    setReportModalVisible(true);
  };

  const handleSubmitReport = async (reason: string) => {
    if (!user) return;
    await submitReport({
      type: 'listing',
      targetId: listing.id,
      targetOwnerId: listing.sellerId,
      reporterId: user.uid,
      reporterName: user.displayName ?? 'Stop82 Kullanıcısı',
      reason,
    });
  };

  const handleDelete = () => {
    showAlert('İlanı Kaldır', 'Bu ilanı kalıcı olarak silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteListing(listing.id);
            navigation.goBack();
          } catch {
            showAlert('Hata', 'İlan silinemedi, tekrar dene.');
          }
        },
      },
    ]);
  };

  const handleShare = () => {
    // web/api/ilan/[id].js bu linki karsiliyor: gercek ilan fotografi/baslik/
    // fiyatiyla dogru og: etiketleri donduruyor (WhatsApp/Facebook onizlemesi
    // dogru gorunsun diye), sayfada "Uygulamada Ac" butonu var. Linkin
    // kendisi tiklaninca DOGRUDAN uygulamayi acmasi (Universal Links) henuz
    // yok - o native bir build gerektiriyor, su an icin bir ek tiklama ile
    // (o sayfadaki buton) uygulamaya geciliyor.
    // NOT: "message" icine linki gomdukten sonra AYRICA "url" alanini da
    // vermek, iOS'ta bazi paylasim hedeflerinde (WhatsApp gibi) linkin iki
    // kez gorunmesine yol aciyordu - Share API ikisini birlestirmek yerine
    // ayri ayri ekliyor. Tek yerde (message icinde) tutuluyor.
    const url = `https://stop82.com/ilan/${listing.id}`;
    Share.share({
      message: `${listing.title} - ${formatPrice(listing.price)}\n${url}`,
    }).catch(() => {});
  };

  const openSellerProfile = () => {
    navigation.navigate('SellerProfile', {
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
    });
  };

  return (
    <View style={styles.container}>
      {/* Yorumlar bolumunun yazi kutusu (CommentsSection) klavyeden kacinma
          gerektiriyor - ama bunu butun ekrani (alttaki sabit "Mesaj Gonder"
          barini da) saran KeyboardAvoidingView icine koymak, klavye acilinca
          o barin da yukari kaymasina, "olmasi gereken yerden" oynamasina
          yol aciyordu. Artik sadece kaydirilabilir icerik klavyeden kaciniyor,
          sabit bar her zaman gercek ekran altina sabit kaliyor. */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={{ height: imageHeight }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
          >
            {listing.images.length > 0 ? (
              listing.images.map((uri) => (
                <Pressable key={uri} onPress={() => setViewerVisible(true)}>
                  <Image
                    source={{ uri }}
                    style={{ width, height: imageHeight }}
                    contentFit="cover"
                  />
                </Pressable>
              ))
            ) : (
              <View style={[{ width, height: imageHeight }, styles.noImage]}>
                <Ionicons name="image-outline" size={40} color={colors.textFaint} />
              </View>
            )}
          </ScrollView>

          {listing.images.length > 1 && (
            <View style={styles.dots}>
              {listing.images.map((uri, index) => (
                <View
                  key={uri}
                  style={[styles.dot, index === activeImage && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.sheet}>
          <View style={styles.chipRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{listing.category}</Text>
            </View>
            {listing.subcategory && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{listing.subcategory}</Text>
              </View>
            )}
            <View style={styles.tag}>
              <Text style={styles.tagText}>{listing.condition}</Text>
            </View>
          </View>

          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            {priceDropFrom !== null && (
              <Text style={styles.oldPrice}>{formatPrice(priceDropFrom)}</Text>
            )}
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <Text style={styles.metaText}>{listing.location.label || 'Konum belirtilmemiş'}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>{formatRelativeDate(listing.createdAt)}</Text>
            <View style={styles.metaDot} />
            <Ionicons name="eye-outline" size={14} color={colors.textFaint} />
            <Text style={styles.metaText}>{listing.viewCount}</Text>
            {listing.favoriteCount > 0 && (
              <>
                <View style={styles.metaDot} />
                <Ionicons name="heart" size={13} color={colors.textFaint} />
                <Text style={styles.metaText}>{listing.favoriteCount}</Text>
              </>
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionHeading}>Açıklama</Text>
          <Text style={styles.description}>{listing.description}</Text>

          {Object.keys(listing.attributes).length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionHeading}>Özellikler</Text>
              <View style={styles.attributesGrid}>
                {Object.entries(listing.attributes).map(([key, value]) => (
                  <View key={key} style={styles.attributeItem}>
                    <Text style={styles.attributeKey}>{key}</Text>
                    <Text style={styles.attributeValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.divider} />

          <Pressable style={styles.sellerRow} onPress={openSellerProfile}>
            {listing.sellerPhotoURL ? (
              <Image source={{ uri: listing.sellerPhotoURL }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{listing.sellerName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.sellerInfo}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName}>{listing.sellerName}</Text>
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
              </View>
              <Text style={styles.sellerMeta}>Doğrulanmış hesap</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>

          {!isOwnListing && (
            <Pressable onPress={handleOpenReport} hitSlop={8} style={styles.reportLink}>
              <Ionicons name="flag-outline" size={13} color={colors.textFaint} />
              <Text style={styles.reportLinkText}>İlanı Şikayet Et</Text>
            </Pressable>
          )}

          <View style={styles.divider} />

          <CommentsSection listingId={listing.id} listingSellerId={listing.sellerId} />

          <View style={{ height: 100 + insets.bottom }} />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.headerControls, { top: insets.top + spacing.sm }]}>
        <IconButton
          variant="translucent"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Geri"
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </IconButton>
        <View style={styles.headerRightControls}>
          {isOwnListing ? (
            <>
              <IconButton variant="translucent" onPress={handleEdit} accessibilityLabel="İlanı Düzenle">
                <Ionicons name="pencil-outline" size={18} color="#fff" />
              </IconButton>
              <IconButton variant="translucent" onPress={handleDelete} accessibilityLabel="İlanı Kaldır">
                <Ionicons name="trash-outline" size={19} color="#fff" />
              </IconButton>
            </>
          ) : (
            <IconButton
              variant="translucent"
              onPress={() => {
                if (requireAuth()) toggleFavorite(listing.id);
              }}
              accessibilityLabel={favorited ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            >
              <Ionicons
                name={favorited ? 'heart' : 'heart-outline'}
                size={19}
                color={favorited ? colors.primary : '#fff'}
              />
            </IconButton>
          )}
          <IconButton variant="translucent" onPress={handleShare} accessibilityLabel="Paylaş">
            <Ionicons name="share-outline" size={19} color="#fff" />
          </IconButton>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        {isOwnListing ? (
          listing.status === 'sold' ? (
            <View style={styles.soldBar}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.soldBarText}>Bu ilan satıldı olarak işaretlendi</Text>
            </View>
          ) : (
            <PrimaryButton
              label="Satıldı Olarak İşaretle"
              variant="outline"
              onPress={handleMarkSold}
              icon={<Ionicons name="checkmark-circle-outline" size={18} color={colors.text} />}
            />
          )
        ) : (
          <PrimaryButton
            label="Mesaj Gönder"
            onPress={handleMessage}
            icon={<Ionicons name="chatbubble-outline" size={18} color="#fff" />}
          />
        )}
      </View>

      <FullscreenImageViewer
        visible={viewerVisible}
        images={listing.images}
        initialIndex={activeImage}
        onClose={() => setViewerVisible(false)}
      />

      <ReportModal
        visible={reportModalVisible}
        title="İlanı Şikayet Et"
        reportType="listing"
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleSubmitReport}
      />

      <BuyerPickerModal
        visible={buyerPickerVisible}
        buyers={listingBuyers}
        onClose={() => setBuyerPickerVisible(false)}
        onSelect={confirmMarkSold}
      />
    </View>
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
    noImage: {
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dots: {
      position: 'absolute',
      bottom: radius.xl + spacing.md,
      alignSelf: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dotActive: {
      backgroundColor: '#fff',
      width: 16,
    },
    sheet: {
      marginTop: -radius.xl,
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    chipRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    tag: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    tagText: {
      ...typography.caption,
      color: colors.text,
    },
    title: {
      ...typography.title2,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    price: {
      ...typography.largeTitle,
      color: colors.primary,
    },
    oldPrice: {
      ...typography.subhead,
      color: colors.textFaint,
      textDecorationLine: 'line-through',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: spacing.md,
    },
    metaText: {
      ...typography.subhead,
      color: colors.textMuted,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.textFaint,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: spacing.lg,
    },
    sectionHeading: {
      ...typography.headline,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    description: {
      ...typography.body,
      color: colors.textMuted,
      lineHeight: 22,
    },
    attributesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    attributeItem: {
      minWidth: '42%',
      gap: 2,
    },
    attributeKey: {
      ...typography.caption,
      color: colors.textFaint,
    },
    attributeValue: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.text,
    },
    sellerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
    },
    avatarText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 18,
    },
    sellerInfo: {
      flex: 1,
      gap: 2,
    },
    sellerNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    sellerName: {
      ...typography.headline,
      color: colors.text,
    },
    sellerMeta: {
      ...typography.caption,
      color: colors.textMuted,
    },
    reportLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
    },
    reportLinkText: {
      ...typography.caption,
      color: colors.textFaint,
    },
    headerControls: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    headerRightControls: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
      // Alt guvenli alan (insets.bottom) telefona gore 0-40px arasi
      // degisiyor - ustteki bosluk sabit kalirsa buton bara "yapisik"
      // gorunup dengesiz duruyordu. Ust bosluk biraz artirilip buton
      // barin icinde daha dengeli konumlaniyor.
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      // Eskiden buradaki buyuk/yayilan "raised" golge (kartlar/modal'lar icin
      // tasarlanmis) bu sabit alt barı, uzerindeki icerikten kopuk, havada
      // asili bir kart gibi gosteriyordu. Ust kenarlik zaten ayrimi net
      // yapiyor - ekstra golgeye gerek yok, boylece bar ekrana yapisik/sabit
      // duruyor.
    },
    soldBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    soldBarText: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.text,
    },
    notFound: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      padding: spacing.lg,
    },
    notFoundText: {
      ...typography.headline,
      color: colors.textMuted,
    },
  });
}
