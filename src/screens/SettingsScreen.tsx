import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { showAlert } from '../components/AppAlert';
import { BusinessRequestModal } from '../components/BusinessRequestModal';
import { IconButton } from '../components/IconButton';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { deleteAccount } from '../services/account';
import { updateDisplayName, updateProfilePhoto } from '../services/authService';
import { fetchLatestBusinessRequest, submitBusinessRequest } from '../services/business';
import { ensureUserProfile, fetchAccountType, setAccountType } from '../services/firestore';
import { uploadAvatarImage } from '../services/storage';
import {
  getNotificationPermissionStatus,
  openSystemNotificationSettings,
  registerForPushNotificationsAsync,
  savePushToken,
} from '../services/notifications';
import type { BusinessRequest } from '../types/business';
import type { AccountType } from '../types/review';
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
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [accountType, setAccountTypeValue] = useState<AccountType>('individual');
  const [savingAccountType, setSavingAccountType] = useState(false);
  const [businessRequest, setBusinessRequest] = useState<BusinessRequest | null>(null);
  const [businessModalVisible, setBusinessModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getNotificationPermissionStatus().then(({ granted, canAskAgain }) => {
        setNotifGranted(granted);
        setNotifCanAskAgain(canAskAgain);
      });
      if (user) {
        fetchAccountType(user.uid).then(setAccountTypeValue);
        fetchLatestBusinessRequest(user.uid).then(setBusinessRequest);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])
  );

  const handleChangePhoto = async () => {
    if (!user || changingPhoto) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('İzin gerekli', 'Fotoğraf seçebilmek için galeri erişimine izin ver.');
      return;
    }
    // Native kirpma ekrani (allowsEditing) Android'de bazen onceki ekranin
    // arkasinda kalarak gorsel bir hataya yol aciyordu - artik kirpma
    // uploadAvatarImage icinde (compressAvatarImage) otomatik ve ortadan
    // yapiliyor, kullaniciya ekstra bir ekran gosterilmiyor.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setChangingPhoto(true);
    try {
      const url = await uploadAvatarImage(user.uid, result.assets[0].uri);
      await updateProfilePhoto(url);
      await ensureUserProfile(user.uid, {
        displayName: user.displayName,
        email: user.email,
        photoURL: url,
      });
      await refreshUser();
    } catch {
      showAlert('Hata', 'Fotoğraf güncellenemedi, tekrar dene.');
    } finally {
      setChangingPhoto(false);
    }
  };

  // Isletme hesabini kaldirmak icin onaya gerek yok - sadece kazanmak icin
  // Stop82 ekibinin incelemesi gerekiyor (asagida handleSubmitBusinessRequest).
  const handleRemoveBusinessAccount = () => {
    if (!user || savingAccountType) return;
    showAlert('İşletme Hesabını Kaldır', 'İşletme rozeti profilinden kaldırılacak. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setSavingAccountType(true);
          try {
            await setAccountType(user.uid, 'individual');
            setAccountTypeValue('individual');
          } catch {
            showAlert('Hata', 'Güncellenemedi, tekrar dene.');
          } finally {
            setSavingAccountType(false);
          }
        },
      },
    ]);
  };

  const handleSubmitBusinessRequest = async (companyName: string, description: string) => {
    if (!user) return;
    await submitBusinessRequest(user.uid, companyName, description);
    // Basvuru basariyla gonderildi - durumu tazeleme sadece bir gorunum
    // detayi, bu basarisiz olursa "basvuru gonderilemedi" gibi yanlis bir
    // hata gostermemesi icin ayri tutuluyor (bir sonraki odaklanmada zaten yenilenir).
    fetchLatestBusinessRequest(user.uid).then(setBusinessRequest).catch(() => {});
  };

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
    showAlert('Çıkış Yap', 'Hesabından çıkış yapmak istediğine emin misin?', [
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
      showAlert('Hata', 'İsim güncellenemedi, tekrar dene.');
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setNameInput(user?.displayName ?? '');
    setEditingName(false);
  };

  const handleDeleteAccount = () => {
    showAlert(
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
              showAlert('Hata', 'Hesap silinemedi. İnternet bağlantını kontrol edip tekrar dene.');
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

        <View style={styles.avatarSection}>
          <Pressable onPress={handleChangePhoto} disabled={changingPhoto} style={styles.avatarPressable}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatarLarge} />
            ) : (
              <View style={styles.avatarLargeFallback}>
                <Text style={styles.avatarLargeText}>
                  {(user?.displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {changingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Fotoğrafı değiştirmek için dokun</Text>
        </View>

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
          <View style={[styles.row, styles.rowDivider]}>
            <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
            <Text style={styles.rowLabel} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>
          {accountType === 'business' ? (
            <View style={styles.row}>
              <Ionicons name="briefcase" size={20} color={colors.primary} />
              <Text style={styles.rowLabel}>İşletme Hesabı Aktif</Text>
              <Pressable onPress={handleRemoveBusinessAccount} disabled={savingAccountType} hitSlop={8}>
                <Text style={styles.removeLink}>Kaldır</Text>
              </Pressable>
            </View>
          ) : businessRequest?.status === 'pending' ? (
            <View style={styles.row}>
              <Ionicons name="time-outline" size={20} color={colors.textMuted} />
              <Text style={styles.rowLabel}>İşletme başvurun inceleniyor</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Ionicons name="briefcase-outline" size={20} color={colors.textMuted} />
              <Text style={styles.rowLabel}>
                {businessRequest?.status === 'rejected'
                  ? 'İşletme başvurun reddedildi'
                  : 'İşletme Hesabı'}
              </Text>
              <Pressable onPress={() => setBusinessModalVisible(true)} hitSlop={8}>
                <Text style={styles.enableLink}>
                  {businessRequest?.status === 'rejected' ? 'Tekrar Başvur' : 'Başvur'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
        <Text style={styles.hintText}>
          İşletme hesabı, Stop82 ekibinin incelediği bir başvuru sonucunda aktif olur. Onaylanırsa
          profil fotoğrafın yerine firma logonu koyabilir, profilinde "İşletme" rozeti gösterebilirsin.
        </Text>

        <Text style={styles.sectionLabel}>Hakkında</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowDivider]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
            <Text style={styles.rowLabel}>Sürüm</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <Pressable style={[styles.row, styles.rowDivider]} onPress={() => navigation.navigate('Help')}>
            <Ionicons name="help-buoy-outline" size={20} color={colors.textMuted} />
            <Text style={styles.rowLabel}>Yardım ve Destek</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
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

      <BusinessRequestModal
        visible={businessModalVisible}
        onClose={() => setBusinessModalVisible(false)}
        onSubmit={handleSubmitBusinessRequest}
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
    avatarSection: {
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    avatarPressable: {
      width: 84,
      height: 84,
    },
    avatarLarge: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.surface,
    },
    avatarLargeFallback: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLargeText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 30,
    },
    avatarEditBadge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    avatarHint: {
      ...typography.caption,
      color: colors.textFaint,
    },
    hintText: {
      ...typography.caption,
      color: colors.textFaint,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.xs,
      lineHeight: 16,
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
    removeLink: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.error,
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
