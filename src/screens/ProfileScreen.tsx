import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ListingCard } from '../components/ListingCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { fetchFavoriteListings, fetchListingsBySeller } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import type { Listing } from '../types/listing';
import type { MainTabParamList } from '../types/navigation';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;
type Segment = 'mine' | 'favorites';

export default function ProfileScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [segment, setSegment] = useState<Segment>('mine');
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [mine, favs] = await Promise.all([
        fetchListingsBySeller(user.uid),
        fetchFavoriteListings(user.uid),
      ]);
      setMyListings(mine);
      setFavorites(favs);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openListing = (listingId: string) => {
    navigation.navigate('HomeTab', { screen: 'ListingDetail', params: { listingId } });
  };

  const data = segment === 'mine' ? myListings : favorites;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user?.displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.headerText}>
                <Text style={styles.name} numberOfLines={1}>
                  {user?.displayName ?? 'Stop82 Kullanıcısı'}
                </Text>
                {user?.email && (
                  <Text style={styles.email} numberOfLines={1}>
                    {user.email}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.segmentRow}>
              <SegmentButton
                label="İlanlarım"
                active={segment === 'mine'}
                onPress={() => setSegment('mine')}
              />
              <SegmentButton
                label="Favorilerim"
                active={segment === 'favorites'}
                onPress={() => setSegment('favorites')}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => <ListingCard listing={item} onPress={() => openListing(item.id)} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name={segment === 'mine' ? 'pricetag-outline' : 'heart-outline'}
                size={28}
                color={colors.textFaint}
              />
              <Text style={styles.emptyText}>
                {segment === 'mine'
                  ? 'Henüz ilan vermedin.'
                  : 'Henüz favori ilanın yok. Beğendiğin ilanlarda kalp ikonuna dokun.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.signOutWrap}>
            <PrimaryButton label="Çıkış Yap" variant="outline" onPress={signOut} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 24,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.title3,
    color: colors.text,
  },
  email: {
    ...typography.subhead,
    color: colors.textMuted,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentButton: {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.background,
    ...shadows.card,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentLabelActive: {
    color: colors.text,
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
  loading: {
    marginTop: spacing.xl,
  },
  signOutWrap: {
    marginTop: spacing.lg,
  },
});
