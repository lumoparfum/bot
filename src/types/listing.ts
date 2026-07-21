import type { Ionicons } from '@expo/vector-icons';

export type ListingCondition = 'Sıfır' | 'Az Kullanılmış' | 'İkinci El';

export type ListingLocation = {
  label: string;
  latitude: number | null;
  longitude: number | null;
};

export type ListingStatus = 'active' | 'sold';

export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory: string | null;
  condition: ListingCondition;
  images: string[];
  location: ListingLocation;
  sellerId: string;
  sellerName: string;
  sellerPhotoURL: string | null;
  createdAt: number;
  status: ListingStatus;
  viewCount: number;
  soldTo: string | null;
  favoriteCount: number;
  priceHistory: { price: number; changedAt: number }[];
  attributes: Record<string, string>;
};

// Telefon hacim/adet bazinda tek basina en yuksek talep, o yuzden birinci.
// Arac ve Emlak hemen ardindan geliyor - rakiplerde de boyle: letgo'nun
// kategori listesinde "Araba" ilk sirada, sahibinden.com'un ana navigasyonu
// Emlak/Vasita ile baslar. Eskiden bunlari en sona atmistik cunku km/m2 gibi
// ozel alanlari yoktu; artik tam destekleniyor, geride durmalarinin anlami kalmadi.
export const categories = [
  'Telefon',
  'Araç',
  'Emlak',
  'Giyim',
  'Ayakkabı & Çanta',
  'Elektronik',
  'Ev Eşyası',
  'Mobilya',
  'Bilgisayar',
  'Anne & Bebek',
  'Spor & Outdoor',
  'Oyun & Konsol',
  'Kitap & Hobi',
  'Diğer',
];

// Her ana kategorinin alt kategorileri - "Diger" secenegi her listenin
// sonunda genel bir kacis kapisi olarak duruyor. Giyim ve Ayakkabi & Canta,
// sahibinden.com ve Dolap'in gercek kategori agaclari incelenerek urun
// TIPINE gore ayrildi (cinsiyet burada degil, asagida bir ozellik/attribute
// olarak soruluyor - ikisi de rakiplerde boyle).
export const subcategories: Record<string, string[]> = {
  Telefon: ['Akıllı Telefon', 'Tablet', 'Akıllı Saat', 'Telefon Aksesuarı', 'Kılıf & Ekran Koruyucu', 'Diğer Telefon'],
  Giyim: [
    'Tişört',
    'Gömlek',
    'Kazak & Süveter',
    'Sweatshirt',
    'Ceket',
    'Mont & Kaban',
    'Pantolon',
    'Elbise & Abiye',
    'Etek',
    'Eşofman & Şort',
    'Takım Elbise',
    'İç Giyim & Pijama',
    'Diğer Giyim',
  ],
  'Ayakkabı & Çanta': [
    'Spor Ayakkabı',
    'Bot & Çizme',
    'Sandalet & Terlik',
    'Topuklu Ayakkabı',
    'Babet & Oxford',
    'Sırt Çantası',
    'Omuz & Askılı Çanta',
    'Cüzdan & Portföy',
    'Diğer',
  ],
  Elektronik: ['Televizyon', 'Ses Sistemi & Kulaklık', 'Kamera & Fotoğraf', 'Beyaz Eşya', 'Küçük Ev Aletleri', 'Diğer Elektronik'],
  'Ev Eşyası': ['Mutfak Gereçleri', 'Dekorasyon', 'Aydınlatma', 'Halı & Tekstil', 'Bahçe & Balkon', 'Diğer'],
  Mobilya: ['Oturma Grubu', 'Yatak Odası', 'Yemek Odası', 'Ofis Mobilyası', 'Çocuk Odası', 'Diğer Mobilya'],
  Bilgisayar: ['Dizüstü Bilgisayar', 'Masaüstü Bilgisayar', 'Monitör', 'Bilgisayar Aksesuarı', 'Yazıcı & Tarayıcı', 'Diğer'],
  'Anne & Bebek': ['Bebek Giyim', 'Bebek Arabası & Oto Koltuğu', 'Oyuncak', 'Bebek Odası', 'Bebek Bakım Ürünleri', 'Diğer'],
  'Spor & Outdoor': ['Fitness Ekipmanı', 'Bisiklet', 'Kamp & Doğa', 'Spor Giyim', 'Outdoor Ekipman', 'Diğer'],
  'Oyun & Konsol': ['Oyun Konsolu', 'Video Oyunu', 'Konsol Aksesuarı', 'PC Oyun Ekipmanı', 'Diğer'],
  'Kitap & Hobi': ['Kitap', 'Müzik Aleti', 'El Sanatları', 'Koleksiyon', 'Kırtasiye', 'Diğer'],
  Araç: ['Otomobil', 'Motosiklet', 'Ticari Araç', 'Karavan', 'Araç Aksesuarı & Yedek Parça'],
  Emlak: ['Satılık Daire', 'Kiralık Daire', 'Ofis & İş Yeri', 'Arsa', 'Yazlık'],
  Diğer: ['Diğer'],
};

