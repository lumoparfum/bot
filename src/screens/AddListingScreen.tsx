import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CategoryChip } from '../components/CategoryChip';
import { PrefixInput } from '../components/PrefixInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../constants/theme';
import { categories, conditions, type ListingCondition } from '../data/mockListings';
import type { MainTabParamList } from '../types/navigation';

const MAX_PHOTOS = 8;

type Props = BottomTabScreenProps<MainTabParamList, 'AddListing'>;

export default function AddListingScreen({ navigation }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [condition, setCondition] = useState<ListingCondition | null>(null);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid =
    title.trim().length >= 3 &&
    category !== null &&
    condition !== null &&
    Number(price) > 0 &&
    description.trim().length >= 10;

  const handlePickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf ekleyebilmek için galeri erişimine izin ver.');
      return;
    }

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });

    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const removePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const resetForm = () => {
    setPhotos([]);
    setTitle('');
    setCategory(null);
    setCondition(null);
    setPrice('');
    setDescription('');
    setLocation('');
  };

  const handlePublish = () => {
    if (!isValid) {
      Alert.alert('Eksik bilgi', 'Lütfen başlık, kategori, durum, fiyat ve açıklamayı doldur.');
      return;
    }
    setSubmitting(true);
    // TODO: Firestore'a ilan yazma + Storage'a fotoğraf yükleme burada
    // gerçekleşecek. Backend bağlanana kadar bu bir demo onayıdır.
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert('İlanın yayında (demo)', `"${title}" ilanı oluşturuldu.`, [
        {
          text: 'Tamam',
          onPress: () => {
            resetForm();
            navigation.navigate('HomeTab', { screen: 'ListingList' });
          },
        },
      ]);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>İlan Ver</Text>
          <Text style={styles.subheading}>Eşyanı hızlıca satışa çıkar.</Text>

          <Text style={styles.label}>Fotoğraflar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photos.map((uri) => (
              <View key={uri} style={styles.photoTile}>
                <Image source={{ uri }} style={styles.photoImage} contentFit="cover" />
                <Pressable style={styles.removePhotoButton} onPress={() => removePhoto(uri)}>
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable style={styles.addPhotoTile} onPress={handlePickPhotos}>
                <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
                <Text style={styles.addPhotoText}>Ekle</Text>
              </Pressable>
            )}
          </ScrollView>

          <Text style={styles.label}>Başlık</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn. iPhone 14 Pro 256GB"
            placeholderTextColor={colors.textFaint}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Kategori</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {categories.map((item) => (
              <CategoryChip
                key={item}
                label={item}
                selected={item === category}
                onPress={() => setCategory(item)}
              />
            ))}
          </ScrollView>

          <Text style={styles.label}>Durum</Text>
          <View style={styles.conditionRow}>
            {conditions.map((item) => (
              <CategoryChip
                key={item}
                label={item}
                selected={item === condition}
                onPress={() => setCondition(item)}
              />
            ))}
          </View>

          <Text style={styles.label}>Fiyat</Text>
          <PrefixInput
            prefix="₺"
            value={price}
            onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, ''))}
            placeholder="0"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Konum</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.locationInput}
              placeholder="Örn. Kadıköy, İstanbul"
              placeholderTextColor={colors.textFaint}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ürünün durumu, kullanım süresi, öne çıkan özellikleri..."
            placeholderTextColor={colors.textFaint}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.publishButton}>
            <PrimaryButton
              label="İlanı Yayınla"
              onPress={handlePublish}
              loading={submitting}
              disabled={!isValid}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    ...typography.title1,
    color: colors.text,
    marginTop: spacing.sm,
  },
  subheading: {
    ...typography.subhead,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  photoRow: {
    flexDirection: 'row',
  },
  photoTile: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(26, 34, 56, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoTile: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  locationInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
  },
  publishButton: {
    marginTop: spacing.xl,
  },
});
