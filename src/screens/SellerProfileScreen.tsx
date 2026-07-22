import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { showAlert } from '../components/AppAlert';
import { IconButton } from '../components/IconButton';
import { ListingCard } from '../components/ListingCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { RatingModal } from '../components/RatingModal';
import { ReportModal } from '../components/ReportModal';
import { StarRating } from '../components/StarRating';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { blockUser, isUserBlocked, unblockUser } from '../services/blocks';
import { fetchListingsBySeller } from '../services/firestore';
import { fetchUserRatingSummary, fetchUserReviews, hasPurchasedFrom, submitReview } from '../services/reviews';
import { submitReport } from '../services/reports';
import { formatAccountAge, formatLastActive, formatRelativeDate } from '../utils/format';
import type { Listing } from '../types/listing';
import type { Review, UserRatingSummary } from '../types/review';
import type { HomeStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'SellerProfile'>;

const EMPTY_SUMMARY: UserRatingSummary = {
  ratingSum: 0,
  ratingCount: 0,
  salesCount: 0,
  contactedCount: 0,
  responseCount: 0,
  responseTimeTotalMinutes: 0,
  accountType: 'individual',
  createdAt: null,
  lastActiveAt: null,
};

// Yaniltici olmasin diye en az birkac ornek ve makul bir yanit orani
// olmadan rozet gosterilmez.
const MIN_SAMPLES_FOR_RESPONSE_BADGE = 3;
const MIN_RESPONSE_RATE = 0.5;

type ResponseBadge = { label: string; tone: 'fast' | 'normal' };

function getResponseBadge(summary: UserRatingSummary): ResponseBadge | null {
  if (summary.responseCount < MIN_SAMPLES_FOR_RESPONSE_BADGE || summary.contactedCount === 0) {
    return null;
  }
  const responseRate = summary.responseCount / summary.contactedCount;
  if (responseRate < MIN_RESPONSE_RATE) return null;

  const avgMinutes = summary.responseTimeTotalMinutes / summary.responseCount;
  let timeLabel: string;
  let tone: ResponseBadge['tone'] = 'normal';
  if (avgMinutes < 30) {
    timeLabel = 'birkaç dakika içinde';
    tone = 'fast';
  } else if (avgMinutes < 120) {
    timeLabel = 'yaklaşık 1 saat içinde';
    tone = 'fast';
  } else if (avgMinutes < 24 * 60) {
    timeLabel = `${Math.max(1, Math.round(avgMinutes / 60))} saat içinde`;
  } else {
    timeLabel = 'birkaç gün içinde';
  }
  return { label: `Genelde ${timeLabel} yanıtlıyor`, tone };
}

export default function SellerProfileScreen({ route, navigation }: Props) {
  const { sellerId, sellerName } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<UserRatingSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listingResult, reviewResult, summaryResult] = await Promise.all([
        fetchListingsBySeller(sellerId),
        fetchUserReviews(sellerId),
        fetchUserRatingSummary(sellerId),
        user ? hasPurchasedFrom(user.uid, sellerId).then(setCanReview) : Promise.resolve(),
        user ? isUserBlocked(user.uid, sellerId).then(setBlocked) : Promise.resolve(),
      ]);
      setListings(listingResult);
      setReviews(reviewResult);
      setSummary(summaryResult);
    } finally {
      setLoading(false);
    }
  }, [sellerId, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sellerPhotoURL = listings[0]?.sellerPhotoURL ?? null;
  const isOwnProfile = user?.uid === sellerId;
  const averageRating = summary.ratingCount > 0 ? summary.ratingSum / summary.ratingCount : 0;
  const responseBadge = useMemo(() => getResponseBadge(summary), [summary]);
  const myReview = reviews.find((r) => r.raterId === user?.uid);

  const handleOpenRating = () => {
    if (!requireAuth() || !canReview) return;
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async (rating: number, comment: string) => {
    if (!user) return;
    await submitReview({
      ratedUserId: sellerId,
      raterId: user.uid,
      raterName: user.displayName ?? 'Stop82 Kullanıcısı',
      raterPhotoURL: user.photoURL,
      rating,
      comment,
    });
    load();
  };

  const handleOpenVerifiedInfo = () => {
    showAlert(
      'Doğrulanmış Hesap',
      'Bu kullanıcı gerçek bir Google veya Apple hesabıyla giriş yaptı, sahte/bot hesap değil.'
    );
  };

  const handleOpenReport = () => {
    if (!requireAuth()) return;
    setReportModalVisible(true);
  };

  const handleSubmitReport = async (reason: string) => {
    if (!user) return;
    await submitReport({
      type: 'user',
      targetId: sellerId,
      targetOwnerId: sellerId,
      reporterId: user.uid,
      reporterName: user.displayName ?? 'Stop82 Kullanıcısı',
      reason,
    });
  };

  const handleToggleBlock = () => {
    if (!requireAuth() || !user) return;
    if (blocked) {
      unblockUser(user.uid, sellerId)
        .then(() => setBlocked(false))
        .catch(() => showAlert('Hata', 'Engel kaldırılamadı, tekrar dene.'));
      return;
    }
    showAlert(
      'Kullanıcıyı Engelle',
      `${sellerName} bir daha sana mesaj gönderemeyecek. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: () => {
            blockUser(user.uid, sellerId)
              .then(() => setBlocked(true))
              .catch(() => showAlert('Hata', 'Engellenemedi, tekrar dene.'));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xxl + insets.bottom }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <IconButton onPress={() => navigation.goBack()} accessibilityLabel="Geri">
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </IconButton>
            <View style={styles.profileBlock}>
              {sellerPhotoURL ? (
                <Image source={{ uri: sellerPhotoURL }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{sellerName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.nameRow}>
                <Text style={styles.name}>{sellerName}</Text>
                <Pressable onPress={handleOpenVerifiedInfo} hitSlop={8}>
                  <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
                </Pressable>
                {summary.accountType === 'business' && (
                  <View style={styles.businessTag}>
                    <Ionicons name="briefcase" size={11} color={colors.navy} />
                    <Text style={styles.businessTagText}>İşletme</Text>
                  </View>
                )}
              </View>

              {(summary.createdAt || summary.lastActiveAt) && (
                <Text style={styles.subMeta}>
                  {[
                    summary.createdAt ? formatAccountAge(summary.createdAt) : null,
                    summary.lastActiveAt ? formatLastActive(summary.lastActiveAt) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  {summary.ratingCount > 0 ? (
                    <>
                      <StarRating value={averageRating} size={15} />
                      <Text style={styles.statText}>
                        {averageRating.toFixed(1)} ({summary.ratingCount})
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.statText}>Henüz değerlendirme yok</Text>
                  )}
                </View>
                <View style={styles.statDot} />
                <Text style={styles.statText}>{summary.salesCount} satış</Text>
              </View>

              {responseBadge && (
                <View
                  style={[
                    styles.responseBadge,
                    responseBadge.tone === 'fast' && styles.responseBadgeFast,
                  ]}
                >
                  <Ionicons
                    name="flash"
                    size={12}
                    color={responseBadge.tone === 'fast' ? colors.success : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.responseBadgeText,
                      responseBadge.tone === 'fast' && styles.responseBadgeTextFast,
                    ]}
                  >
                    {responseBadge.label}
                  </Text>
                </View>
              )}

              {!isOwnProfile && (
                <>
                  {canReview ? (
                    <View style={styles.rateButton}>
                      <PrimaryButton
                        label={myReview ? 'Değerlendirmeni Düzenle' : 'Değerlendir'}
                        variant="outline"
                        onPress={handleOpenRating}
                        icon={<Ionicons name="star-outline" size={16} color={colors.text} />}
                      />
                    </View>
                  ) : (
                    <Text style={styles.reviewGateText}>
                      Değerlendirebilmek için bu kullanıcıdan onaylanmış bir alışverişin olmalı
                    </Text>
                  )}
                  <View style={styles.linkRow}>
                    <Pressable onPress={handleOpenReport} hitSlop={8} style={styles.reportLink}>
                      <Ionicons name="flag-outline" size={13} color={colors.textFaint} />
                      <Text style={styles.reportLinkText}>Şikayet Et</Text>
                    </Pressable>
                    <View style={styles.linkDot} />
                    <Pressable onPress={handleToggleBlock} hitSlop={8} style={styles.reportLink}>
                      <Ionicons
                        name={blocked ? 'lock-open-outline' : 'ban-outline'}
                        size={13}
                        color={colors.textFaint}
                      />
                      <Text style={styles.reportLinkText}>
                        {blocked ? 'Engeli Kaldır' : 'Engelle'}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={() => navigation.push('ListingDetail', { listingId: item.id })}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={28} color={colors.textFaint} />
              <Text style={styles.emptyText}>Bu kullanıcının yayında ilanı yok.</Text>
            </View>
          )
        }
        ListFooterComponent={
          reviews.length > 0 ? (
            <View style={styles.reviewsSection}>
              <Text style={styles.reviewsHeading}>Değerlendirmeler</Text>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    {review.raterPhotoURL ? (
                      <Image source={{ uri: review.raterPhotoURL }} style={styles.reviewAvatar} />
                    ) : (
                      <View style={styles.reviewAvatarFallback}>
                        <Text style={styles.reviewAvatarText}>{review.raterName.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={styles.reviewHeaderText}>
                      <Text style={styles.reviewerName}>{review.raterName}</Text>
                      <StarRating value={review.rating} size={13} />
                    </View>
                    <Text style={styles.reviewDate}>{formatRelativeDate(review.createdAt)}</Text>
                  </View>
                  {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                </View>
              ))}
            </View>
          ) : null
        }
      />

      <RatingModal
        visible={ratingModalVisible}
        targetName={sellerName}
        onClose={() => setRatingModalVisible(false)}
        onSubmit={handleSubmitRating}
        initialRating={myReview?.rating}
        initialComment={myReview?.comment}
      />
      <ReportModal
        visible={reportModalVisible}
        title="Kullanıcıyı Şikayet Et"
        reportType="user"
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleSubmitReport}
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
    listContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
    },
    columnWrapper: {
      gap: spacing.md,
    },
    header: {
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    profileBlock: {
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surface,
    },
    avatarText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 26,
    },
    nameRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    name: {
      ...typography.title3,
      color: colors.text,
    },
    businessTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    businessTagText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '700',
      color: colors.navy,
    },
    subMeta: {
      ...typography.caption,
      color: colors.textFaint,
      marginTop: 2,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    statDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.textFaint,
    },
    responseBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
    },
    responseBadgeFast: {
      backgroundColor: colors.primaryLight,
    },
    responseBadgeText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textMuted,
    },
    responseBadgeTextFast: {
      color: colors.success,
    },
    rateButton: {
      marginTop: spacing.md,
      minWidth: 160,
    },
    reviewGateText: {
      ...typography.caption,
      color: colors.textFaint,
      textAlign: 'center',
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    linkDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.textFaint,
    },
    reportLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    reportLinkText: {
      ...typography.caption,
      color: colors.textFaint,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing.xl,
      gap: spacing.sm,
    },
    emptyText: {
      ...typography.subhead,
      color: colors.textMuted,
    },
    loading: {
      marginTop: spacing.xl,
    },
    reviewsSection: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    reviewsHeading: {
      ...typography.headline,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    reviewCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.xs,
    },
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    reviewAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background,
    },
    reviewAvatarFallback: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewAvatarText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    reviewHeaderText: {
      flex: 1,
      gap: 2,
    },
    reviewerName: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.text,
    },
    reviewDate: {
      ...typography.caption,
      color: colors.textFaint,
    },
    reviewComment: {
      ...typography.subhead,
      color: colors.textMuted,
    },
  });
}
