import * as Location from 'expo-location';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

export async function requestAndGetLocation(): Promise<Coordinates | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const position = await Location.getCurrentPositionAsync({});
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export async function reverseGeocodeLabel(coords: Coordinates): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    const first = results[0];
    if (!first) return null;
    const parts = [first.subregion || first.district, first.city || first.region].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  } catch {
    return null;
  }
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Haversine formula — iki koordinat arasi kus ucusu mesafe (km).
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export const DISTANCE_FILTERS = [5, 10, 25, 50, 100];

export type City = {
  name: string;
  latitude: number;
  longitude: number;
};

// Turkiye'nin 81 ili, il merkezi koordinatlariyla — GPS reddedilirse elle
// secim icin. Alfabetik siralandi.
export const TURKISH_CITIES: City[] = [
  { name: 'Adana', latitude: 37.0, longitude: 35.3213 },
  { name: 'Adıyaman', latitude: 37.7648, longitude: 38.2786 },
  { name: 'Afyonkarahisar', latitude: 38.7507, longitude: 30.5567 },
  { name: 'Ağrı', latitude: 39.7191, longitude: 43.0503 },
  { name: 'Aksaray', latitude: 38.3687, longitude: 34.036 },
  { name: 'Amasya', latitude: 40.6499, longitude: 35.8353 },
  { name: 'Ankara', latitude: 39.9334, longitude: 32.8597 },
  { name: 'Antalya', latitude: 36.8969, longitude: 30.7133 },
  { name: 'Ardahan', latitude: 41.1105, longitude: 42.7022 },
  { name: 'Artvin', latitude: 41.1828, longitude: 41.8183 },
  { name: 'Aydın', latitude: 37.856, longitude: 27.8416 },
  { name: 'Balıkesir', latitude: 39.6484, longitude: 27.8826 },
  { name: 'Bartın', latitude: 41.6344, longitude: 32.3375 },
  { name: 'Batman', latitude: 37.8812, longitude: 41.1351 },
  { name: 'Bayburt', latitude: 40.2552, longitude: 40.2249 },
  { name: 'Bilecik', latitude: 40.1506, longitude: 29.9792 },
  { name: 'Bingöl', latitude: 38.8855, longitude: 40.4966 },
  { name: 'Bitlis', latitude: 38.4006, longitude: 42.1095 },
  { name: 'Bolu', latitude: 40.7392, longitude: 31.6089 },
  { name: 'Burdur', latitude: 37.7203, longitude: 30.2908 },
  { name: 'Bursa', latitude: 40.1885, longitude: 29.061 },
  { name: 'Çanakkale', latitude: 40.1553, longitude: 26.4142 },
  { name: 'Çankırı', latitude: 40.6013, longitude: 33.6134 },
  { name: 'Çorum', latitude: 40.5506, longitude: 34.9556 },
  { name: 'Denizli', latitude: 37.7765, longitude: 29.0864 },
  { name: 'Diyarbakır', latitude: 37.9144, longitude: 40.2306 },
  { name: 'Düzce', latitude: 40.8438, longitude: 31.1565 },
  { name: 'Edirne', latitude: 41.6771, longitude: 26.5557 },
  { name: 'Elazığ', latitude: 38.681, longitude: 39.2264 },
  { name: 'Erzincan', latitude: 39.75, longitude: 39.5 },
  { name: 'Erzurum', latitude: 39.9, longitude: 41.27 },
  { name: 'Eskişehir', latitude: 39.7767, longitude: 30.5206 },
  { name: 'Gaziantep', latitude: 37.0662, longitude: 37.3833 },
  { name: 'Giresun', latitude: 40.9128, longitude: 38.3895 },
  { name: 'Gümüşhane', latitude: 40.4386, longitude: 39.5086 },
  { name: 'Hakkari', latitude: 37.5744, longitude: 43.7408 },
  { name: 'Hatay', latitude: 36.4018, longitude: 36.3498 },
  { name: 'Iğdır', latitude: 39.9167, longitude: 44.0333 },
  { name: 'Isparta', latitude: 37.7648, longitude: 30.5566 },
  { name: 'İstanbul', latitude: 41.0082, longitude: 28.9784 },
  { name: 'İzmir', latitude: 38.4237, longitude: 27.1428 },
  { name: 'Kahramanmaraş', latitude: 37.5858, longitude: 36.9371 },
  { name: 'Karabük', latitude: 41.2061, longitude: 32.6204 },
  { name: 'Karaman', latitude: 37.1759, longitude: 33.2287 },
  { name: 'Kars', latitude: 40.6013, longitude: 43.0975 },
  { name: 'Kastamonu', latitude: 41.3887, longitude: 33.7827 },
  { name: 'Kayseri', latitude: 38.7312, longitude: 35.4787 },
  { name: 'Kırıkkale', latitude: 39.8468, longitude: 33.5153 },
  { name: 'Kırklareli', latitude: 41.7333, longitude: 27.2167 },
  { name: 'Kırşehir', latitude: 39.1425, longitude: 34.1709 },
  { name: 'Kilis', latitude: 36.7184, longitude: 37.1212 },
  { name: 'Kocaeli', latitude: 40.8533, longitude: 29.8815 },
  { name: 'Konya', latitude: 37.8746, longitude: 32.4932 },
  { name: 'Kütahya', latitude: 39.4242, longitude: 29.9833 },
  { name: 'Malatya', latitude: 38.3552, longitude: 38.3095 },
  { name: 'Manisa', latitude: 38.6191, longitude: 27.4289 },
  { name: 'Mardin', latitude: 37.3212, longitude: 40.7245 },
  { name: 'Mersin', latitude: 36.8, longitude: 34.6333 },
  { name: 'Muğla', latitude: 37.2153, longitude: 28.3636 },
  { name: 'Muş', latitude: 38.9462, longitude: 41.7539 },
  { name: 'Nevşehir', latitude: 38.6939, longitude: 34.6857 },
  { name: 'Niğde', latitude: 37.9667, longitude: 34.6833 },
  { name: 'Ordu', latitude: 40.9839, longitude: 37.8764 },
  { name: 'Osmaniye', latitude: 37.0742, longitude: 36.2478 },
  { name: 'Rize', latitude: 41.0201, longitude: 40.5234 },
  { name: 'Sakarya', latitude: 40.694, longitude: 30.4358 },
  { name: 'Samsun', latitude: 41.2867, longitude: 36.33 },
  { name: 'Siirt', latitude: 37.9333, longitude: 41.95 },
  { name: 'Sinop', latitude: 42.0231, longitude: 35.1531 },
  { name: 'Sivas', latitude: 39.7477, longitude: 37.0179 },
  { name: 'Şanlıurfa', latitude: 37.1591, longitude: 38.7969 },
  { name: 'Şırnak', latitude: 37.4187, longitude: 42.4918 },
  { name: 'Tekirdağ', latitude: 40.9833, longitude: 27.5167 },
  { name: 'Tokat', latitude: 40.3167, longitude: 36.55 },
  { name: 'Trabzon', latitude: 41.0027, longitude: 39.7168 },
  { name: 'Tunceli', latitude: 39.3074, longitude: 39.4388 },
  { name: 'Uşak', latitude: 38.6823, longitude: 29.4082 },
  { name: 'Van', latitude: 38.4891, longitude: 43.4089 },
  { name: 'Yalova', latitude: 40.65, longitude: 29.2667 },
  { name: 'Yozgat', latitude: 39.8181, longitude: 34.8147 },
  { name: 'Zonguldak', latitude: 41.4564, longitude: 31.7987 },
];
