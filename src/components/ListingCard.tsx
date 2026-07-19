import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { radius, shadows, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { formatPrice, formatRelativeDate } from '../utils/format';
import { useFavorites } from '../context/FavoritesContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import type { Listing } from '../types/listing';

type Props = {
  listing: Listing;
  onPress: () => void;
  distanceLabel?: string;
};

export function ListingCard({ listing, onPress, distanceLabel }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isFavorite, toggleFavorite } = useFavorites();
  const requireAuth = useRequireAuth();
  const favorited = isFavorite(listing.id);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: listing.images[0] }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
        <Pressable
          hitSlop={8}
          onPress={() => {
            if (requireAuth()) toggleFavorite(listing.id);
          }}
          style={styles.favoriteButton}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={16}
            color={favorited ? colors.primary : '#fff'}
          />
        </Pressable>
        {listing.status === 'sold' && (
          <View style={styles.soldBadge}>
            <Text style={styles.soldBadgeText}>SATILDI</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={styles.price}>{formatPrice(listing.price)}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {listing.location.label || 'Konum belirtilmemiş'}
            {distanceLabel ? ` · ${distanceLabel}` : ''}
          </Text>
        </View>
        <Text style={styles.metaText}>{formatRelativeDate(listing.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.card,
    },
    cardPressed: {
      opacity: 0.9,
    },
    imageWrap: {
      aspectRatio: 1,
      backgroundColor: colors.surface,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    favoriteButton: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(26, 34, 56, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    soldBadge: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      backgroundColor: 'rgba(26, 34, 56, 0.85)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.sm,
    },
    soldBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    body: {
      padding: spacing.sm,
      gap: 2,
    },
    title: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.text,
    },
    price: {
      ...typography.headline,
      color: colors.primary,
      marginBottom: 2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    metaText: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });
}
