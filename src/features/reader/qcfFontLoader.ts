/**
 * QCF v2 (Quran Complex Font) Manager and Loader.
 *
 * Provides on-demand font downloading from the official QuranCDN v2 repository,
 * local disk caching via `expo-file-system`, and registration via `expo-font`.
 *
 * Official V2 Fonts:
 * - Internal PostScript / Family Name: QCF2001 .. QCF2604
 * - Native (iOS/Android): https://static.qurancdn.com/fonts/quran/hafs/v2/ttf/p{page}.ttf
 * - Web: https://static.qurancdn.com/fonts/quran/hafs/v2/woff2/p{page}.woff2
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Font from 'expo-font';
import { Platform } from 'react-native';

const FONT_CACHE_DIR = `${FileSystem.documentDirectory ?? ''}qcf_v2_fonts/`;

/** In-flight font loading promises to avoid duplicate simultaneous downloads */
const inFlightFontPromises = new Map<string, Promise<boolean>>();

/** Map of successfully registered fonts in the current runtime */
const loadedFontsSet = new Set<string>();

/**
 * Returns the exact PostScript / fontFamily identifier for a given mushaf page (1..604).
 * On iOS and Android, this MUST match the NameID 6 (PostScript Name) in the TTF binary: QCF2001..QCF2604.
 */
export function getQcfFontFamily(page: number): string {
  const padded = String(page).padStart(3, '0');
  return `QCF2${padded}`;
}

/**
 * Primary CDN URL for the King Fahd Complex QCF v2 font.
 */
export function getQcfFontUrl(page: number): string {
  if (Platform.OS === 'web') {
    return `https://static.qurancdn.com/fonts/quran/hafs/v2/woff2/p${page}.woff2`;
  }
  return `https://static.qurancdn.com/fonts/quran/hafs/v2/ttf/p${page}.ttf`;
}

/**
 * Ensures the font directory exists on device.
 */
async function ensureFontDir(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const info = await FileSystem.getInfoAsync(FONT_CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(FONT_CACHE_DIR, { intermediates: true });
    }
  } catch (err) {
    console.warn('[qcfFontLoader] Failed to create font cache dir:', err);
  }
}

/**
 * Loads the QCF v2 font for a given page.
 * Checks runtime memory -> local filesystem -> downloads from CDN if needed.
 */
export async function ensureQcfFontLoaded(page: number): Promise<boolean> {
  if (page < 1 || page > 604) return false;

  const fontName = getQcfFontFamily(page);

  // 1. Check if already loaded in runtime
  if (loadedFontsSet.has(fontName) || Font.isLoaded(fontName)) {
    loadedFontsSet.add(fontName);
    return true;
  }

  // 2. Check if already loading in flight
  const existingPromise = inFlightFontPromises.get(fontName);
  if (existingPromise) {
    return existingPromise;
  }

  const loadPromise = (async () => {
    try {
      const fontUrl = getQcfFontUrl(page);

      if (Platform.OS === 'web') {
        // On Web, expo-font handles direct remote URLs or dynamic @font-face
        await Font.loadAsync({
          [fontName]: fontUrl,
        });
        loadedFontsSet.add(fontName);
        return true;
      }

      // Native (iOS/Android)
      await ensureFontDir();
      const localFilePath = `${FONT_CACHE_DIR}${fontName}.ttf`;
      const fileInfo = await FileSystem.getInfoAsync(localFilePath);

      let targetUri = localFilePath;
      if (!fileInfo.exists || fileInfo.size === 0) {
        // Download official v2 font file
        const downloadRes = await FileSystem.downloadAsync(fontUrl, localFilePath);
        if (downloadRes.status !== 200) {
          throw new Error(`Failed to download font: status ${downloadRes.status}`);
        }
        targetUri = downloadRes.uri;
      }

      await Font.loadAsync({
        [fontName]: targetUri,
      });

      loadedFontsSet.add(fontName);
      return true;
    } catch (err) {
      console.warn(`[qcfFontLoader] Could not load font ${fontName}:`, err);
      return false;
    } finally {
      inFlightFontPromises.delete(fontName);
    }
  })();

  inFlightFontPromises.set(fontName, loadPromise);
  return loadPromise;
}

/**
 * Prefetches adjacent pages in the background.
 */
export function prefetchAdjacentQcfFonts(currentPage: number): void {
  const pagesToPrefetch = [
    currentPage + 1,
    currentPage - 1,
    currentPage + 2,
    currentPage - 2,
  ].filter((p) => p >= 1 && p <= 604);

  for (const p of pagesToPrefetch) {
    const fontName = getQcfFontFamily(p);
    if (!loadedFontsSet.has(fontName) && !Font.isLoaded(fontName)) {
      void ensureQcfFontLoaded(p);
    }
  }
}
