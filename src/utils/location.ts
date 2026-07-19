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

// Nufusa gore buyuk sehirler (il merkezi koordinatlari) — GPS reddedilirse
// elle secim icin.
export const TURKISH_CITIES: City[] = [
  { name: 'İstanbul', latitude: 41.0082, longitude: 28.9784 },
  { name: 'Ankara', latitude: 39.9334, longitude: 32.8597 },
  { name: 'İzmir', latitude: 38.4237, longitude: 27.1428 },
  { name: 'Bursa', latitude: 40.1885, longitude: 29.061 },
  { name: 'Antalya', latitude: 36.8969, longitude: 30.7133 },
  { name: 'Adana', latitude: 37.0, longitude: 35.3213 },
  { name: 'Konya', latitude: 37.8746, longitude: 32.4932 },
  { name: 'Gaziantep', latitude: 37.0662, longitude: 37.3833 },
  { name: 'Şanlıurfa', latitude: 37.1591, longitude: 38.7969 },
  { name: 'Kocaeli', latitude: 40.8533, longitude: 29.8815 },
  { name: 'Mersin', latitude: 36.8, longitude: 34.6333 },
  { name: 'Diyarbakır', latitude: 37.9144, longitude: 40.2306 },
  { name: 'Kayseri', latitude: 38.7312, longitude: 35.4787 },
  { name: 'Eskişehir', latitude: 39.7767, longitude: 30.5206 },
  { name: 'Samsun', latitude: 41.2867, longitude: 36.33 },
  { name: 'Denizli', latitude: 37.7765, longitude: 29.0864 },
  { name: 'Malatya', latitude: 38.3552, longitude: 38.3095 },
  { name: 'Trabzon', latitude: 41.0027, longitude: 39.7168 },
  { name: 'Van', latitude: 38.4891, longitude: 43.4089 },
  { name: 'Erzurum', latitude: 39.9, longitude: 41.27 },
  { name: 'Sakarya', latitude: 40.694, longitude: 30.4358 },
  { name: 'Manisa', latitude: 38.6191, longitude: 27.4289 },
  { name: 'Balıkesir', latitude: 39.6484, longitude: 27.8826 },
  { name: 'Kahramanmaraş', latitude: 37.5858, longitude: 36.9371 },
  { name: 'Aydın', latitude: 37.856, longitude: 27.8416 },
  { name: 'Tekirdağ', latitude: 40.9833, longitude: 27.5167 },
  { name: 'Muğla', latitude: 37.2153, longitude: 28.3636 },
  { name: 'Ordu', latitude: 40.9839, longitude: 37.8764 },
  { name: 'Afyonkarahisar', latitude: 38.7507, longitude: 30.5567 },
];
