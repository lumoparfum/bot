import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { IconButton } from '../components/IconButton';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { deleteAccount } from '../services/account';
import { updateDisplayName } from '../services/authService';
import { ensureUserProfile } from '../services/firestore';
import {
  getNotificationPermissionStatus,
  openSystemNotificationSettings,
  registerForPushNotificationsAsync,
  savePushToken,
} from '../services/notifications';
import type { ProfileStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'system', label: 'Sistem', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Açık', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Koyu', icon: 'moon-outline' },
];

export default function SettingsScreen({ navigation }: Props) {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { signOut, user, refreshUser } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [notifCanAskAgain, setNotifCanAskAgain] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getNotificationPermissionStatus().then(({ granted, canAskAgain }) => {
        setNotifGranted(granted);
        setNotifCanAskAgain(canAskAgain);
      });
    }, [])
  );

  const handleEnableNotifications = async () => {
    if (!notifCanAskAgain) {
      openSystemNotificationSettings();
      return;
    }
    const token = await registerForPushNotificationsAsync();
    if (token && user) await savePushToken(user.uid, token);
    const status = await getNotificationPermissionStatus();
    setNotifGranted(status.granted);
    setNotifCanAskAgain(status.canAskAgain);
  };

  const handleSignOut = () => {
    Alert.alert('Çıkış Yap', 'Hesabından çıkış yapmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || savingName || !user) return;
    setSavingName(true);
    try {
      await updateDisplayName(trimmed);
      await refreshUser();
      await ensureUserProfile(user.uid, {
        displayName: trimmed,
        email: user.email,
        photoURL: user.photoURL,
      });
      setEditingName(false);
    } catch {
      Alert.alert('Hata', 'İsim güncellenemedi, tekrar dene.');
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setNameInput(user?.displayName ?? '');
    setEditingName(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabını Sil',
      'Bu işlem geri alınamaz. İlanların, favorilerin, mesajların ve tüm hesap bilgilerin kalıcı olarak silinecek. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabımı Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteAccount();
              await signOut();
            } catch {
              Alert.alert('Hata', 'Hesap silinemedi. İnternet bağlantını kontrol edip tekrar dene.');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton onPress={() => navigation.goBack()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </IconButton>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + insets.bottom }]}
      >
        <Text style={styles.sectionLabel}>Görünüm</Text>
        <View style={styles.card}>
          {THEME_OPTIONS.map((option, index) => (
            <Pressable
              key={option.mode}
              style={[styles.row, index < THEME_OPTIONS.length - 1 && styles.rowDivider]}
              onPress={() => setMode(option.mode)}
            >
              <Ionicons name={option.icon} size={20} color={colors.textMuted} />
              <Text style={styles.rowLabel}>{option.label}</Text>
              {mode === option.mode && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Bildirimler</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={20} color={colors.textMuted} />
            <Text style={styles.rowLabel}>
              {notifGranted === null
                ? 'Kontrol ediliyor...'
                : notifGranted
                  ? 'Bildirimler açık'
                  : 'Bildirimler kapalı'}
            </Text>
            {notifGranted === false && (
              <Pressable onPress={handleEnableNotifications} hitSlop={8}>
                <Text style={styles.enableLink}>Aç</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Hesap</Text>
        <View style={styles.card}>
          {editingName ? (
            <View style={[styles.row, styles.rowDivider]}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Adın Soyadın"
                placeholderTextColor={colors.textFaint}
                autoFocus
              />
              <Pressable onPress={handleSaveName} disabled={savingName} hitSlop={8}>
                <Ionicons name="checkmark" size={22} color={colors.primary} />
              </Pressable>
              <Pressable onPress={handleCancelEditName} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.row, styles.rowDivider]}
              onPress={() => setEditingName(true)}
            >
              <Ionicons name="person-outline" size={20} color={colors.textMuted} />
              <Text style={styles.rowLabel} numberOfLines={1}>
                {user?.displayName ?? 'İsim ekle'}
              </Text>
              <Ionicons name="pencil-outline" size={16} color={colors.textFaint} />
            </Pressable>
          )}
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
            <Text style={styles.rowLabel} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Hakkında</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowDivider]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
            <Text style={styles.rowLabel}>Sürüm</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <Pressable style={styles.row} onPress={() => navigation.navigate('Terms')}>
            <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
            <Text style={styles.rowLabel}>Kullanım Şartları ve Gizlilik</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        </View>

        <Pressable style={styles.signOutRow} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutLabel}>Çıkış Yap</Text>
        </Pressable>

        <Pressable
          style={styles.deleteAccountRow}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator size="small" color={colors.textFaint} />
          ) : (
            <Text style={styles.deleteAccountLabel}>Hesabımı Kalıcı Olarak Sil</Text>
          )}
        </Pressable>
      </ScrollView>
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
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    sectionLabel: {
      ...typography.footnote,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    rowLabel: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },
    nameInput: {
      ...typography.body,
      color: colors.text,
      flex: 1,
      padding: 0,
    },
    rowValue: {
      ...typography.body,
      color: colors.textMuted,
    },
    enableLink: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.primary,
    },
    signOutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
    },
    signOutLabel: {
      ...typography.body,
      fontWeight: '600',
      color: colors.error,
    },
    deleteAccountRow: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
    },
    deleteAccountLabel: {
      ...typography.caption,
      color: colors.textFaint,
      textDecorationLine: 'underline',
    },
  });
}
