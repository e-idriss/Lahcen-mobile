/**
 * QCF Data Service.
 *
 * Fetches, caches, and parses word-by-word QCF metadata (with `code_v2` glyphs and `line_number`)
 * for Hafs Madani Mushaf pages (1..604).
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface QcfWord {
  id: number;
  position: number;
  audioUrl?: string | null;
  charTypeName: 'word' | 'end';
  codeV2: string;
  lineNumber: number;
  pageNumber: number;
  text: string;
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  translation?: string;
}

export interface SurahMetaHeader {
  surahNumber: number;
  nameAr: string;
  nameEn: string;
  revelation: 'Meccan' | 'Medinan';
  ayahCount: number;
}

export type LineItem =
  | { type: 'surah_header'; surah: SurahMetaHeader; lineNumber: number }
  | { type: 'basmalah'; surahNumber: number; lineNumber: number }
  | { type: 'text'; words: QcfWord[]; lineNumber: number };

export interface QcfPageLayout {
  pageNumber: number;
  lines: LineItem[];
}

const DATA_CACHE_DIR = `${FileSystem.documentDirectory ?? ''}qcf_v2_data/`;
const memoryCache = new Map<number, QcfPageLayout>();
const inFlightPromises = new Map<number, Promise<QcfPageLayout | null>>();

async function ensureDataDir(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const info = await FileSystem.getInfoAsync(DATA_CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(DATA_CACHE_DIR, { intermediates: true });
    }
  } catch (err) {
    console.warn('[qcfDataService] Error creating data cache dir:', err);
  }
}

/**
 * Parses raw verses response from Quran.com API into 15-line layout items.
 */
export function buildQcfPageLayout(pageNumber: number, verses: any[], surahMetaMap: Map<number, SurahMetaHeader>): QcfPageLayout {
  const lineWordsMap = new Map<number, QcfWord[]>();

  // Map words to lines
  for (const v of verses) {
    const [sStr, aStr] = (v.verse_key || `${v.surah_number}:${v.verse_number}`).split(':');
    const surahNumber = parseInt(sStr, 10);
    const ayahNumber = parseInt(aStr, 10);

    for (const w of v.words || []) {
      const lineNum = Number(w.line_number);
      if (!lineWordsMap.has(lineNum)) {
        lineWordsMap.set(lineNum, []);
      }

      lineWordsMap.get(lineNum)!.push({
        id: w.id,
        position: w.position,
        audioUrl: w.audio_url,
        charTypeName: w.char_type_name === 'end' ? 'end' : 'word',
        codeV2: w.code_v2 || w.text || '',
        lineNumber: lineNum,
        pageNumber: w.page_number || pageNumber,
        text: w.text_uthmani || w.text || '',
        verseKey: v.verse_key || `${surahNumber}:${ayahNumber}`,
        surahNumber,
        ayahNumber,
        translation: w.translation?.text,
      });
    }
  }

  // Find all surahs starting on this page (where ayah === 1)
  const surahsStartingOnPage: Array<{ surahNumber: number; minLine: number }> = [];
  for (const v of verses) {
    const [sStr, aStr] = (v.verse_key || `${v.surah_number}:${v.verse_number}`).split(':');
    const surahNumber = parseInt(sStr, 10);
    const ayahNumber = parseInt(aStr, 10);

    if (ayahNumber === 1) {
      const firstWordLine = v.words?.[0]?.line_number ?? 15;
      surahsStartingOnPage.push({ surahNumber, minLine: firstWordLine });
    }
  }

  // Build special line assignments (surah_header and basmalah)
  const specialLineTypes = new Map<number, { type: 'surah_header' | 'basmalah'; surahNumber: number; meta: SurahMetaHeader }>();
  
  for (const s of surahsStartingOnPage) {
    const meta = surahMetaMap.get(s.surahNumber) || {
      surahNumber: s.surahNumber,
      nameAr: '',
      nameEn: '',
      revelation: 'Meccan' as const,
      ayahCount: 0,
    };

    // Find consecutive empty lines immediately preceding minLine
    const prevEmpty: number[] = [];
    for (let l = s.minLine - 1; l >= 1; l--) {
      if (!lineWordsMap.has(l) && !specialLineTypes.has(l)) {
        prevEmpty.unshift(l);
      } else {
        break;
      }
    }

    if (s.surahNumber === 1) {
      specialLineTypes.set(1, { type: 'surah_header', surahNumber: 1, meta });
    } else if (s.surahNumber === 9) {
      if (prevEmpty.length >= 1) {
        specialLineTypes.set(prevEmpty[prevEmpty.length - 1], { type: 'surah_header', surahNumber: 9, meta });
      }
    } else if (prevEmpty.length >= 2) {
      specialLineTypes.set(prevEmpty[prevEmpty.length - 2], { type: 'surah_header', surahNumber: s.surahNumber, meta });
      specialLineTypes.set(prevEmpty[prevEmpty.length - 1], { type: 'basmalah', surahNumber: s.surahNumber, meta });
    } else if (prevEmpty.length === 1) {
      // Exactly 1 empty line before verse 1 (e.g. Page 77, 208, 332) -> It is the Surah Header Banner!
      specialLineTypes.set(prevEmpty[0], { type: 'surah_header', surahNumber: s.surahNumber, meta });
    }
  }

  // For pages 1 and 2, the Mushaf opening pages have exactly 8 lines (Header, Basmalah, 6 text lines)
  // For standard pages 3..604, there are 15 lines.
  const maxLines = pageNumber === 1 || pageNumber === 2 ? 8 : 15;
  const lines: LineItem[] = [];

  for (let l = 1; l <= maxLines; l++) {
    const words = lineWordsMap.get(l);

    if (specialLineTypes.has(l)) {
      const info = specialLineTypes.get(l)!;
      if (info.type === 'surah_header') {
        lines.push({
          type: 'surah_header',
          lineNumber: l,
          surah: info.meta,
        });
      } else {
        lines.push({
          type: 'basmalah',
          lineNumber: l,
          surahNumber: info.surahNumber,
        });
      }
    } else if (words && words.length > 0) {
      lines.push({
        type: 'text',
        lineNumber: l,
        words,
      });
    } else {
      lines.push({
        type: 'text',
        lineNumber: l,
        words: [],
      });
    }
  }

  return { pageNumber, lines };
}

