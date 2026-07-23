import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
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
import { getTabBarStyle } from '../navigation/tabBarStyle';
import { searchListings, type SearchSortOption } from '../services/search';
import { fetchBlockedUserIds } from '../services/blocks';
import { createSavedSearch } from '../services/savedSearches';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { formatNumberInput } from '../utils/format';
import {
  DISTANCE_FILTERS,
  formatDistance,
  hasLocationPermission,
  reverseGeocodeLabel,
  requestAndGetLocation,
  type Coordinates,
} from '../utils/location';
import type { HomeStackParamList } from '../types/navigation';

const ALL = 'Tümü';
const HITS_PER_PAGE = 20;

type SortOption = SearchSortOption;
type ListingHit = Listing & { distanceKm: number | null };

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

  const [hits, setHits] = useState<ListingHit[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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

  // Filtrele sayfasi kalabalik gelmesin diye butun bolumler kapali baslar,
  // kullanici hangisiyle ilgileniyorsa ona dokunup acar. Ayni anda birden
  // fazla bolum acik kalabilir - "tek acik" kisitlamasi gereksiz surtunme.
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Dolap gibi rakiplerde de var: asagi kaydirinca alt sekme cubugu
  // kayboluyor, yukari kaydirinca (ya da en tepeye donunce) geri geliyor -
  // listeye daha fazla ekran alani birakiyor. tabBarStyle Tab.Navigator
  // seviyesinde tutuldugu icin navigation.getParent() ile oradan degistiriliyor.
  const tabBarHidden = useRef(false);
  const lastScrollY = useRef(0);
  const SCROLL_HIDE_THRESHOLD = 12;

  const handleListScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const delta = currentY - lastScrollY.current;
    const parent = navigation.getParent();

    if (parent) {
      // NOT: LayoutAnimation buraya kasten eklenmiyor - kullanicinin parmagi
      // hala ekranda, aktif surukleme sirasinda (FlatList kaydirirken) alt
      // barin gizlenmesiyle olusan boyut degisikligini animasyonlu yapmak
      // listenin kendi kaydirmasiyla catisiyor, "kaydirma takiliyor/zipliyor"
      // hissi veriyordu. Ani (animasyonsuz) degisim bu catismayi ortadan kaldiriyor.
      if (currentY <= 0 && tabBarHidden.current) {
        parent.setOptions({ tabBarStyle: getTabBarStyle(colors, insets.bottom) });
        tabBarHidden.current = false;
      } else if (delta > SCROLL_HIDE_THRESHOLD && !tabBarHidden.current) {
        parent.setOptions({ tabBarStyle: { display: 'none' } });
        tabBarHidden.current = true;
      } else if (delta < -SCROLL_HIDE_THRESHOLD && tabBarHidden.current) {
        parent.setOptions({ tabBarStyle: getTabBarStyle(colors, insets.bottom) });
        tabBarHidden.current = false;
      }
    }
    lastScrollY.current = currentY;
  };

  // Ekrandan ayrilirken (baska sekmeye gecince) bar gizli kalmis olabilir -
  // geri donulunce her zaman gorunur baslasin.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (tabBarHidden.current) {
          navigation.getParent()?.setOptions({ tabBarStyle: getTabBarStyle(colors, insets.bottom) });
          tabBarHidden.current = false;
          lastScrollY.current = 0;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Ana sayfa artik Firestore'dan TUM ilanlari sinirsiz cekmek yerine
  // (bkz. performans incelemesi) kendi arama sunucumuza (Meilisearch)
  // sayfali sekilde soruyor - filtre/siralama degisince sayfa 0'a donup
  // yeniden, "daha fazla yukle" ile sonraki sayfalari getiriyor.
  const cityLabel =
    locationFilterActive && selectedRadius === null
      ? locationLabel?.split(',').pop()?.trim() ?? null
      : null;

  const loadPage = useCallback(
    async (pageToLoad: number, reset: boolean) => {
      try {
        setLoadError(false);
        const result = await searchListings({
          query,
          category: selectedCategory === ALL ? null : selectedCategory,
          subcategory: selectedSubcategory,
          condition: selectedCondition,
          minPrice: minPrice ? Number(minPrice) : null,
          maxPrice: maxPrice ? Number(maxPrice) : null,
          sort: sortOption,
          userLocation: locationFilterActive ? userLocation : null,
          radiusKm: locationFilterActive ? selectedRadius : null,
          cityLabel,
          excludeSellerIds: Array.from(blockedIds),
          page: pageToLoad,
          hitsPerPage: HITS_PER_PAGE,
        });
        setHits((prev) => (reset ? result.hits : [...prev, ...result.hits]));
        setHasMore(result.hasMore);
        setPage(pageToLoad);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [
      query,
      selectedCategory,
      selectedSubcategory,
      selectedCondition,
      minPrice,
      maxPrice,
      sortOption,
      locationFilterActive,
      selectedRadius,
      userLocation,
      cityLabel,
      blockedIds,
    ]
  );

  // Yazi kutusuna yazdikca her tus vurusunda istek atmamak icin kisa bir
  // gecikme (debounce) - diger filtreler (kategori, fiyat vb.) zaten tek
  // seferlik secimler oldugu icin onlarda gecikmeye gerek yok.
  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => loadPage(0, true), query ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPage]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchBlockedUserIds(user.uid).then((ids) => setBlockedIds(new Set(ids)));
      } else {
        setBlockedIds(new Set());
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])
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

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    loadPage(page + 1, false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPage(0, true);
  };

  // LocationPickerModal, Filtrele sayfasinin (Modal) icinden aciliyor - iki
  // native Modal'i AYNI ANDA acik tutmak iOS'ta dokunma olaylarinin
  // (touch responder chain) bozulmasina yol aciyordu: ic modal kapaninca
  // arkadaki ekran tamamen tiklanamaz hale geliyordu. Bu yuzden Filtrele'yi
  // once kapatip konum secici acildikta, o kapaninca Filtrele'yi geri aciyoruz -
  // iki modal hicbir zaman ayni anda gorunmuyor.
  const handleRadiusPress = (km: number | null) => {
    setSelectedRadius(km);
    if (km !== null) {
      if (!userLocation) {
        setFilterModalVisible(false);
        setPickerVisible(true);
        return;
      }
      setLocationFilterActive(true);
    }
  };

  const handleOpenLocationPicker = () => {
    setFilterModalVisible(false);
    setPickerVisible(true);
  };

  const handleLocationPickerClose = () => {
    setPickerVisible(false);
    setFilterModalVisible(true);
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
    setLocationLabel(null);
    setUserLocation(null);
    setSelectedCondition(null);
    setSelectedAttrFilters({});
  };

  // Kategori/fiyat/konum/metin araması artık sunucuda (Meilisearch) yapılıyor.
  // Beden/Marka gibi kategoriye özel özellik filtreleri henüz sunucu
  // tarafında yok (kategori başına dinamik alanlar için ayrı bir çalışma
  // gerekiyor) - o yüzden şimdilik sadece o an yüklü sayfa üzerinde ek bir
  // daraltma olarak uygulanıyor.
  const rows = useMemo(() => {
    const filtered =
      Object.keys(selectedAttrFilters).length === 0
        ? hits
        : hits.filter((listing) =>
            Object.entries(selectedAttrFilters).every(([key, value]) => listing.attributes[key] === value)
          );
    return filtered.map((listing) => ({ listing, distance: listing.distanceKm }));
  }, [hits, selectedAttrFilters]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.listing.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        onScroll={handleListScroll}
        scrollEventThrottle={16}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <Wordmark size={24} />
              </View>
              <View style={styles.topBarActions}>
                <IconButton
                  onPress={() => navigation.navigate('SwipeDiscover')}
                  accessibilityLabel="Kaydırarak Keşfet"
                >
                  <Ionicons name="layers-outline" size={20} color={colors.text} />
                </IconButton>
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
                  : selectedCategory === 'Emlak'
                    ? 'Emlak kategorisi yakında aktif olacak.'
                    : 'Aramanla eşleşen ilan bulunamadı.'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.primary} style={styles.loadingMore} />
          ) : null
        }
      />

      <LocationPickerModal
        visible={pickerVisible}
        onClose={handleLocationPickerClose}
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
              <Text style={styles.filterTitle}>Filtrele</Text>
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
              <Pressable style={styles.filterSectionHeader} onPress={() => toggleSection('location')}>
                <Text style={styles.filterSectionHeaderLabel}>Konum</Text>
                {locationFilterActive && !expandedSections.has('location') && (
                  <Text style={styles.filterSectionSummary} numberOfLines={1}>
                    {locationLabel}
                    {selectedRadius !== null ? ` · ${selectedRadius} km` : ''}
                  </Text>
                )}
                <Ionicons
                  name={expandedSections.has('location') ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textFaint}
                />
              </Pressable>
              {expandedSections.has('location') && (
                <View style={styles.filterSectionBody}>
                  <Pressable
                    style={[styles.locationRow, locationFilterActive && styles.locationRowActive]}
                    onPress={handleOpenLocationPicker}
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
                </View>
              )}

              <Pressable style={styles.filterSectionHeader} onPress={() => toggleSection('sort')}>
                <Text style={styles.filterSectionHeaderLabel}>Sıralama</Text>
                {sortOption !== 'newest' && !expandedSections.has('sort') && (
                  <Text style={styles.filterSectionSummary} numberOfLines={1}>
                    {SORT_LABELS[sortOption]}
                  </Text>
                )}
                <Ionicons
                  name={expandedSections.has('sort') ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textFaint}
                />
              </Pressable>
              {expandedSections.has('sort') && (
                <View style={[styles.filterSectionBody, styles.sortOptions]}>
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
              )}

              <Pressable style={styles.filterSectionHeader} onPress={() => toggleSection('price')}>
                <Text style={styles.filterSectionHeaderLabel}>Fiyat Aralığı</Text>
                {(minPrice !== '' || maxPrice !== '') && !expandedSections.has('price') && (
                  <Text style={styles.filterSectionSummary} numberOfLines={1}>
                    {minPrice ? `${formatNumberInput(minPrice)}₺` : '0₺'} –{' '}
                    {maxPrice ? `${formatNumberInput(maxPrice)}₺` : '∞'}
                  </Text>
                )}
                <Ionicons
                  name={expandedSections.has('price') ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textFaint}
                />
              </Pressable>
              {expandedSections.has('price') && (
                <View style={[styles.filterSectionBody, styles.priceRangeRow]}>
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
              )}

              <Pressable style={styles.filterSectionHeader} onPress={() => toggleSection('condition')}>
                <Text style={styles.filterSectionHeaderLabel}>Durum</Text>
                {selectedCondition && !expandedSections.has('condition') && (
                  <Text style={styles.filterSectionSummary} numberOfLines={1}>
                    {selectedCondition}
                  </Text>
                )}
                <Ionicons
                  name={expandedSections.has('condition') ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textFaint}
                />
              </Pressable>
              {expandedSections.has('condition') && (
                <View style={[styles.filterSectionBody, styles.sortOptions]}>
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
              )}

              {attrFilterDefs.map((def) => (
                <View key={def.key}>
                  <Pressable style={styles.filterSectionHeader} onPress={() => toggleSection(def.key)}>
                    <Text style={styles.filterSectionHeaderLabel}>{def.label}</Text>
                    {selectedAttrFilters[def.key] && !expandedSections.has(def.key) && (
                      <Text style={styles.filterSectionSummary} numberOfLines={1}>
                        {selectedAttrFilters[def.key]}
                      </Text>
                    )}
                    <Ionicons
                      name={expandedSections.has(def.key) ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textFaint}
                    />
                  </Pressable>
                  {expandedSections.has(def.key) && (
                    <View style={[styles.filterSectionBody, styles.sortOptions]}>
                      {def.options.map((option) => (
                        <CategoryChip
                          key={option}
                          label={option}
                          selected={selectedAttrFilters[def.key] === option}
                          onPress={() => handleToggleAttrFilter(def.key, option)}
                        />
                      ))}
                    </View>
                  )}
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
    loadingMore: {
      paddingVertical: spacing.lg,
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
    filterSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    filterSectionHeaderLabel: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.text,
    },
    filterSectionSummary: {
      ...typography.footnote,
      color: colors.primary,
      flex: 1,
      textAlign: 'right',
      marginHorizontal: spacing.sm,
    },
    filterSectionBody: {
      paddingBottom: spacing.md,
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
