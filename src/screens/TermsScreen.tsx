import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IconButton } from '../components/IconButton';
import { spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { ProfileStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Terms'>;

type Section = { heading: string; body: string };

const SECTIONS: Section[] = [
  {
    heading: '1. Kabul',
    body: 'Stop82\'yi kullanarak bu şartları kabul etmiş olursun. Uygulamayı kullanmaya devam etmiyorsan lütfen hesabını kapat ve kullanmayı bırak.',
  },
  {
    heading: '2. Hizmetin Niteliği',
    body: 'Stop82, kullanıcıların ikinci el eşyalarını birbirlerine ilan olarak sunabildiği bir pazaryeri uygulamasıdır. Stop82 alım satıma taraf değildir, sadece kullanıcıların birbirini bulmasını sağlar. Ürünün durumu, teslimatı, ödemesi ve güvenliği tamamen alıcı ve satıcının kendi sorumluluğundadır.',
  },
  {
    heading: '3. Kullanıcı Sorumlulukları',
    body: 'İlan verirken doğru ve güncel bilgi vermelisin. Çalıntı, taklit, yasa dışı ya da satışı yasak ürünler paylaşamazsın. Başka bir kullanıcıyı dolandırmak, taciz etmek ya da yanıltmak kesinlikle yasaktır. Bu kurallara uymayan hesaplar önceden haber verilmeksizin askıya alınabilir veya kapatılabilir.',
  },
  {
    heading: '4. İçerik ve Moderasyon',
    body: 'İlan açıklamaları, fotoğraflar, yorumlar ve mesajlar dahil paylaştığın her içerikten sen sorumlusun. Uygunsuz, hakaret içeren ya da yanıltıcı içerikleri kaldırma ve ilgili hesabı kısıtlama hakkımızı saklı tutarız. Diğer kullanıcılar tarafından paylaşılan içerikleri "Şikayet Et" özelliğiyle bize bildirebilirsin; şikayetler incelenmek üzere kayıt altına alınır.',
  },
  {
    heading: '5. Sorumluluk Reddi',
    body: 'Stop82, kullanıcılar arasında gerçekleşen alışverişlerin sonucundan (ürün kalitesi, teslim edilmemesi, ödeme anlaşmazlıkları vb.) sorumlu tutulamaz. Bir kullanıcıyla anlaşmazlık yaşarsan öncelikle karşılıklı çözüm aramanı, gerekirse yetkili mercilere başvurmanı öneririz.',
  },
  {
    heading: '6. Topladığımız Veriler',
    body: 'Google hesabınla giriş yaptığında adın, e-posta adresin ve profil fotoğrafın alınır. İlan verirken yüklediğin fotoğraflar, yazdığın açıklamalar ve (izin verirsen) konumun (GPS ya da elle seçtiğin şehir) kaydedilir. Uygulama içi gönderdiğin mesajlar ve yorumlar, hizmeti sağlayabilmemiz için saklanır.',
  },
  {
    heading: '7. Verilerin Kullanımı ve Saklanması',
    body: 'Verilerin tamamı Google Firebase altyapısında saklanır ve yalnızca uygulamanın çalışması için (ilanların gösterilmesi, mesajlaşma, bildirimler) kullanılır. Üçüncü taraflarla pazarlama amaçlı paylaşılmaz. Depolama alanını verimli kullanmak için ilanlar yayından 15 gün sonra fotoğraflarıyla birlikte otomatik olarak silinir.',
  },
  {
    heading: '8. Bildirimler',
    body: 'İzin verirsen, yeni mesaj ya da ilanına gelen beğeni gibi olaylarda telefonuna anlık bildirim gönderebiliriz. Bu izni istediğin zaman telefonunun ayarlarından kapatabilirsin.',
  },
  {
    heading: '9. Hesabını Silmek',
    body: 'Hesabını ve verilerini silmemizi istersen Ayarlar > Çıkış Yap ile oturumu kapatabilir, verilerinin tamamen silinmesi için bize ulaşabilirsin.',
  },
  {
    heading: '10. Değişiklikler',
    body: 'Bu şartları zaman zaman güncelleyebiliriz. Önemli değişikliklerde seni uygulama içinden bilgilendirmeye çalışırız.',
  },
];

export default function TermsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton onPress={() => navigation.goBack()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </IconButton>
        <Text style={styles.headerTitle}>Kullanım Şartları ve Gizlilik</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.updated}>Son güncelleme: Temmuz 2026</Text>
        {SECTIONS.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
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
    updated: {
      ...typography.caption,
      color: colors.textFaint,
      marginBottom: spacing.lg,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeading: {
      ...typography.subhead,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    sectionBody: {
      ...typography.subhead,
      color: colors.textMuted,
      lineHeight: 21,
    },
  });
}
