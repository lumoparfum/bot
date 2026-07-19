import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { TURKISH_CITIES, reverseGeocodeLabel, requestAndGetLocation, type City } from '../utils/location';
import type { ListingLocation } from '../types/listing';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: ListingLocation) => void;
};

export function LocationPickerModal({ visible, onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onClose();
    } catch {
      setError('Konum alınamadı. Aşağıdan şehir seçebilirsin.');
    } finally {
      setLocating(false);
    }
  };

  const handleSelectCity = (city: City) => {
    onSelect({ label: city.name, latitude: city.latitude, longitude: city.longitude });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Konum Seç</Text>
            <Pressable onPress={onClose} hitSlop={8}>
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

          <FlatList
            data={TURKISH_CITIES}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <Pressable style={styles.cityRow} onPress={() => handleSelectCity(item)}>
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <Text style={styles.cityText}>{item.name}</Text>
              </Pressable>
            )}
            style={styles.cityList}
          />
        </View>
      </View>
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
    maxHeight: '75%',
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