/**
 * Loads QCF page data with memory and filesystem caching.
 */
export async function getQcfPageData(
  pageNumber: number,
  surahMetaMap: Map<number, SurahMetaHeader>,
): Promise<QcfPageLayout | null> {
  if (pageNumber < 1 || pageNumber > 604) return null;

  // 1. Memory cache
  if (memoryCache.has(pageNumber)) {
    return memoryCache.get(pageNumber)!;
  }

  // 2. In-flight request
  if (inFlightPromises.has(pageNumber)) {
    return inFlightPromises.get(pageNumber)!;
  }

  const loadPromise = (async () => {
    try {
      const cacheFilePath = `${DATA_CACHE_DIR}page_${pageNumber}.json`;

      // 3. Local filesystem check on native
      if (Platform.OS !== 'web') {
        await ensureDataDir();
        const fileInfo = await FileSystem.getInfoAsync(cacheFilePath);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(cacheFilePath);
          const parsed = JSON.parse(content);
          const layout = buildQcfPageLayout(pageNumber, parsed.verses || [], surahMetaMap);
          memoryCache.set(pageNumber, layout);
          return layout;
        }
      }

      // 4. Remote API fetch with text_uthmani
      const url = `https://api.quran.com/api/v4/verses/by_page/${pageNumber}?words=true&word_fields=code_v2,text_uthmani,line_number,page_number`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}`);
      }

      const json = await res.json();

      // Save to disk cache
      if (Platform.OS !== 'web') {
        try {
          await FileSystem.writeAsStringAsync(cacheFilePath, JSON.stringify(json));
        } catch (writeErr) {
          console.warn(`[qcfDataService] Could not write cache file for page ${pageNumber}:`, writeErr);
        }
      }

      const layout = buildQcfPageLayout(pageNumber, json.verses || [], surahMetaMap);
      memoryCache.set(pageNumber, layout);
      return layout;
    } catch (err) {
      console.warn(`[qcfDataService] Failed to load data for page ${pageNumber}:`, err);
      return null;
    } finally {
      inFlightPromises.delete(pageNumber);
    }
  })();

  inFlightPromises.set(pageNumber, loadPromise);
  return loadPromise;
}

/**
 * Prefetches adjacent page data in the background.
 */
export function prefetchAdjacentQcfData(
  currentPage: number,
  surahMetaMap: Map<number, SurahMetaHeader>,
): void {
  const pagesToPrefetch = [
    currentPage + 1,
    currentPage - 1,
    currentPage + 2,
    currentPage - 2,
  ].filter((p) => p >= 1 && p <= 604);

  for (const p of pagesToPrefetch) {
    if (!memoryCache.has(p) && !inFlightPromises.has(p)) {
      void getQcfPageData(p, surahMetaMap);
    }
  }
}
