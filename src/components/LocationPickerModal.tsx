import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { TURKISH_CITIES, reverseGeocodeLabel, requestAndGetLocation, type City } from '../utils/location';
import { TURKISH_DISTRICTS } from '../utils/turkishDistricts';
import type { ListingLocation } from '../types/listing';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: ListingLocation) => void;
};

export function LocationPickerModal({ visible, onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [districtSearch, setDistrictSearch] = useState('');

  const filteredCities = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return TURKISH_CITIES;
    return TURKISH_CITIES.filter((city) => city.name.toLocaleLowerCase('tr-TR').includes(q));
  }, [search]);

  // Ilce artik serbest yazi degil, sabit listeden seciliyor - kullanici
  // "Atakum" yerine "atkm" gibi tutarsiz/hatali yazip veri kirliligi
  // yaratamiyor, ayrica sehir filtresiyle ayni tutarlilikta.
  const districtsForCity = selectedCity ? TURKISH_DISTRICTS[selectedCity.name] ?? [] : [];
  const filteredDistricts = useMemo(() => {
    const q = districtSearch.trim().toLocaleLowerCase('tr-TR');
    if (!q) return districtsForCity;
    return districtsForCity.filter((d) => d.toLocaleLowerCase('tr-TR').includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtSearch, selectedCity]);

  const reset = () => {
    setSearch('');
    setSelectedCity(null);
    setDistrictSearch('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUseGps = async () => {
    setError(null);
    setLocating(true);
    try {
      const coords = await requestAndGetLocation();
      if (!coords) {
        setError('Konum izni verilmedi. Aşağıdan şehir seçebilirsin.');
        return;
      }
      const label = (await reverseGeocodeLabel(coords)) ?? 'Konumum';
      onSelect({ label, latitude: coords.latitude, longitude: coords.longitude });
      handleClose();
    } catch {
      setError('Konum alınamadı. Aşağıdan şehir seçebilirsin.');
    } finally {
      setLocating(false);
    }
  };

  const handleSelectDistrict = (districtName: string | null) => {
    if (!selectedCity) return;
    const label = districtName ? `${districtName}, ${selectedCity.name}` : selectedCity.name;
    onSelect({ label, latitude: selectedCity.latitude, longitude: selectedCity.longitude });
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]}>
          {selectedCity ? (
            <>
              <View style={styles.header}>
                <Pressable onPress={() => setSelectedCity(null)} hitSlop={8}>
                  <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
                </Pressable>
                <Text style={styles.title}>{selectedCity.name}</Text>
                <Pressable onPress={handleClose} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.sectionLabel}>İlçe (opsiyonel)</Text>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="İlçe ara..."
                  placeholderTextColor={colors.textFaint}
                  value={districtSearch}
                  onChangeText={setDistrictSearch}
                  autoFocus
                />
              </View>

              <FlatList
                data={filteredDistricts}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  <Pressable style={styles.cityRow} onPress={() => handleSelectDistrict(null)}>
                    <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.cityText}>Sadece {selectedCity.name} (ilçe belirtme)</Text>
                  </Pressable>
                }
                renderItem={({ item }) => (
                  <Pressable style={styles.cityRow} onPress={() => handleSelectDistrict(item)}>
                    <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.cityText}>{item}</Text>
                  </Pressable>
                )}
                style={styles.cityList}
              />
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Konum Seç</Text>
                <Pressable onPress={handleClose} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <Pressable style={styles.gpsButton} onPress={handleUseGps} disabled={locating}>
                {locating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={18} color="#fff" />
                    <Text style={styles.gpsButtonText}>Konumumu Kullan (GPS)</Text>
                  </>
                )}
              </Pressable>

              {error && <Text style={styles.error}>{error}</Text>}

              <Text style={styles.sectionLabel}>Ya da şehir seç</Text>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Şehir ara..."
                  placeholderTextColor={colors.textFaint}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              <FlatList
                data={filteredCities}
                keyExtractor={(item) => item.name}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable style={styles.cityRow} onPress={() => setSelectedCity(item)}>
                    <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.cityText}>{item.name}</Text>
                  </Pressable>
                )}
                style={styles.cityList}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(26, 34, 56, 0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.title3,
      color: colors.text,
    },
    gpsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.navy,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
    },
    gpsButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    error: {
      color: colors.error,
      fontSize: 13,
      marginBottom: spacing.sm,
    },
    sectionLabel: {
      ...typography.footnote,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      marginBottom: spacing.xs,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      padding: 0,
    },
    cityList: {
      marginTop: spacing.xs,
    },
    cityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    cityText: {
      ...typography.body,
      color: colors.text,
    },
  });
}
