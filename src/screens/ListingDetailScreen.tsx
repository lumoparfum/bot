import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IconButton } from '../components/IconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { formatPrice, formatRelativeDate } from '../utils/format';
import { fetchListingById } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import type { Listing } from '../types/listing';
import type { HomeStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'ListingDetail'>;

export default function ListingDetailScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchListingById(listingId)
      .then((result) => {
        if (!cancelled) setListing(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

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
  const favorited = isFavorite(listing.id);

  // TODO: Gerçek mesajlaşma/arama akışı (bildirimler + sohbet ekranı)
  // eklendiğinde burada tetiklenecek. Şimdilik demo geri bildirimi.
  const handleContact = (type: 'call' | 'message') => {
    Alert.alert(type === 'call' ? 'Arama' : 'Mesaj', 'Bu özellik yakında aktif olacak.');
  };

  return (
    <View style={styles.container}>
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
                <Image
                  key={uri}
                  source={{ uri }}
                  style={{ width, height: imageHeight }}
                  contentFit="cover"
                />
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
            <View style={styles.tag}>
              <Text style={styles.tagText}>{listing.condition}</Text>
            </View>
          </View>

          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <Text style={styles.metaText}>{listing.location.label || 'Konum belirtilmemiş'}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>{formatRelativeDate(listing.createdAt)}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionHeading}>Açıklama</Text>
          <Text style={styles.description}>{listing.description}</Text>

          <View style={styles.divider} />

          <View style={styles.sellerRow}>
            {listing.sellerPhotoURL ? (
              <Image source={{ uri: listing.sellerPhotoURL }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{listing.sellerName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{listing.sellerName}</Text>
              <Text style={styles.sellerMeta}>Stop82 Üyesi</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <View style={[styles.headerControls, { top: insets.top + spacing.sm }]}>
        <IconButton
          variant="translucent"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Geri"
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </IconButton>
        <View style={styles.headerRightControls}>
          <IconButton
            variant="translucent"
            onPress={() => toggleFavorite(listing.id)}
            accessibilityLabel={favorited ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          >
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={19}
              color={favorited ? colors.primary : '#fff'}
            />
          </IconButton>
          <IconButton variant="translucent" onPress={() => {}} accessibilityLabel="Paylaş">
            <Ionicons name="share-outline" size={19} color="#fff" />
          </IconButton>
        </View>
      </View>

      {!isOwnListing && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.bottomBarButtons}>
            <View style={styles.callButtonWrap}>
              <PrimaryButton
                label="Ara"
                variant="outline"
                onPress={() => handleContact('call')}
                icon={<Ionicons name="call-outline" size={18} color={colors.navy} />}
              />
            </View>
            <View style={styles.messageButtonWrap}>
              <PrimaryButton
                label="Mesaj Gönder"
                onPress={() => handleContact('message')}
                icon={<Ionicons name="chatbubble-outline" size={18} color="#fff" />}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.navy,
  },
  title: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.largeTitle,
    color: colors.primary,
    marginBottom: spacing.md,
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
    gap: 2,
  },
  sellerName: {
    ...typography.headline,
    color: colors.text,
  },
  sellerMeta: {
    ...typography.caption,
    color: colors.textMuted,
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
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...shadows.raised,
  },
  bottomBarButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  callButtonWrap: {
    width: 110,
  },
  messageButtonWrap: {
    flex: 1,
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
