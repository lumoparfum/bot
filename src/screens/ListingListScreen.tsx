import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { showAlert } from '../components/AppAlert';
import { Wordmark } from '../components/Wordmark';
import { CategoryChip } from '../components/CategoryChip';
import { IconButton } from '../components/IconButton';
import { ListingCard } from '../components/ListingCard';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { PrimaryButton } from '../components/PrimaryButton';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { categories, categoryIcons, conditions, getAttributeDefs, subcategories } from '../types/listing';
import type { AttributeDef, Listing, ListingLocation } from '../types/listing';
import { fetchListings } from '../services/firestore';
import { fetchBlockedUserIds } from '../services/blocks';
import { createSavedSearch } from '../services/savedSearches';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { formatNumberInput } from '../utils/format';
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

type SortOption = 'newest' | 'priceAsc' | 'priceDesc' | 'distance';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'En Yeni',
  priceAsc: 'Fiyat: Düşük → Yüksek',
  priceDesc: 'Fiyat: Yüksek → Düşük',
  distance: 'Yakınıma Göre',
};

type Props = NativeStackScreenProps<HomeStackParamList, 'ListingList'>;

export default function ListingListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount: unreadNotifications } = useNotifications();
  const requireAuth = useRequireAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // Marka/Beden/Numara/Renk gibi kategoriye ozel filtreler - kategori ya da
  // alt kategori degisince eski secili ozellikler artik gecersiz olabilir
  // (mesela Giyim'den Elektronik'e gecince "Beden: M" anlamsizlasir), o
  // yuzden ikisi degisince de sifirlaniyor.
  const [selectedAttrFilters, setSelectedAttrFilters] = useState<Record<string, string>>({});

  const handleSelectCategory = (item: string) => {
    setSelectedCategory(item);
    setSelectedSubcategory(null);
    setSelectedAttrFilters({});
  };

  const handleSelectSubcategory = (sub: string | null) => {
    setSelectedSubcategory(sub);
    setSelectedAttrFilters({});
  };

  const attrFilterDefs = useMemo(
    () =>
      getAttributeDefs(selectedCategory === ALL ? null : selectedCategory, selectedSubcategory).filter(
        (def): def is Extract<AttributeDef, { options: string[] }> =>
          def.type !== 'number' && def.type !== 'text'
      ),
    [selectedCategory, selectedSubcategory]
  );

  const handleToggleAttrFilter = (key: string, value: string) => {
    setSelectedAttrFilters((prev) => {
      if (prev[key] === value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  };

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationFilterActive, setLocationFilterActive] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const hasActiveFilters =
    sortOption !== 'newest' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    locationFilterActive ||
    selectedCondition !== null ||
    Object.keys(selectedAttrFilters).length > 0;

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
      if (user) {
        fetchBlockedUserIds(user.uid).then((ids) => setBlockedIds(new Set(ids)));
      } else {
        setBlockedIds(new Set());
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadListings, user])
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
    if (km !== null) {
      if (!userLocation) {
        setPickerVisible(true);
        return;
      }
      setLocationFilterActive(true);
    }
  };

  const handleLocationSelect = (location: ListingLocation) => {
    setLocationLabel(location.label);
    setLocationFilterActive(true);
    if (location.latitude != null && location.longitude != null) {
      setUserLocation({ latitude: location.latitude, longitude: location.longitude });
    }
  };

  const handleClearLocation = () => {
    setLocationLabel(null);
    setUserLocation(null);
    setLocationFilterActive(false);
    setSelectedRadius(null);
  };

  const handleSaveSearch = () => {
    if (!requireAuth() || !user) return;
    if (!query.trim() && selectedCategory === ALL && !minPrice && !maxPrice) {
      showAlert('Arama Boş', 'Kaydetmeden önce bir arama yazın ya da filtre seçin.');
      return;
    }
    createSavedSearch({
      uid: user.uid,
      query: query.trim(),
      category: selectedCategory === ALL ? null : selectedCategory,
      subcategory: selectedSubcategory,
      attributes: selectedAttrFilters,
      minPrice: minPrice ? Number(minPrice) : null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
    })
      .then(() => showAlert('Kaydedildi', 'Bu kritere uyan yeni ilan geldiğinde bildirim alacaksın.'))
      .catch(() => showAlert('Hata', 'Arama kaydedilemedi, tekrar dene.'));
  };

  const handleClearFilters = () => {
    setSortOption('newest');
    setMinPrice('');
    setMaxPrice('');
    setSelectedRadius(null);
    setLocationFilterActive(false);
    setSelectedCondition(null);
    setSelectedAttrFilters({});
  };

  const rows = useMemo(() => {
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;

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
      .filter(({ listing }) => !blockedIds.has(listing.sellerId))
      .filter(({ listing, distance }) => {
        const matchesCategory = selectedCategory === ALL || listing.category === selectedCategory;
        const matchesSubcategory =
          !selectedSubcategory || listing.subcategory === selectedSubcategory;
        const matchesCondition = !selectedCondition || listing.condition === selectedCondition;
        const matchesAttrs = Object.entries(selectedAttrFilters).every(
          ([key, value]) => listing.attributes[key] === value
        );
        // Baslikla sinirli kalmasin - aciklama ve marka/model/beden gibi
        // yapilandirilmis ozelliklerde de arasin.
        const q = query.trim().toLocaleLowerCase('tr-TR');
        const matchesQuery =
          !q ||
          listing.title.toLocaleLowerCase('tr-TR').includes(q) ||
          listing.description.toLocaleLowerCase('tr-TR').includes(q) ||
          Object.values(listing.attributes).some((value) =>
            value.toLocaleLowerCase('tr-TR').includes(q)
          );
        const matchesMin = min === null || listing.price >= min;
        const matchesMax = max === null || listing.price <= max;

        let matchesLocation = true;
        if (locationFilterActive) {
          if (selectedRadius !== null) {
            // Km secilmisse tam mesafeye gore filtrele.
            matchesLocation = distance !== null && distance <= selectedRadius;
          } else {
            // Km secilmemisse ("Tumu") sehir adina gore filtrele - kullanici
            // sadece il/ilce bazinda arayabilsin, kesin mesafe sart olmasin.
            const cityQuery = locationLabel?.split(',').pop()?.trim().toLocaleLowerCase('tr-TR');
            matchesLocation = !cityQuery
              || listing.location.label.toLocaleLowerCase('tr-TR').includes(cityQuery);
          }
        }

        return (
          matchesCategory &&
          matchesSubcategory &&
          matchesCondition &&
          matchesAttrs &&
          matchesQuery &&
          matchesLocation &&
          matchesMin &&
          matchesMax
        );
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'priceAsc':
            return a.listing.price - b.listing.price;
          case 'priceDesc':
            return b.listing.price - a.listing.price;
          case 'distance':
            if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
            if (a.distance !== null) return -1;
            if (b.distance !== null) return 1;
            return b.listing.createdAt - a.listing.createdAt;
          case 'newest':
          default:
            return b.listing.createdAt - a.listing.createdAt;
        }
      });
  }, [
    listings,
    blockedIds,
    selectedCategory,
    selectedSubcategory,
    selectedCondition,
    selectedAttrFilters,
    query,
    selectedRadius,
    userLocation,
    locationFilterActive,
    locationLabel,
    sortOption,
    minPrice,
    maxPrice,
  ]);

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
                <Wordmark size={24} />
              </View>
              <View style={styles.topBarActions}>
                <IconButton onPress={() => setFilterModalVisible(true)} accessibilityLabel="Filtrele">
                  <Ionicons name="options-outline" size={20} color={colors.text} />
                  {hasActiveFilters && <View style={styles.activeDot} />}
                </IconButton>
                <IconButton
                  onPress={() => {
                    if (requireAuth()) navigation.navigate('Notifications');
                  }}
                  accessibilityLabel="Bildirimler"
                >
                  <Ionicons name="notifications-outline" size={20} color={colors.text} />
                  {unreadNotifications > 0 && <View style={styles.activeDot} />}
                </IconButton>
              </View>
            </View>

            <Text style={styles.title}>Ücretsiz. Güvenli. Yakınında.</Text>

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
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textFaint} />
                </Pressable>
              )}
              <Pressable onPress={handleSaveSearch} hitSlop={8}>
                <Ionicons name="bookmark-outline" size={18} color={colors.textMuted} />
              </Pressable>
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
                  icon={categoryIcons[item]}
                  selected={item === selectedCategory}
                  onPress={() => handleSelectCategory(item)}
                />
              ))}
            </ScrollView>

            {selectedCategory !== ALL && subcategories[selectedCategory] && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subChipRow}
              >
                <CategoryChip
                  label={ALL}
                  selected={selectedSubcategory === null}
                  onPress={() => handleSelectSubcategory(null)}
                />
                {subcategories[selectedCategory].map((sub) => (
                  <CategoryChip
                    key={sub}
                    label={sub}
                    selected={sub === selectedSubcategory}
                    onPress={() => handleSelectSubcategory(sub)}
                  />
                ))}
              </ScrollView>
            )}
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

      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.filterSheet, { paddingBottom: spacing.xl + insets.bottom }]}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filtrele & Sırala</Text>
              <Pressable onPress={() => setFilterModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Pressable
              style={styles.savedSearchesLink}
              onPress={() => {
                setFilterModalVisible(false);
                if (requireAuth()) navigation.navigate('SavedSearches');
              }}
            >
              <Ionicons name="bookmark" size={15} color={colors.primary} />
              <Text style={styles.savedSearchesLinkText}>Kayıtlı Aramalarım</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
            </Pressable>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.filterSectionLabel}>Konum</Text>
              <Pressable
                style={[styles.locationRow, locationFilterActive && styles.locationRowActive]}
                onPress={() => setPickerVisible(true)}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={locationFilterActive ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[styles.locationRowText, !locationLabel && styles.locationRowPlaceholder]}
                  numberOfLines={1}
                >
                  {locationLabel ?? 'Konum seç (GPS veya şehir)'}
                </Text>
                {locationFilterActive ? (
                  <Pressable onPress={handleClearLocation} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textFaint} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                )}
              </Pressable>
              <Text style={styles.locationHint}>
                {locationFilterActive
                  ? selectedRadius !== null
                    ? `${selectedRadius} km yarıçapındaki ilanlar gösteriliyor`
                    : 'Sadece bu şehirdeki ilanlar gösteriliyor'
                  : 'Bir şehir seçip filtreleyebilir, istersen km ile daraltabilirsin'}
              </Text>
              <View style={[styles.sortOptions, styles.radiusOptions]}>
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
              </View>

              <Text style={styles.filterSectionLabel}>Sıralama</Text>
              <View style={styles.sortOptions}>
                {(Object.keys(SORT_LABELS) as SortOption[])
                  .filter((option) => option !== 'distance' || userLocation)
                  .map((option) => (
                    <CategoryChip
                      key={option}
                      label={SORT_LABELS[option]}
                      selected={sortOption === option}
                      onPress={() => setSortOption(option)}
                    />
                  ))}
              </View>

              <Text style={styles.filterSectionLabel}>Fiyat Aralığı</Text>
              <View style={styles.priceRangeRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min ₺"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  value={formatNumberInput(minPrice)}
                  onChangeText={(text) => setMinPrice(text.replace(/[^0-9]/g, ''))}
                />
                <Text style={styles.priceRangeDash}>—</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max ₺"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  value={formatNumberInput(maxPrice)}
                  onChangeText={(text) => setMaxPrice(text.replace(/[^0-9]/g, ''))}
                />
              </View>

              <Text style={styles.filterSectionLabel}>Durum</Text>
              <View style={styles.sortOptions}>
                <CategoryChip
                  label={ALL}
                  selected={selectedCondition === null}
                  onPress={() => setSelectedCondition(null)}
                />
                {conditions.map((item) => (
                  <CategoryChip
                    key={item}
                    label={item}
                    selected={selectedCondition === item}
                    onPress={() => setSelectedCondition(item)}
                  />
                ))}
              </View>

              {attrFilterDefs.map((def) => (
                <View key={def.key}>
                  <Text style={styles.filterSectionLabel}>{def.label}</Text>
                  <View style={styles.sortOptions}>
                    {def.options.map((option) => (
                      <CategoryChip
                        key={option}
                        label={option}
                        selected={selectedAttrFilters[def.key] === option}
                        onPress={() => handleToggleAttrFilter(def.key, option)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.filterActions}>
              <View style={styles.filterActionButton}>
                <PrimaryButton label="Temizle" variant="outline" onPress={handleClearFilters} />
              </View>
              <View style={styles.filterActionButton}>
                <PrimaryButton label="Uygula" onPress={() => setFilterModalVisible(false)} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    topBarActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    activeDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    title: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.textMuted,
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
      paddingBottom: spacing.sm,
    },
    subChipRow: {
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    locationRowActive: {
      borderColor: colors.primary,
    },
    locationRowText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    locationRowPlaceholder: {
      color: colors.textFaint,
      fontWeight: '400',
    },
    locationHint: {
      ...typography.caption,
      color: colors.textFaint,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    radiusOptions: {
      marginBottom: spacing.sm,
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
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(26, 34, 56, 0.5)',
      justifyContent: 'flex-end',
    },
    filterSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: '85%',
    },
    filterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    filterTitle: {
      ...typography.title3,
      color: colors.text,
    },
    savedSearchesLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primaryLight,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      marginBottom: spacing.sm,
    },
    savedSearchesLinkText: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.primaryDark,
      flex: 1,
    },
    filterSectionLabel: {
      ...typography.footnote,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    sortOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    priceRangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    priceInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
    },
    priceRangeDash: {
      color: colors.textFaint,
      fontSize: 16,
    },
    filterActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    filterActionButton: {
      flex: 1,
    },
  });
}
