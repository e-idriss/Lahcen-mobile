/**
 * Saving a captured view to the device gallery.
 *
 * `MediaLibrary.saveToLibraryAsync` is deprecated in SDK 57 in favour of the
 * class-based `Asset.create`. The permission functions are NOT deprecated —
 * only the save call is — so only that part changes.
 *
 * Uses dynamic import and Platform guard to support Web, iOS, and Android seamlessly.
 */

import { Platform } from 'react-native';

export type SaveResult =
  | { status: 'saved' }
  | { status: 'permission-denied' }
  | { status: 'failed'; error: unknown };

/**
 * Writes an already-captured file to the user's gallery / downloads.
 */
export async function saveImageToGallery(uri: string): Promise<SaveResult> {
  if (Platform.OS === 'web') {
    try {
      if (typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.href = uri;
        link.download = `quran_wallpaper_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { status: 'saved' };
      }
      return { status: 'failed', error: new Error('Document is undefined on web') };
    } catch (error) {
      return { status: 'failed', error };
    }
  }

  try {
    const MediaLibrary = await import('expo-media-library');
    // writeOnly: this app only ever adds images; it never reads the library
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) return { status: 'permission-denied' };

    await MediaLibrary.Asset.create(uri);
    return { status: 'saved' };
  } catch (error) {
    return { status: 'failed', error };
  }
}
