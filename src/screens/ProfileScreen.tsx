import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { showAlert } from '../components/AppAlert';
import { GuestPrompt } from '../components/GuestPrompt';
import { IconButton } from '../components/IconButton';
import { ListingCard } from '../components/ListingCard';
import { radius, shadows, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchFavoriteListings, fetchListingsBySeller } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import type { Listing } from '../types/listing';
import type { MainTabParamList, ProfileStackParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>,
  BottomTabScreenProps<MainTabParamList>
>;
type Segment = 'mine' | 'favorites';

export default function ProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { toggleFavorite } = useFavorites();
  const [segment, setSegment] = useState<Segment>('mine');
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    // Sekmeler arasi navigate('HomeTab', {...}) gecmisi Ana Sayfa'nin kendi
    // stack'ine tasiyip geri tusunu Profilim yerine Ana Sayfa'ya
    // dondurüyordu - ayni ekran artik bu stack'te de tanimli (bkz.
    // ProfileStackNavigator), o yuzden dogrudan buraya push ediliyor.
    navigation.navigate('ListingDetail', { listingId });
  };

  const handleChangeSegment = (next: Segment) => {
    setSegment(next);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

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

  const handleDeleteSelectedFavorites = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    showAlert('Favorilerden Kaldır', `${ids.length} ilan favorilerinden kaldırılacak. Emin misin?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: () => {
          ids.forEach((id) => toggleFavorite(id));
          setFavorites((prev) => prev.filter((listing) => !selectedIds.has(listing.id)));
          setSelectionMode(false);
          setSelectedIds(new Set());
        },
      },
    ]);
  };

  const handleInvite = () => {
    Share.share({
      message: 'Stop82\'de ikinci el eşyalarını al-sat! Uygulamayı dene: https://stop82.app',
    }).catch(() => {});
  };

  const data = segment === 'mine' ? myListings : favorites;

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Profilim</Text>
        </View>
        <GuestPrompt
          icon="person-outline"
          title="Profilini görmek için giriş yap"
          message="İlanlarını, favorilerini ve hesap ayarlarını görmek için önce giriş yapman gerekiyor."
        />
      </SafeAreaView>
    );
  }

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
            <View style={styles.topBar}>
              <Text style={styles.topBarTitle}>Profilim</Text>
              <View style={styles.topBarActions}>
                <IconButton onPress={handleInvite} accessibilityLabel="Arkadaşına Öner">
                  <Ionicons name="person-add-outline" size={19} color={colors.text} />
                </IconButton>
                <IconButton onPress={() => navigation.navigate('Settings')} accessibilityLabel="Ayarlar">
                  <Ionicons name="settings-outline" size={19} color={colors.text} />
                </IconButton>
              </View>
            </View>

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
                onPress={() => handleChangeSegment('mine')}
                styles={styles}
              />
              <SegmentButton
                label="Favorilerim"
                active={segment === 'favorites'}
                onPress={() => handleChangeSegment('favorites')}
                styles={styles}
              />
            </View>

            {segment === 'favorites' && favorites.length > 0 && (
              <Pressable onPress={toggleSelectionMode} style={styles.editLinkRow} hitSlop={8}>
                <Text style={styles.editLink}>{selectionMode ? 'İptal' : 'Düzenle'}</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => {
          if (segment === 'favorites' && selectionMode) {
            const selected = selectedIds.has(item.id);
            return (
              <Pressable style={styles.cardWrap} onPress={() => toggleSelect(item.id)}>
                <View pointerEvents="none">
                  <ListingCard listing={item} onPress={() => {}} />
                </View>
                <View style={styles.selectBadge}>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={selected ? colors.primary : '#fff'}
                  />
                </View>
              </Pressable>
            );
          }
          return <ListingCard listing={item} onPress={() => openListing(item.id)} />;
        }}
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
      />

      {segment === 'favorites' && selectionMode && selectedIds.size > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionBarText}>{selectedIds.size} seçili</Text>
          <Pressable style={styles.selectionBarButton} onPress={handleDeleteSelectedFavorites}>
            <Ionicons name="heart-dislike-outline" size={16} color="#fff" />
            <Text style={styles.selectionBarButtonText}>Favorilerden Kaldır</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
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
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.sm,
    },
    topBarTitle: {
      ...typography.title2,
      color: colors.text,
    },
    topBarActions: {
      flexDirection: 'row',
      gap: spacing.sm,
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
    editLinkRow: {
      alignItems: 'flex-end',
      marginBottom: spacing.sm,
    },
    editLink: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.primary,
    },
    cardWrap: {
      flex: 1,
      position: 'relative',
    },
    selectBadge: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      borderRadius: 11,
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