// 'select': secilebilir etiketlerden biri secilir. 'number': km/m2/yil gibi
// serbest sayisal deger - metin girisiyle, "unit" varsa deger kaydedilirken
// sonuna eklenir (ornegin "85000 km"). 'text': olcu gibi serbest, kisa metin
// notu - secilebilir sabit bir liste yok, filtrelenemez (sadece bilgi amacli).
export type AttributeDef =
  | { key: string; label: string; type?: 'select'; options: string[] }
  | {
      key: string;
      label: string;
      type: 'number';
      placeholder: string;
      unit?: string;
      // Yil gibi alanlarda binlik ayirac istenmez (2019 -> "2.019" yanlis
      // gorunur), ama km/m2 gibi buyuk miktarlarda okunurlugu artirir.
      formatThousands?: boolean;
    }
  | { key: string; label: string; type: 'text'; placeholder: string };

const RENK_OPTIONS = ['Siyah', 'Beyaz', 'Gri', 'Mavi', 'Kırmızı', 'Yeşil', 'Sarı', 'Pembe', 'Mor', 'Kahverengi', 'Diğer'];
const GARANTI_OPTIONS = ['Var', 'Yok'];
const BEDEN_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Diğer'];
const NUMARA_OPTIONS = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const CINSIYET_OPTIONS = ['Kadın', 'Erkek', 'Çocuk', 'Unisex'];
// Dolap'in resmi ilan kurallari Marka'yi "cekirdek" alanlardan biri olarak
// listeliyor (arama/siralama algoritmasi bunu kullaniyor) - biz de Giyim ve
// Ayakkabi & Canta'da ayni sekilde ekliyoruz. Dolap'taki gibi zorunlu ve
// eslesmezse ilan silen bir kontrol degil - "Diger" her zaman kaçış kapisi,
// kullaniciyi hic cezalandirmiyoruz.
const GIYIM_MARKA_OPTIONS = [
  'Zara', 'Bershka', 'Pull & Bear', 'Stradivarius', 'Mango', 'H&M', 'LC Waikiki',
  'Koton', 'Defacto', 'Mavi', 'İpekyol', 'Network', 'Diğer',
];
const AYAKKABI_CANTA_MARKA_OPTIONS = [
  'Nike', 'Adidas', 'Puma', 'New Balance', 'Converse', 'Skechers',
  'Michael Kors', 'Guess', 'Furla', 'Zara', 'Mango', 'LC Waikiki', 'Diğer',
];

