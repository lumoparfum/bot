import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandMark } from '../components/BrandMark';
import { CategoryChip } from '../components/CategoryChip';
import { ListingCard } from '../components/ListingCard';
import { colors, radius, spacing, typography } from '../constants/theme';
import { categories, mockListings } from '../data/mockListings';
import type { HomeStackParamList } from '../types/navigation';

const ALL = 'Tümü';

type Props = NativeStackScreenProps<HomeStackParamList, 'ListingList'>;

export default function ListingListScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const [query, setQuery] = useState('');

  const filteredListings = useMemo(() => {
    return mockListings.filter((listing) => {
      const matchesCategory = selectedCategory === ALL || listing.category === selectedCategory;
      const matchesQuery = listing.title.toLowerCase().includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
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
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={28} color={colors.textFaint} />
            <Text style={styles.emptyText}>Aramanla eşleşen ilan bulunamadı.</Text>
          </View>
        }
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
    paddingBottom: spacing.lg,
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
  },
});
