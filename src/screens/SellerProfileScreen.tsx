import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IconButton } from '../components/IconButton';
import { ListingCard } from '../components/ListingCard';
import { spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchListingsBySeller } from '../services/firestore';
import type { Listing } from '../types/listing';
import type { HomeStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'SellerProfile'>;

export default function SellerProfileScreen({ route, navigation }: Props) {
  const { sellerId, sellerName } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchListingsBySeller(sellerId)
      .then((result) => {
        if (!cancelled) setListings(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const sellerPhotoURL = listings[0]?.sellerPhotoURL ?? null;

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
  });
}
