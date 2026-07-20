import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { categories, categoryIcons, getAttributeDefs, getEffectiveAttributeDefs, subcategories } from '../types/listing';
import { formatNumberInput } from '../utils/format';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: string, subcategory: string, attributes: Record<string, string>) => void;
  // Duzenleme modunda zaten secilmis bir kategori varsa pencere sifirdan
  // degil, o secimden acilir - aksi halde tek bir alani degistirmek icin
  // butun zinciri (marka, depolama, pil sagligi...) bastan cevaplamak gerekirdi.
  initialCategory?: string | null;
  initialSubcategory?: string | null;
  initialAttributes?: Record<string, string>;
};

// Kategori -> alt kategori -> (varsa) marka/depolama/km/m2 gibi ozellikler,
// hepsi TEK bir kesintisiz sihirbazda ilerler ve son adimda kendiliginden
// biter - rakiplerin (sahibinden, letgo) kategori secimi boyle calisiyor.
export function CategoryPickerModal({
  visible,
  onClose,
  onSelect,
  initialCategory,
  initialSubcategory,
  initialAttributes,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [attrIndex, setAttrIndex] = useState(0);
  const [numberInput, setNumberInput] = useState('');

  useEffect(() => {
    if (visible) {
      setCategory(initialCategory ?? null);
      setSubcategory(initialSubcategory ?? null);
      setAttrValues(initialAttributes ?? {});
      setAttrIndex(0);
      setNumberInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const attrDefs = getEffectiveAttributeDefs(category, subcategory, attrValues);
  const currentAttr = attrDefs[attrIndex];

  // Kategori/alt kategori parametre olarak geciriliyor - setSubcategory
  // sonrasi ayni event icinde state'ten okumaya calismak eski (henuz
  // guncellenmemis) degeri doner, bu da ozelligi olmayan kategorilerde
  // (Mobilya, Diger vb.) pencerenin hic kapanmamasina yol aciyordu.
  const finish = (finalCategory: string, finalSubcategory: string, finalAttrs: Record<string, string>) => {
    onSelect(finalCategory, finalSubcategory, finalAttrs);
    onClose();
  };

  const handlePickCategory = (nextCategory: string) => {
    setCategory(nextCategory);
  };

  const handlePickSubcategory = (nextSubcategory: string) => {
    if (!category) return;
    const defs = getAttributeDefs(category, nextSubcategory);
    if (defs.length === 0) {
      finish(category, nextSubcategory, {});
    } else {
      setSubcategory(nextSubcategory);
    }
  };

  const advanceAttribute = (value: string | null) => {
    if (!category || !subcategory || !currentAttr) return;
    const nextAttrs = value ? { ...attrValues, [currentAttr.key]: value } : attrValues;
    const nextIndex = attrIndex + 1;
    setNumberInput('');
    if (nextIndex >= attrDefs.length) {
      finish(category, subcategory, nextAttrs);
    } else {
      setAttrValues(nextAttrs);
      setAttrIndex(nextIndex);
    }
  };

  const handleConfirmNumber = () => {
    if (!currentAttr || currentAttr.type !== 'number') return;
    const trimmed = numberInput.trim();
    if (!trimmed) {
      advanceAttribute(null);
      return;
    }
    const displayNumber = currentAttr.formatThousands ? formatNumberInput(trimmed) : trimmed;
    const formatted = currentAttr.unit ? `${displayNumber} ${currentAttr.unit}` : displayNumber;
    advanceAttribute(formatted);
  };

  const handleBack = () => {
    setNumberInput('');
    if (subcategory) {
      if (attrIndex === 0) {
        setSubcategory(null);
      } else {
        setAttrIndex((prev) => prev - 1);
      }
    } else if (category) {
      setCategory(null);
    }
  };

  let title = 'Kategori Seç';
  let breadcrumb: string | null = null;
  if (category && !subcategory) {
    title = category;
  } else if (category && subcategory) {
    title = currentAttr?.label ?? category;
    breadcrumb = [category, subcategory, ...Object.values(attrValues)].join(' · ');
  }

  const showBack = !!category;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {showBack && (
                <Pressable onPress={handleBack} hitSlop={8} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                </Pressable>
              )}
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          {breadcrumb && (
            <Text style={styles.breadcrumb} numberOfLines={1}>
              {breadcrumb}
            </Text>
          )}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {!category &&
              categories.map((item) => (
                <Pressable key={item} style={styles.row} onPress={() => handlePickCategory(item)}>
                  <View style={styles.rowIcon}>
                    <Ionicons
                      name={categoryIcons[item] ?? 'pricetag-outline'}
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.rowLabel}>{item}</Text>
                  {item === initialCategory ? (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                  )}
                </Pressable>
              ))}

            {category &&
              !subcategory &&
              subcategories[category]?.map((sub) => (
                <Pressable key={sub} style={styles.row} onPress={() => handlePickSubcategory(sub)}>
                  <Text style={styles.rowLabel}>{sub}</Text>
                  {sub === initialSubcategory ? (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                  )}
                </Pressable>
              ))}

            {category && subcategory && currentAttr && currentAttr.type === 'number' && (
              <View style={styles.numberBlock}>
                <TextInput
                  style={styles.numberInput}
                  value={currentAttr.formatThousands ? formatNumberInput(numberInput) : numberInput}
                  onChangeText={(text) => setNumberInput(text.replace(/[^0-9]/g, ''))}
                  placeholder={currentAttr.placeholder}
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  autoFocus
                />
                <PrimaryButton label="Devam" onPress={handleConfirmNumber} />
                <Pressable style={styles.skipRowCentered} onPress={() => advanceAttribute(null)}>
                  <Text style={styles.skipText}>Bu adımı geç</Text>
                </Pressable>
              </View>
            )}

            {category && subcategory && currentAttr && currentAttr.type !== 'number' && (
              <>
                <Pressable style={styles.skipRow} onPress={() => advanceAttribute(null)}>
                  <Text style={styles.skipText}>Bu adımı geç</Text>
                </Pressable>
                {currentAttr.options.map((option) => (
                  <Pressable key={option} style={styles.row} onPress={() => advanceAttribute(option)}>
                    <Text style={styles.rowLabel}>{option}</Text>
                    {attrValues[currentAttr.key] === option ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                    )}
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
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
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 2,
    },
    backButton: {
      marginRight: 2,
    },
    title: {
      ...typography.title3,
      color: colors.text,
      flexShrink: 1,
    },
    breadcrumb: {
      ...typography.caption,
      color: colors.textFaint,
      marginTop: 2,
    },
    list: {
      flexGrow: 0,
      marginTop: spacing.sm,
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
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },
    skipRow: {
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    skipRowCentered: {
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
    },
    skipText: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.primary,
    },
    numberBlock: {
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    numberInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
    },
  });
}
