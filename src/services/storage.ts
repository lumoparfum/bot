import { Image } from 'react-native';
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { storage } from './firebase';

// Ilan fotograflari urun detayini (yipranma, hasar vb.) gosterebilmeli, o
// yuzden daha yuksek boyut/kalite hedefi kullanilir.
const LISTING_TARGET_DIMENSION = 1080;
const LISTING_MAX_FILE_BYTES = 35 * 1024;
// Profil fotografi uygulamada en fazla ~84px gosteriliyor - 1080px/50KB
// gereksiz, cok daha kucuk bir hedef yeterli ve daha hizli yukleniyor.
const AVATAR_TARGET_DIMENSION = 400;
const AVATAR_MAX_FILE_BYTES = 5 * 1024;
const QUALITY_STEPS = [0.7, 0.55, 0.4, 0.28, 0.18, 0.12, 0.08];

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

async function compress(
  uri: string,
  targetDimension: number,
  maxFileBytes: number,
  square = false
): Promise<Blob> {
  const { width, height } = await getImageSize(uri);
  const actions: ImageManipulator.Action[] = [];
  let workingWidth = width;
  let workingHeight = height;

  if (square) {
    // Avatar dairesel gosterildigi icin ortadan kare kirpilir - boylece
    // kullaniciya native kirpma ekranini gostermemize gerek kalmiyor
    // (Android'de bu ekran bazen onceki ekranin arkasinda kalarak gorsel
    // bir hataya yol aciyordu).
    const side = Math.min(width, height);
    actions.push({
      crop: { originX: (width - side) / 2, originY: (height - side) / 2, width: side, height: side },
    });
    workingWidth = side;
    workingHeight = side;
  }

  const longestSide = Math.max(workingWidth, workingHeight);
  const targetSide = Math.min(targetDimension, longestSide);
  actions.push(
    workingWidth >= workingHeight ? { resize: { width: targetSide } } : { resize: { height: targetSide } }
  );

  let lastBlob: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const blob = await (await fetch(result.uri)).blob();
    if (blob.size <= maxFileBytes) return blob;
    lastBlob = blob;
  }
  // En dusuk kalitede bile hedefin ustundeyse (nadir, cok detayli foto),
  // elimizdeki en kucuk sonucu kullan.
  return lastBlob as Blob;
}

export async function compressImage(uri: string): Promise<Blob> {
  return compress(uri, LISTING_TARGET_DIMENSION, LISTING_MAX_FILE_BYTES);
}

function compressAvatarImage(uri: string): Promise<Blob> {
  return compress(uri, AVATAR_TARGET_DIMENSION, AVATAR_MAX_FILE_BYTES, true);
}

// Yol icinde sellerId tasinir (listings/{listingId}/{sellerId}/{dosya}) -
// storage.rules bu sayede sahiplik dogrulamasini Firestore'a hic
// sormadan, dogrudan yoldan yapabiliyor. Firestore'a capraz sorgu yapan
// onceki kural (firestore.get) canli ortamda guvenilmez cikti - kullanici
// duzenlemede yeni fotograf eklerken "kaydedilemedi" hatasi alıyordu.
export async function uploadListingImages(
  listingId: string,
  sellerId: string,
  localUris: string[]
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < localUris.length; i++) {
    const blob = await compressImage(localUris[i]);
    const imageRef = ref(storage, `listings/${listingId}/${sellerId}/${i}-${Date.now()}.jpg`);
    await uploadBytes(imageRef, blob);
    urls.push(await getDownloadURL(imageRef));
  }
  return urls;
}

export async function deleteListingImages(listingId: string): Promise<void> {
  const folderRef = ref(storage, `listings/${listingId}`);
  const result = await listAll(folderRef);
  // Eski (goc oncesi) duz yoldaki dosyalar, varsa.
  await Promise.all(result.items.map((item) => deleteObject(item).catch(() => {})));
  // Yeni yapida resimler {sellerId} alt klasorunde - o klasorleri de gez.
  await Promise.all(
    result.prefixes.map(async (prefixRef) => {
      const subResult = await listAll(prefixRef);
      await Promise.all(subResult.items.map((item) => deleteObject(item).catch(() => {})));
    })
  );
}

// Sabit dosya adi (photo.jpg) kullanilir - her degisiklikte eskisinin
// ustune yazilir, artik dosya birikmez.
export async function uploadAvatarImage(uid: string, localUri: string): Promise<string> {
  const blob = await compressAvatarImage(localUri);
  const imageRef = ref(storage, `avatars/${uid}/photo.jpg`);
  await uploadBytes(imageRef, blob);
  const url = await getDownloadURL(imageRef);
  // Sabit dosya yolu her degisiklikte ayni URL'i dondurebilir - resim onbellekleri
  // (expo-image vb.) o zaman eski fotografi gostermeye devam eder. Benzersiz
  // bir sorgu parametresi eklemek onbellegi her yuklemede tazeler.
  return `${url}&_t=${Date.now()}`;
}

export async function deleteImageByUrl(url: string): Promise<void> {
  await deleteObject(ref(storage, url)).catch(() => {});
}
