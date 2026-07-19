import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadListingImages(listingId: string, localUris: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < localUris.length; i++) {
    const response = await fetch(localUris[i]);
    const blob = await response.blob();
    const imageRef = ref(storage, `listings/${listingId}/${i}-${Date.now()}.jpg`);
    await uploadBytes(imageRef, blob);
    urls.push(await getDownloadURL(imageRef));
  }
  return urls;
}