// Rakiplerdeki (letgo, Dolap, sahibinden) gibi kategoriye ozel yapilandirilmis
// alanlar - hepsi opsiyonel. Arac ve Emlak da dahil (km/m2/yil "number" tipi
// alanlarla, marka/yakit/oda sayisi gibi seyler "select" ile soruluyor).
export const categoryAttributes: Record<string, AttributeDef[]> = {
  Telefon: [
    { key: 'Marka', label: 'Marka', options: ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Oppo', 'Diğer'] },
    { key: 'Depolama', label: 'Depolama', options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB+'] },
    { key: 'Pil Sağlığı', label: 'Pil Sağlığı', options: ['%90+', '%80-89', '%70-79', '%70 altı', 'Bilinmiyor'] },
    { key: 'Garanti', label: 'Garanti', options: GARANTI_OPTIONS },
  ],
  Elektronik: [
    { key: 'Marka', label: 'Marka', options: ['Samsung', 'LG', 'Sony', 'Arçelik', 'Bosch', 'Vestel', 'Diğer'] },
    { key: 'Garanti', label: 'Garanti', options: GARANTI_OPTIONS },
  ],
  Bilgisayar: [
    { key: 'Marka', label: 'Marka', options: ['Apple', 'Asus', 'Lenovo', 'HP', 'Dell', 'Monster', 'Diğer'] },
    { key: 'RAM', label: 'RAM', options: ['4GB', '8GB', '16GB', '32GB+'] },
    { key: 'Depolama', label: 'Depolama', options: ['128GB', '256GB', '512GB', '1TB+'] },
    { key: 'Garanti', label: 'Garanti', options: GARANTI_OPTIONS },
  ],
  // Olculer (govde/bel/boy gibi) opsiyonel serbest metin alani - Dolap
  // sikayetlerinde en cok tekrar eden noktalardan biri "urunlerde olcu bilgisi
  // eksik" idi, biz bunu ilana dahil ediyoruz.
  Giyim: [
    { key: 'Cinsiyet', label: 'Cinsiyet', options: CINSIYET_OPTIONS },
    { key: 'Marka', label: 'Marka', options: GIYIM_MARKA_OPTIONS },
    { key: 'Beden', label: 'Beden', options: BEDEN_OPTIONS },
    { key: 'Renk', label: 'Renk', options: RENK_OPTIONS },
    {
      key: 'Ölçüler',
      label: 'Ölçüler (opsiyonel)',
      type: 'text',
      placeholder: 'Örn. Göğüs 90cm, Bel 74cm, Boy 150cm',
    },
  ],
  // Numara (ayakkabi bedeni) burada YOK - Sirt Cantasi/Cuzdan gibi alt
  // kategorilerde anlamsiz oldugu icin asagida getAttributeDefs'te sadece
  // gercek ayakkabi alt kategorilerinde dinamik olarak ekleniyor.
  'Ayakkabı & Çanta': [
    { key: 'Cinsiyet', label: 'Cinsiyet', options: CINSIYET_OPTIONS },
    { key: 'Marka', label: 'Marka', options: AYAKKABI_CANTA_MARKA_OPTIONS },
    { key: 'Renk', label: 'Renk', options: RENK_OPTIONS },
  ],
  'Oyun & Konsol': [
    { key: 'Marka', label: 'Marka', options: ['PlayStation', 'Xbox', 'Nintendo', 'PC', 'Diğer'] },
    { key: 'Garanti', label: 'Garanti', options: GARANTI_OPTIONS },
  ],
  'Anne & Bebek': [
    { key: 'Yaş Grubu', label: 'Yaş Grubu', options: ['0-6 Ay', '6-12 Ay', '1-3 Yaş', '3-6 Yaş', '6+ Yaş'] },
    { key: 'Renk', label: 'Renk', options: RENK_OPTIONS },
  ],
  Araç: [
    {
      key: 'Marka',
      label: 'Marka',
      // Sira: TOGG en basta (bilinçli), sonrasi hem 2026 ODMD sifir satis
      // verisi hem de Turkiye'nin 2.el parkinda gercekten yaygin olan eski
      // markalar (Opel, Daewoo, Chevrolet gibi artik sifir satilmayan ama
      // yollarda cok olan markalar) birlikte dusunulerek siralandi.
      options: [
        'TOGG', 'Renault', 'Fiat', 'Toyota', 'Peugeot', 'Ford', 'Hyundai', 'Citroën',
        'Volkswagen', 'Opel', 'Dacia', 'Daewoo', 'Kia', 'Skoda', 'Mercedes', 'BMW',
        'Audi', 'Nissan', 'Honda', 'Chevrolet', 'Suzuki', 'Mazda', 'Mitsubishi', 'Seat',
        'Volvo', 'MG', 'Chery', 'BYD', 'Haval', 'Cupra', 'DS', 'Jeep', 'Land Rover',
        'Mini', 'Porsche', 'Lexus', 'Jaguar', 'Alfa Romeo', 'Subaru', 'SsangYong',
        'Smart', 'Isuzu', 'Infiniti', 'Proton', 'Lada', 'Anadol', 'Tesla', 'Diğer',
      ],
    },
    { key: 'Model Yılı', label: 'Model Yılı', type: 'number', placeholder: 'Örn. 2019' },
    { key: 'Kilometre', label: 'Kilometre', type: 'number', placeholder: 'Örn. 85000', unit: 'km', formatThousands: true },
    { key: 'Yakıt Tipi', label: 'Yakıt Tipi', options: ['Benzin', 'Dizel', 'LPG', 'Elektrik', 'Hibrit'] },
    { key: 'Vites', label: 'Vites', options: ['Manuel', 'Otomatik', 'Yarı Otomatik'] },
  ],
  Emlak: [
    { key: 'm²', label: 'Brüt Metrekare', type: 'number', placeholder: 'Örn. 120', unit: 'm²', formatThousands: true },
    { key: 'Oda Sayısı', label: 'Oda Sayısı', options: ['Stüdyo (1+0)', '1+1', '2+1', '3+1', '4+1', '5+1', '5+1 Üzeri'] },
    { key: 'Bina Yaşı', label: 'Bina Yaşı', options: ['0 (Yeni)', '1-5', '6-10', '11-15', '16-20', '21-25', '25+'] },
    { key: 'Bulunduğu Kat', label: 'Bulunduğu Kat', options: ['Bodrum/Zemin', 'Yüksek Giriş', '1-5', '6-10', '11-20', '20+', 'Villa Tipi'] },
    { key: 'Isıtma', label: 'Isıtma', options: ['Doğalgaz (Kombi)', 'Merkezi', 'Yerden Isıtma', 'Klima', 'Soba', 'Yok'] },
  ],
};

// Marka secildikten sonra (sadece Otomobil'de) "Model" adimi devreye girer -
// sahibinden.com'daki marka->model akisiyla ayni mantik. Her markanin en
// yaygin modelleri var, "Diger" ile hicbir sey eksik kalmiyor.
export const carModels: Record<string, string[]> = {
  TOGG: ['T10X', 'T10F', 'Diğer'],
  Renault: ['Clio', 'Megane', 'Symbol', 'Fluence', 'Talisman', 'Captur', 'Kadjar', 'Duster', 'Kangoo', 'Toros', 'Broadway', 'Diğer'],
  // Sahin, Dogan, Kartal, Marea - Turkiye'nin 2.el parkinda hala cok yaygin
  // klasik Tofas modelleri, modern Egea/Linea'nin yaninda mutlaka olmali.
  Fiat: [
    'Egea', 'Egea Cross', 'Linea', 'Punto', '500', 'Panda', 'Doblo', 'Tipo',
    'Şahin', 'Doğan', 'Kartal', 'Marea', 'Murat 131', 'Murat 124', 'Diğer',
  ],
  Toyota: ['Corolla', 'Yaris', 'C-HR', 'RAV4', 'Auris', 'Camry', 'Hilux', 'Land Cruiser', 'Diğer'],
  Peugeot: ['208', '301', '308', '508', '2008', '3008', '5008', 'Partner', 'Diğer'],
  Ford: ['Fiesta', 'Focus', 'Mondeo', 'Kuga', 'Puma', 'EcoSport', 'Courier', 'Tourneo', 'Diğer'],
  Hyundai: ['i20', 'i10', 'i30', 'Accent', 'Elantra', 'Tucson', 'Kona', 'Bayon', 'Santa Fe', 'Diğer'],
  Citroën: ['C3', 'C4', 'C-Elysée', 'Berlingo', 'C5 Aircross', 'Diğer'],
  Volkswagen: ['Polo', 'Golf', 'Passat', 'Jetta', 'Tiguan', 'T-Roc', 'T-Cross', 'Caddy', 'Touran', 'Arteon', 'Diğer'],
  Opel: ['Corsa', 'Astra', 'Vectra', 'Insignia', 'Mokka', 'Crossland', 'Combo', 'Diğer'],
  Dacia: ['Duster', 'Sandero', 'Logan', 'Jogger', 'Spring', 'Diğer'],
  // Cielo, Nexia, Espero, Matiz artik sifir satilmiyor ama 2.el pazarinda
  // hala cok sayida araci var - unutmamak lazim.
  Daewoo: ['Cielo', 'Nexia', 'Espero', 'Matiz', 'Lanos', 'Tosca', 'Diğer'],
  Kia: ['Picanto', 'Rio', 'Ceed', 'Sportage', 'Stonic', 'Sorento', 'Niro', 'Diğer'],
  Skoda: ['Fabia', 'Octavia', 'Superb', 'Kodiaq', 'Karoq', 'Scala', 'Diğer'],
  Mercedes: ['A Serisi', 'B Serisi', 'C Serisi', 'E Serisi', 'S Serisi', 'CLA', 'GLA', 'GLC', 'GLE', 'Vito', 'Diğer'],
  BMW: ['1 Serisi', '2 Serisi', '3 Serisi', '4 Serisi', '5 Serisi', '7 Serisi', 'X1', 'X2', 'X3', 'X5', 'X6', 'Diğer'],
  Audi: ['A1', 'A3', 'A4', 'A5', 'A6', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'TT', 'Diğer'],
  Nissan: ['Micra', 'Note', 'Qashqai', 'Juke', 'X-Trail', 'Navara', 'Diğer'],
  Honda: ['Civic', 'City', 'CR-V', 'Jazz', 'HR-V', 'Accord', 'Diğer'],
  Chevrolet: ['Cruze', 'Lacetti', 'Aveo', 'Spark', 'Captiva', 'Epica', 'Diğer'],
  Suzuki: ['Swift', 'Vitara', 'S-Cross', 'Jimny', 'Baleno', 'Diğer'],
  Mazda: ['Mazda2', 'Mazda3', 'CX-3', 'CX-5', 'CX-30', 'Diğer'],
  Mitsubishi: ['Space Star', 'ASX', 'Outlander', 'L200', 'Lancer', 'Diğer'],
  Seat: ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Toledo', 'Diğer'],
  Volvo: ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V60', 'Diğer'],
  MG: ['MG3', 'MG5', 'ZS', 'HS', 'Diğer'],
  Chery: ['Tiggo 4', 'Tiggo 7', 'Tiggo 8', 'Arrizo', 'Diğer'],
  BYD: ['Atto 3', 'Seal', 'Dolphin', 'Han', 'Song Plus', 'Diğer'],
  Haval: ['Jolion', 'H6', 'Diğer'],
  Cupra: ['Formentor', 'Leon', 'Born', 'Diğer'],
  DS: ['DS 3', 'DS 4', 'DS 7', 'Diğer'],
  Jeep: ['Renegade', 'Compass', 'Cherokee', 'Wrangler', 'Grand Cherokee', 'Diğer'],
  'Land Rover': ['Discovery Sport', 'Range Rover Evoque', 'Range Rover Sport', 'Defender', 'Diğer'],
  Mini: ['Cooper', 'Countryman', 'Clubman', 'Diğer'],
  Porsche: ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Diğer'],
  Lexus: ['NX', 'RX', 'ES', 'IS', 'UX', 'Diğer'],
  Jaguar: ['XE', 'XF', 'F-Pace', 'E-Pace', 'Diğer'],
  'Alfa Romeo': ['Giulietta', 'Giulia', 'Stelvio', 'Tonale', 'Diğer'],
  Subaru: ['Forester', 'Outback', 'XV', 'Impreza', 'Diğer'],
  SsangYong: ['Korando', 'Tivoli', 'Rexton', 'Actyon', 'Diğer'],
  Smart: ['Fortwo', 'Forfour', 'Diğer'],
  Isuzu: ['D-Max', 'Diğer'],
  Infiniti: ['Q30', 'QX70', 'Diğer'],
  Proton: ['Wira', 'Persona', 'Gen-2', 'Diğer'],
  // Eski Sovyet/Rus mensei, hala klasik/butce 2.el pazarinda goruluyor.
  Lada: ['1200 (Jiguli)', '2107', 'Niva', 'Diğer'],
  // Turkiye'nin ilk yerli otomobili (1966-1984) - 2.el/klasik pazarda hala var.
  Anadol: ['A1', 'A2', 'STC-16', 'Diğer'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Diğer'],
};

// Numara (ayakkabi numarasi) sadece gercek ayakkabi alt kategorilerinde
// soruluyor - Sirt Cantasi, Omuz & Askili Canta, Cuzdan & Portfoy gibi
// canta/cuzdan turlerinde ayakkabi numarasi sormanin bir anlami yok.
const AYAKKABI_NUMARA_SUBCATEGORIES = new Set([
  'Spor Ayakkabı', 'Bot & Çizme', 'Sandalet & Terlik', 'Topuklu Ayakkabı', 'Babet & Oxford',
]);

// "Arac Aksesuari & Yedek Parca" bir tasit degil, km/yil gibi arac
// alanlarinin orada anlami yok - bu alt kategoride ozellik sorulmaz.
export function getAttributeDefs(category: string | null, subcategory: string | null): AttributeDef[] {
  if (!category) return [];
  if (category === 'Araç' && subcategory === 'Araç Aksesuarı & Yedek Parça') return [];
  const base = categoryAttributes[category] ?? [];
  if (category === 'Ayakkabı & Çanta' && subcategory && AYAKKABI_NUMARA_SUBCATEGORIES.has(subcategory)) {
    const markaIndex = base.findIndex((def) => def.key === 'Marka');
    const numaraDef: AttributeDef = { key: 'Numara', label: 'Numara', options: NUMARA_OPTIONS };
    const next = [...base];
    next.splice(markaIndex + 1, 0, numaraDef);
    return next;
  }
  return base;
}

// Sihirbaz her adimda bunu cagirir: Marka secilmisse (sadece Otomobil'de) ve
// o markanin bilinen modelleri varsa, "Model" adimini Marka'nin hemen
// ardina dinamik olarak ekler.
export function getEffectiveAttributeDefs(
  category: string | null,
  subcategory: string | null,
  attrValues: Record<string, string>
): AttributeDef[] {
  const base = getAttributeDefs(category, subcategory);
  if (category !== 'Araç' || subcategory !== 'Otomobil') return base;
  const brand = attrValues['Marka'];
  const models = brand ? carModels[brand] : undefined;
  if (!models || models.length === 0) return base;
  const markaIndex = base.findIndex((def) => def.key === 'Marka');
  if (markaIndex === -1) return base;
  const modelDef: AttributeDef = { key: 'Model', label: 'Model', options: models };
  const next = [...base];
  next.splice(markaIndex + 1, 0, modelDef);
  return next;
}

// Kategori sohbet balonlarinda gosterilen ikonlar (Ionicons glyph adlari).
export const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Tümü: 'apps-outline',
  Elektronik: 'hardware-chip-outline',
  Telefon: 'phone-portrait-outline',
  Bilgisayar: 'laptop-outline',
  'Ev Eşyası': 'home-outline',
  Mobilya: 'cube-outline',
  Giyim: 'shirt-outline',
  'Ayakkabı & Çanta': 'bag-handle-outline',
  Araç: 'car-outline',
  Emlak: 'business-outline',
  'Anne & Bebek': 'happy-outline',
  'Spor & Outdoor': 'basketball-outline',
  'Kitap & Hobi': 'book-outline',
  'Oyun & Konsol': 'game-controller-outline',
  Diğer: 'ellipsis-horizontal-outline',
};

export const conditions: ListingCondition[] = ['Sıfır', 'Az Kullanılmış', 'İkinci El'];
