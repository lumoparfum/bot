import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IconButton } from '../components/IconButton';
import { ListingCard } from '../components/ListingCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { RatingModal } from '../components/RatingModal';
import { StarRating } from '../components/StarRating';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { fetchListingsBySeller } from '../services/firestore';
import { fetchUserRatingSummary, fetchUserReviews, submitReview } from '../services/reviews';
import { formatRelativeDate } from '../utils/format';
import type { Listing } from '../types/listing';
import type { Review, UserRatingSummary } from '../types/review';
import type { HomeStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'SellerProfile'>;

const EMPTY_SUMMARY: UserRatingSummary = { ratingSum: 0, ratingCount: 0, salesCount: 0 };

export default function SellerProfileScreen({ route, navigation }: Props) {
  const { sellerId, sellerName } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const requireAuth = useRequireAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<UserRatingSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listingResult, reviewResult, summaryResult] = await Promise.all([
        fetchListingsBySeller(sellerId),
        fetchUserReviews(sellerId),
        fetchUserRatingSummary(sellerId),
      ]);
      setListings(listingResult);
      setReviews(reviewResult);
      setSummary(summaryResult);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sellerPhotoURL = listings[0]?.sellerPhotoURL ?? null;
  const isOwnProfile = user?.uid === sellerId;
  const averageRating = summary.ratingCount > 0 ? summary.ratingSum / summary.ratingCount : 0;

  const handleOpenRating = () => {
    if (!requireAuth()) return;
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

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
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
              <Text style={styles.name}>{sellerName}</Text>
              <Text style={styles.meta}>Stop82 Üyesi</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <StarRating value={averageRating} size={15} />
                  <Text style={styles.statText}>
                    {summary.ratingCount > 0
                      ? `${averageRating.toFixed(1)} (${summary.ratingCount})`
                      : 'Henüz değerlendirme yok'}
                  </Text>
                </View>
                <View style={styles.statDot} />
                <Text style={styles.statText}>{summary.salesCount} satış</Text>
              </View>

              {!isOwnProfile && (
                <View style={styles.rateButton}>
                  <PrimaryButton
                    label="Değerlendir"
                    variant="outline"
                    onPress={handleOpenRating}
                    icon={<Ionicons name="star-outline" size={16} color={colors.text} />}
                  />
                </View>
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
    listContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
    },
    columnWrapper: {
      gap: spacing.md,
    },
    header: {
      paddingTop: spacing.xxl,
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
    name: {
      ...typography.title3,
      color: colors.text,
      marginTop: spacing.sm,
    },
    meta: {
      ...typography.caption,
      color: colors.textMuted,
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
    rateButton: {
      marginTop: spacing.md,
      minWidth: 160,
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
