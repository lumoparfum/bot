import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IconButton } from '../components/IconButton';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { deleteSavedSearch, fetchSavedSearches } from '../services/savedSearches';
import { formatPrice, formatRelativeDate } from '../utils/format';
import type { SavedSearch } from '../types/savedSearch';
import type { HomeStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'SavedSearches'>;

function describeSearch(search: SavedSearch): string {
  const parts: string[] = [];
  if (search.query) parts.push(`"${search.query}"`);
  if (search.category) parts.push(search.category);
  if (search.minPrice != null || search.maxPrice != null) {
    const min = search.minPrice != null ? formatPrice(search.minPrice) : '0₺';
    const max = search.maxPrice != null ? formatPrice(search.maxPrice) : '∞';
    parts.push(`${min} - ${max}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Tüm ilanlar';
}

export default function SavedSearchesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setSearches(await fetchSavedSearches(user.uid));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = (search: SavedSearch) => {
    Alert.alert('Kayıtlı Aramayı Sil', 'Bu aramayı silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          setSearches((prev) => prev.filter((s) => s.id !== search.id));
          deleteSavedSearch(search.id).catch(() => {});
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton onPress={() => navigation.goBack()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </IconButton>
        <Text style={styles.headerTitle}>Kayıtlı Aramalarım</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        data={searches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xxl + insets.bottom }]}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="bookmark" size={16} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {describeSearch(item)}
              </Text>
              <Text style={styles.rowDate}>Kaydedildi: {formatRelativeDate(item.createdAt)}</Text>
            </View>
            <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={colors.textFaint} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={28} color={colors.textFaint} />
              <Text style={styles.emptyText}>
                Henüz kayıtlı aramanız yok. Ana sayfada bir arama yapıp kaydedin, eşleşen yeni
                ilan geldiğinde bildirim alın.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    headerTitle: {
      ...typography.headline,
      color: colors.text,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.text,
    },
    rowDate: {
      ...typography.caption,
      color: colors.textFaint,
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
  });
}
