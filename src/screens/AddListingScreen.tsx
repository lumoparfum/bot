import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { showAlert } from '../components/AppAlert';
import { CategoryChip } from '../components/CategoryChip';
import { CategoryPickerModal } from '../components/CategoryPickerModal';
import { GuestPrompt } from '../components/GuestPrompt';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { PrefixInput } from '../components/PrefixInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { findProhibitedWord } from '../constants/prohibitedWords';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { conditions, type ListingCondition, type ListingLocation } from '../types/listing';
import {
  DAILY_LISTING_LIMIT,
  checkListingCreationAllowed,
  createListing,
  fetchListingById,
  updateListing,
  type ListingImageSlot,
} from '../services/firestore';
import { deleteImageByUrl } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { formatNumberInput } from '../utils/format';
import type { MainTabParamList } from '../types/navigation';

const MAX_PHOTOS = 4;
const EMPTY_LOCATION: ListingLocation = { label: '', latitude: null, longitude: null };

// Ilk fotograf "kapak" olarak kullanilir (ana sayfadaki ilan kartinda
// gorunen resim budur) - tek sirali liste tutuluyor ki kullanici yeni
// ekledigi bir fotografi da kapak yapabilsin, sadece eski fotograflari degil.
type PhotoItem = { id: string; kind: 'existing' | 'new'; uri: string };

type Props = BottomTabScreenProps<MainTabParamList, 'AddListing'>;

