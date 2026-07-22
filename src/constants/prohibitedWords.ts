// Ilan basligi/aciklamasinda kufur/hakaret icip icmedigini kontrol etmek icin
// kullanilan kelime listesi. Amac agir moderasyon degil, en yaygin kufur ve
// hakaretleri ilan yayinlanmadan once yakalayip kullaniciya uyari vermek.
const PROHIBITED_WORDS = new Set([
  'amk',
  'amq',
  'aq',
  'orospu',
  'orospucocugu',
  'piç',
  'pic',
  'yavşak',
  'yavsak',
  'göt',
  'got',
  'götveren',
  'gotveren',
  'ibne',
  'top',
  'sik',
  'siktir',
  'sikik',
  'sikeyim',
  'amcık',
  'amcik',
  'kaltak',
  'kahpe',
  'şerefsiz',
  'serefsiz',
  'şerefsizin',
  'serefsizin',
  'oç',
  'oc',
  'yarrak',
  'yarak',
  'dalyarak',
  'dalyarrak',
  'ananı',
  'anani',
  'anasını',
  'anasini',
  'bok',
  'boktan',
  'salak',
  'gerizekalı',
  'gerizekali',
  'mal',
  'mankafa',
  'hıyar',
  'hiyar',
  'pezevenk',
  'puşt',
  'pust',
  'dingil',
  'dingo',
  'ahmak',
]);

export function findProhibitedWord(text: string): string | null {
  const normalized = text.toLocaleLowerCase('tr-TR');
  const tokens = normalized.split(/[^a-zçğıöşü]+/i).filter(Boolean);
  for (const token of tokens) {
    if (PROHIBITED_WORDS.has(token)) return token;
  }
  return null;
}
