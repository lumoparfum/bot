import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IconButton } from '../components/IconButton';
import { radius, shadows, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { fetchListings } from '../services/firestore';
import { formatPrice } from '../utils/format';
import type { Listing } from '../types/listing';
import type { HomeStackParamList } from '../types/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const OFF_SCREEN_X = SCREEN_WIDTH * 1.5;

type Props = NativeStackScreenProps<HomeStackParamList, 'SwipeDiscover'>;

// Ekstra native kutuphane (gesture-handler/reanimated) eklemeden - sadece
// React Native'in kendi PanResponder + Animated API'leriyle Dolap'taki
// "kaydirmali kesif" (Tinder tarzi) deneyimi. Boylece yeni bir native build
// gerekmiyor, JS guncellemesiyle (OTA) yayinlanabiliyor.
export default function SwipeDiscoverScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetchListings()
      .then((data) => setListings(data.filter((l) => l.sellerId !== user?.uid)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const position = useRef(new Animated.ValueXY()).current;
  const current = listings[index];
  const next = listings[index + 1];

  const resetPosition = () => {
    Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
  };

  const advance = () => {
    position.setValue({ x: 0, y: 0 });
    setIndex((prev) => prev + 1);
  };

  const swipeOffScreen = (direction: 'left' | 'right') => {
    Animated.timing(position, {
      toValue: { x: direction === 'right' ? OFF_SCREEN_X : -OFF_SCREEN_X, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(advance);
  };

  const handleLike = () => {
    if (!current) return;
    if (requireAuth() && !isFavorite(current.id)) toggleFavorite(current.id);
    swipeOffScreen('right');
  };

  const handleSkip = () => {
    if (!current) return;
    swipeOffScreen('left');
  };

  // NOT: useRef(...).current ile DONDURULMEMELI - o zaman ilk render'daki
  // (listings henuz bos, current=undefined) handleLike/handleSkip closure'lari
  // sonsuza kadar kullanilir ve her swipe "current yok" diye sessizce no-op
  // olurdu (kart parmagi takip eder ama biraktiginda hicbir sey olmazdi).
  // Her render'da guncel current/index'i gorecek sekilde yeniden olusturuluyor.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4,
        onPanResponderMove: (_, gesture) => {
          position.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            handleLike();
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            handleSkip();
          } else {
            resetPosition();
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current]
  );

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const skipOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton onPress={() => navigation.goBack()} accessibilityLabel="Kapat">
          <Ionicons name="close" size={22} color={colors.text} />
        </IconButton>
        <Text style={styles.headerTitle}>Kaydırarak Keşfet</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.cardArea}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : !current ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.textFaint} />
            <Text style={styles.emptyText}>Şimdilik gösterecek başka ilan kalmadı.</Text>
          </View>
        ) : (
          <>
            {next && (
              <View style={[styles.card, styles.cardBehind]}>
                {next.images.length > 0 && (
                  <Image source={{ uri: next.images[0] }} style={styles.cardImage} contentFit="cover" />
                )}
              </View>
            )}
            <Animated.View
              style={[
                styles.card,
                { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
              ]}
              {...panResponder.panHandlers}
            >
              <Pressable
                style={styles.flex}
                onPress={() => navigation.navigate('ListingDetail', { listingId: current.id })}
              >
                {current.images.length > 0 ? (
                  <Image source={{ uri: current.images[0] }} style={styles.cardImage} contentFit="cover" />
                ) : (
                  <View style={styles.cardImagePlaceholder}>
                    <Ionicons name="image-outline" size={32} color={colors.textFaint} />
                  </View>
                )}
                <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
                  <Text style={styles.stampLikeText}>BEĞENDİM</Text>
                </Animated.View>
                <Animated.View style={[styles.stamp, styles.stampSkip, { opacity: skipOpacity }]}>
                  <Text style={styles.stampSkipText}>GEÇ</Text>
                </Animated.View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {current.title}
                  </Text>
                  <Text style={styles.cardPrice}>{formatPrice(current.price)}</Text>
                </View>
              </Pressable>
            </Animated.View>
          </>
        )}
      </View>

      {current && (
        <View style={styles.actionsRow}>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Ionicons name="close" size={26} color={colors.error} />
          </Pressable>
          <Pressable style={styles.likeButton} onPress={handleLike}>
            <Ionicons name="heart" size={24} color="#fff" />
          </Pressable>
        </View>
      )}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerTitle: {
      ...typography.headline,
      color: colors.text,
    },
    cardArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    card: {
      position: 'absolute',
      width: '100%',
      aspectRatio: 3 / 4,
      borderRadius: radius.xl,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      ...shadows.raised,
    },
    cardBehind: {
      top: 10,
      opacity: 0.6,
      transform: [{ scale: 0.96 }],
    },
    cardImage: {
      width: '100%',
      height: '100%',
    },
    cardImagePlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardInfo: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: spacing.lg,
      backgroundColor: 'rgba(26, 34, 56, 0.55)',
    },
    cardTitle: {
      ...typography.title3,
      color: '#fff',
    },
    cardPrice: {
      ...typography.headline,
      color: '#fff',
      marginTop: 2,
    },
    stamp: {
      position: 'absolute',
      top: spacing.lg,
      borderWidth: 3,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    stampLike: {
      left: spacing.lg,
      borderColor: colors.success,
      transform: [{ rotate: '-14deg' }],
    },
    stampLikeText: {
      ...typography.headline,
      fontWeight: '700',
      color: colors.success,
    },
    stampSkip: {
      right: spacing.lg,
      borderColor: colors.error,
      transform: [{ rotate: '14deg' }],
    },
    stampSkipText: {
      ...typography.headline,
      fontWeight: '700',
      color: colors.error,
    },
    emptyState: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyText: {
      ...typography.subhead,
      color: colors.textMuted,
      textAlign: 'center',
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xl,
      paddingBottom: spacing.xl,
    },
    skipButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    likeButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      ...shadows.card,
    },
  });
}
