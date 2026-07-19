import { Image } from 'react-native';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { storage } from './firebase';

// Telefon kameraları 8-12MB'a kadar foto üretebiliyor — Firebase'e ham
// haliyle atmak yerine önce uzun kenarı 1600px'e indirip JPEG %70 kaliteyle
// sıkıştırıyoruz (genelde 200-400KB'a düşüyor).
const MAX_DIMENSION = 1600;
const COMPRESS_QUALITY = 0.7;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

async function compressImage(uri: string): Promise<string> {
  const { width, height } = await getImageSize(uri);
  const longestSide = Math.max(width, height);
  const resizeAction =
    longestSide > MAX_DIMENSION
      ? width >= height
        ? { resize: { width: MAX_DIMENSION } }
        : { resize: { height: MAX_DIMENSION } }
      : null;

  const result = await ImageManipulator.manipulateAsync(
    uri,
    resizeAction ? [resizeAction] : [],
    { compress: COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

export async function uploadListingImages(listingId: string, localUris: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < localUris.length; i++) {
    const compressedUri = await compressImage(localUris[i]);
    const response = await fetch(compressedUri);
    const blob = await response.blob();
    const imageRef = ref(storage, `listings/${listingId}/${i}-${Date.now()}.jpg`);
    await uploadBytes(imageRef, blob);
    urls.push(await getDownloadURL(imageRef));
  }
  return urls;
}
