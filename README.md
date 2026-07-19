# Stop82

İkinci el eşya alım-satım pazaryeri mobil uygulaması (Letgo/Sahibinden benzeri). React Native + Expo ile geliştiriliyor, backend olarak Firebase (Authentication, Firestore, Storage) hedefleniyor.

## Teknoloji

- **Expo SDK 54** (React Native 0.81.5, React 19.1.0, TypeScript 5.9)
- **Navigasyon:** `@react-navigation` — native-stack + bottom-tabs
- **Backend (hedef):** Firebase JS SDK (`firebase` paketi) — Authentication (telefon numarası), Firestore, Storage
- **UI:** Tamamen elle yazılmış bileşenler (harici bir UI kit kullanılmıyor), `@expo/vector-icons`, `expo-image`, `expo-image-picker`

## Marka kimliği

- Ana renk: turuncu `#FF6B35`
- İkincil renk: lacivert `#1A2238`
- Logo: `src/components/BrandMark.tsx` — "82" rakamını öne çıkaran minimalist mark. App icon/splash için üretilmiş halleri `assets/` altında.
- Tipografi ve tema tokenleri: `src/constants/theme.ts`

## Klasör yapısı

```
App.tsx                      # Uygulama kökü: Providers + NavigationContainer
src/
  components/                # Yeniden kullanılabilir UI parçaları (buton, kart, chip, ikon vb.)
  constants/theme.ts          # Renk paleti, spacing, tipografi, gölgeler
  context/AuthContext.tsx     # Auth durumu (şu an bellek-içi/mock, aşağıya bakın)
  data/mockListings.ts        # Geliştirme aşaması için sahte ilan verisi
  navigation/                 # RootNavigator, MainTabNavigator, HomeStackNavigator
  screens/
    AuthScreen.tsx            # Telefon numarası ile Kayıt Ol / Giriş Yap
    ListingListScreen.tsx     # Ana sayfa: arama, kategori filtresi, ilan grid'i
    ListingDetailScreen.tsx   # İlan detay: galeri, açıklama, satıcı, iletişim butonları
    AddListingScreen.tsx      # İlan Ver formu (fotoğraf seçimi gerçek, yayınlama demo)
  services/
    firebase.ts               # Firebase app/auth/firestore/storage init (env değişkenleriyle)
    authService.ts             # sendOtp / confirmOtp — bkz. "Bilinen eksikler"
  types/navigation.ts         # React Navigation param list tipleri
```

## Bilinen eksikler / kasıtlı olarak ertelenenler

Bu bir **iskelet/prototip** aşaması. Aşağıdakiler bilinçli olarak backend'e henüz bağlanmadı, ilgili dosyalarda `TODO` yorumlarıyla işaretli:

1. **Telefon doğrulama (OTP) gerçek değil.** `AuthScreen.tsx`, Firebase Phone Auth'a bağlanmak yerine herhangi bir 10 haneli numara + herhangi bir 6 haneli kod girildiğinde `AuthContext.signIn()` çağırıp kullanıcıyı doğrudan içeri alıyor. Sebep: Firebase JS SDK'nın React Native'de telefon doğrulaması için bir reCAPTCHA doğrulayıcısına ihtiyacı var; standart paket (`expo-firebase-recaptcha`) güncel Expo sürümüyle uyumsuz çıktı. Alternatifler: kendi WebView tabanlı reCAPTCHA bileşenini yazmak ya da `@react-native-firebase/auth`'a (native, Expo Go'da çalışmaz) geçmek.
2. **İlan verileri mock.** `src/data/mockListings.ts` içinde 8 sahte ilan var (resimler picsum.photos'tan). Firestore'a gerçek okuma/yazma henüz yok.
3. **İlan Ver formu demo modda.** Fotoğraf seçimi (`expo-image-picker`) gerçekten çalışıyor, ama "İlanı Yayınla" butonu Firestore'a yazmıyor — sadece bir onay mesajı gösterip formu sıfırlıyor.
4. **"Ara" / "Mesaj Gönder" butonları** (ilan detay ekranı) no-op, gerçek bir iletişim/mesajlaşma sistemi yok.

## Nasıl çalıştırılır

```bash
npm install
npx expo start        # Expo Go ile telefonda test için (QR kod)
npx expo start --web  # Tarayıcıda test için
```

Firebase'e gerçek bağlanmak için `.env.example` dosyasını `.env` olarak kopyalayıp kendi Firebase proje anahtarlarınızı girin (`EXPO_PUBLIC_FIREBASE_*`).