export default function AddListingScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const editListingId = route.params?.editListingId ?? null;

  const [loadingExisting, setLoadingExisting] = useState(!!editListingId);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [condition, setCondition] = useState<ListingCondition | null>(null);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<ListingLocation>(EMPTY_LOCATION);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!editListingId || !user) return;
    let cancelled = false;
    setLoadingExisting(true);
    fetchListingById(editListingId)
      .then((listing) => {
        if (cancelled) return;
        if (!listing || listing.sellerId !== user.uid) {
          showAlert('Bulunamadı', 'Bu ilan düzenlenemiyor.');
          navigation.goBack();
          return;
        }
        setTitle(listing.title);
        setCategory(listing.category);
        setSubcategory(listing.subcategory);
        setAttributeValues(listing.attributes);
        setCondition(listing.condition);
        setPrice(String(listing.price));
        setOriginalPrice(listing.price);
        setDescription(listing.description);
        setLocation(listing.location);
        setPhotoItems(listing.images.map((url) => ({ id: url, kind: 'existing' as const, uri: url })));
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editListingId, user]);

  // Duzenleme ekranindan kaydetmeden baska bir sekmeye gecilirse, formda
  // kalan eski ilan verisi sonraki "yeni ilan" girisine sizmasin diye
  // sekmeden ayrilinca sifirlanir.
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (editListingId) {
        navigation.setParams({ editListingId: undefined });
        resetForm();
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, editListingId]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <GuestPrompt
          icon="pricetag-outline"
          title="İlan vermek için giriş yap"
          message="Eşyanı satışa çıkarmak için önce hesabına giriş yapman gerekiyor."
        />
      </SafeAreaView>
    );
  }

  const totalPhotoCount = photoItems.length;
  const isValid =
    totalPhotoCount > 0 &&
    title.trim().length >= 3 &&
    category !== null &&
    subcategory !== null &&
    condition !== null &&
    Number(price) > 0 &&
    description.trim().length >= 10;

  const handleSelectCategory = (
    nextCategory: string,
    nextSubcategory: string,
    nextAttributes: Record<string, string>
  ) => {
    setCategory(nextCategory);
    setSubcategory(nextSubcategory);
    setAttributeValues(nextAttributes);
  };

  const handlePickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('İzin gerekli', 'Fotoğraf ekleyebilmek için galeri erişimine izin ver.');
      return;
    }

    const remaining = MAX_PHOTOS - totalPhotoCount;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });

    if (!result.canceled) {
      setPhotoItems((prev) => [
        ...prev,
        ...result.assets.map((asset) => ({ id: asset.uri, kind: 'new' as const, uri: asset.uri })),
      ]);
    }
  };

  const removePhoto = (id: string) => {
    const item = photoItems.find((p) => p.id === id);
    if (!item) return;
    setPhotoItems((prev) => prev.filter((p) => p.id !== id));
    if (item.kind === 'existing') {
      setRemovedImages((prev) => [...prev, item.uri]);
    }
  };

  const makeCoverPhoto = (id: string) => {
    setPhotoItems((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      if (index <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  };

  const resetForm = () => {
    setPhotoItems([]);
    setRemovedImages([]);
    setTitle('');
    setCategory(null);
    setSubcategory(null);
    setAttributeValues({});
    setCondition(null);
    setPrice('');
    setOriginalPrice(null);
    setDescription('');
    setLocation(EMPTY_LOCATION);
  };

  const handlePublish = async () => {
    if (!isValid || !category || !subcategory || !condition) {
      showAlert(
        'Eksik bilgi',
        'Lütfen en az bir fotoğraf ekle; başlık, kategori, durum, fiyat ve açıklamayı doldur.'
      );
      return;
    }
    if (!user) {
      showAlert('Giriş gerekli', 'İlan vermek için giriş yapmış olman gerekiyor.');
      return;
    }
    if (findProhibitedWord(title) || findProhibitedWord(description)) {
      showAlert(
        'Uygunsuz içerik',
        'Başlık veya açıklamada uygunsuz bir kelime tespit edildi. Lütfen düzenleyip tekrar dene.'
      );
      return;
    }
    setSubmitting(true);
    try {
      if (!editListingId) {
        const check = await checkListingCreationAllowed(user.uid, title.trim(), Number(price));
        if (!check.allowed) {
          setSubmitting(false);
          if (check.reason === 'daily_limit') {
            showAlert(
              'Günlük ilan sınırına ulaştın',
              `Spam ve botları önlemek için günde en fazla ${DAILY_LISTING_LIMIT} ilan verilebiliyor. Yarın tekrar dene.`
            );
          } else {
            showAlert(
              'Bu ilanı zaten vermişsin',
              'Aynı başlık ve fiyatla kısa süre önce bir ilan yayınladın. Farklı bir ilansa başlığı biraz değiştirebilirsin.'
            );
          }
          return;
        }
      }
      if (editListingId) {
        const imageSlots: ListingImageSlot[] = photoItems.map((item) =>
          item.kind === 'existing' ? { kind: 'existing', url: item.uri } : { kind: 'new', uri: item.uri }
        );
        await updateListing(
          editListingId,
          {
            title: title.trim(),
            description: description.trim(),
            price: Number(price),
            category,
            subcategory,
            attributes: attributeValues,
            condition,
            location,
            images: imageSlots,
            sellerId: user.uid,
          },
          originalPrice ?? Number(price)
        );
        removedImages.forEach((url) => {
          deleteImageByUrl(url).catch(() => {});
        });
        setSubmitting(false);
        showAlert('Güncellendi', 'İlanındaki değişiklikler kaydedildi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createListing({
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          category,
          subcategory,
          attributes: attributeValues,
          condition,
          localImageUris: photoItems.map((item) => item.uri),
          location,
          sellerId: user.uid,
          sellerName: user.displayName ?? 'Stop82 Kullanıcısı',
          sellerPhotoURL: user.photoURL,
        });
        setSubmitting(false);
        showAlert('İlanın yayında', `"${title}" ilanı yayınlandı.`, [
          {
            text: 'Tamam',
            onPress: () => {
              resetForm();
              navigation.navigate('HomeTab', { screen: 'ListingList' });
            },
          },
        ]);
      }
    } catch {
      setSubmitting(false);
      showAlert('Bir şeyler ters gitti', 'Kaydedilemedi. Lütfen tekrar dene.');
    }
  };

  if (loadingExisting) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>{editListingId ? 'İlanı Düzenle' : 'İlan Ver'}</Text>
          <Text style={styles.subheading}>
            {editListingId ? 'Fiyat, açıklama ya da fotoğrafları güncelle.' : 'Eşyanı hızlıca satışa çıkar.'}
          </Text>

          <Text style={styles.label}>Fotoğraflar</Text>
          {photoItems.length > 1 && (
            <Text style={styles.photoHint}>İlk fotoğraf kapak olur - başka birini kapak yapmak için ona dokun.</Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photoItems.map((item, index) => (
              <Pressable
                key={item.id}
                style={styles.photoTile}
                onPress={() => makeCoverPhoto(item.id)}
                disabled={index === 0}
              >
                <Image source={{ uri: item.uri }} style={styles.photoImage} contentFit="cover" />
                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Kapak</Text>
                  </View>
                )}
                <Pressable style={styles.removePhotoButton} onPress={() => removePhoto(item.id)}>
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </Pressable>
            ))}
            {totalPhotoCount < MAX_PHOTOS && (
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
          <Pressable style={styles.locationRow} onPress={() => setCategoryPickerVisible(true)}>
            <Ionicons name="pricetag-outline" size={18} color={colors.textMuted} />
            <Text
              style={[styles.locationValue, !category && styles.locationPlaceholder]}
              numberOfLines={2}
            >
              {category
                ? [category, subcategory, ...Object.values(attributeValues)].join(' · ')
                : 'Kategori seç'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>

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
            value={formatNumberInput(price)}
            onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, ''))}
            placeholder="0"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Konum</Text>
          <Pressable style={styles.locationRow} onPress={() => setLocationPickerVisible(true)}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.locationValue, !location.label && styles.locationPlaceholder]}>
              {location.label || 'Konum seç (GPS veya şehir)'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>

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
              label={editListingId ? 'Değişiklikleri Kaydet' : 'İlanı Yayınla'}
              onPress={handlePublish}
              loading={submitting}
              disabled={!isValid}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPickerModal
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        onSelect={setLocation}
      />

      <CategoryPickerModal
        visible={categoryPickerVisible}
        onClose={() => setCategoryPickerVisible(false)}
        onSelect={handleSelectCategory}
        initialCategory={category}
        initialSubcategory={subcategory}
        initialAttributes={attributeValues}
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
  flex: {
    flex: 1,
  },
  loading: {
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
  photoHint: {
    ...typography.caption,
    color: colors.textFaint,
    marginBottom: spacing.sm,
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
  coverBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: 'rgba(26, 34, 56, 0.75)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
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
    paddingVertical: spacing.md,
  },
  locationValue: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  locationPlaceholder: {
    color: colors.textFaint,
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
}
