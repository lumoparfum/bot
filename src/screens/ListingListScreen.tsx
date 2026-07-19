import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandMark } from '../components/BrandMark';
import { CategoryChip } from '../components/CategoryChip';
import { ListingCard } from '../components/ListingCard';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { colors, radius, spacing, typography } from '../constants/theme';
import { categories } from '../types/listing';
import type { Listing, ListingLocation } from '../types/listing';
import { fetchListings } from '../services/firestore';
import {
  DISTANCE_FILTERS,
  distanceKm,
  formatDistance,
  hasLocationPermission,
  reverseGeocodeLabel,
  requestAndGetLocation,
  type Coordinates,
} from '../utils/location';
import type { HomeStackParamList } from '../types/navigation';

const ALL = 'Tümü';

type Props = NativeStackScreenProps<HomeStackParamList, 'ListingList'>;

export default function ListingListScreen({ navigation }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const [query, setQuery] = useState('');

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const loadListings = useCallback(async () => {
    try {
      setLoadError(false);
      const data = await fetchListings();
      setListings(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [loadListings])
  );

  useEffect(() => {
    (async () => {
      const granted = await hasLocationPermission();
      if (!granted) return;
      const coords = await requestAndGetLocation();
      if (!coords) return;
      setUserLocation(coords);
      const label = await reverseGeocodeLabel(coords);
      setLocationLabel(label ?? 'Konumum');
    })();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const handleRadiusPress = (km: number | null) => {
    setSelectedRadius(km);
    if (km !== null && !userLocation) {
      setPickerVisible(true);
    }
  };

  const handleLocationSelect = (location: ListingLocation) => {
    setLocationLabel(location.label);
    if (location.latitude != null && location.longitude != null) {
      setUserLocation({ latitude: location.latitude, longitude: location.longitude });
    }
  };

  const rows = useMemo(() => {
    return listings
      .map((listing) => {
        const distance =
          userLocation && listing.location.latitude != null && listing.location.longitude != null
            ? distanceKm(userLocation, {
                latitude: listing.location.latitude,
                longitude: listing.location.longitude,
              })
            : null;
        return { listing, distance };
      })
      .filter(({ listing, distance }) => {
        const matchesCategory = selectedCategory === ALL || listing.category === selectedCategory;
        const matchesQuery = listing.title.toLowerCase().includes(query.trim().toLowerCase());
        const matchesRadius = selectedRadius === null || (distance !== null && distance <= selectedRadius);
        return matchesCategory && matchesQuery && matchesRadius;
      })
      .sort((a, b) => {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        return b.listing.createdAt - a.listing.createdAt;
      });
  }, [listings, selectedCategory, query, selectedRadius, userLocation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.listing.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <BrandMark size={32} />
                <Text style={styles.brandText}>Stop82</Text>
              </View>
              <View style={styles.bellButton}>
                <Ionicons name="notifications-outline" size={20} color={colors.navy} />
              </View>
            </View>

            <Text style={styles.title}>İkinci el, ilk elden fırsat</Text>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ne arıyorsun?"
                placeholderTextColor={colors.textFaint}
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {[ALL, ...categories].map((item) => (
                <CategoryChip
                  key={item}
                  label={item}
                  selected={item === selectedCategory}
                  onPress={() => setSelectedCategory(item)}
                />
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <Pressable style={styles.locationChip} onPress={() => setPickerVisible(true)}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={styles.locationChipText} numberOfLines={1}>
                  {locationLabel ?? 'Konum Seç'}
                </Text>
              </Pressable>
              <CategoryChip
                label={ALL}
                selected={selectedRadius === null}
                onPress={() => handleRadiusPress(null)}
              />
              {DISTANCE_FILTERS.map((km) => (
                <CategoryChip
                  key={km}
                  label={`${km} km`}
                  selected={selectedRadius === km}
                  onPress={() => handleRadiusPress(km)}
                />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={item.listing}
            distanceLabel={item.distance !== null ? formatDistance(item.distance) : undefined}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.listing.id })}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons
                name={loadError ? 'cloud-offline-outline' : 'search-outline'}
                size={28}
                color={colors.textFaint}
              />
              <Text style={styles.emptyText}>
                {loadError
                  ? 'İlanlar yüklenemedi. Aşağı çekip tekrar dene.'
                  : 'Aramanla eşleşen ilan bulunamadı.'}
              </Text>
            </View>
          ) : null
        }
      />

      <LocationPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleLocationSelect}
      />
    </SafeAreaView>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandText: {
    ...typography.title3,
    color: colors.navy,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  chipRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    maxWidth: 160,
  },
  locationChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.subhead,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
