import { Image } from 'react-native';
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { storage } from './firebase';

// Tum ilan fotograflari tutarli olsun diye sabit bir uzun kenara indirip
// dosya boyutu 50KB'i gecmeyene kadar kaliteyi kademeli dusuruyoruz.
const TARGET_DIMENSION = 1080;
const MAX_FILE_BYTES = 50 * 1024;
const QUALITY_STEPS = [0.7, 0.55, 0.4, 0.28, 0.18, 0.12, 0.08];

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

async function compressImage(uri: string): Promise<Blob> {
  const { width, height } = await getImageSize(uri);
  const longestSide = Math.max(width, height);
  const targetSide = Math.min(TARGET_DIMENSION, longestSide);
  const resizeAction = width >= height ? { resize: { width: targetSide } } : { resize: { height: targetSide } };

  let lastBlob: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const result = await ImageManipulator.manipulateAsync(uri, [resizeAction], {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const blob = await (await fetch(result.uri)).blob();
    if (blob.size <= MAX_FILE_BYTES) return blob;
    lastBlob = blob;
  }
  // En dusuk kalitede bile 100KB'in ustundeyse (nadir, cok detayli foto),
  // elimizdeki en kucuk sonucu kullan.
  return lastBlob as Blob;
}

export async function uploadListingImages(listingId: string, localUris: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < localUris.length; i++) {
    const blob = await compressImage(localUris[i]);
    const imageRef = ref(storage, `listings/${listingId}/${i}-${Date.now()}.jpg`);
    await uploadBytes(imageRef, blob);
    urls.push(await getDownloadURL(imageRef));
  }
  return urls;
}

export async function deleteListingImages(listingId: string): Promise<void> {
  const folderRef = ref(storage, `listings/${listingId}`);
  const result = await listAll(folderRef);
  await Promise.all(result.items.map((item) => deleteObject(item).catch(() => {})));
}
