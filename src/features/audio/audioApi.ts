/**
 * MP3Quran.net API v3 client with persistent caching.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Reciter } from './types';

const API_BASE = 'https://www.mp3quran.net/api/v3';
const CACHE_KEY_RECITERS = '@mp3quran_reciters_v3';

/** Popular featured reciters IDs for quick spotlight */
export const POPULAR_RECITER_IDS = [
  123, // مشاري العفاسي
  112, // محمد صديق المنشاوي
  118, // محمود خليل الحصري
  102, // ماهر المعيقلي
  12,  // إدريس أبكر
  54,  // عبد الباسط عبد الصمد
  92,  // عبد الرحمن السديس
  107, // محمد اللحيدان
  138, // نورين محمد صديق
  16,  // العيون الكوشي
  108, // محمد المحيسني
  109, // محمد أيوب
  160, // عادل الكلباني
];

/**
 * Returns 3-digit padded surah number: 1 -> "001", 114 -> "114"
 */
export function padSurah(surah: number): string {
  return String(surah).padStart(3, '0');
}

/**
 * Computes direct streaming/download MP3 URL for a given surah.
 */
export function getSurahAudioUrl(serverUrl: string, surahNumber: number): string {
  const cleanServer = serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`;
  return `${cleanServer}${padSurah(surahNumber)}.mp3`;
}

/**
 * Validates one reciter from the API response.
 *
 * The response is untrusted input: its `server` field is turned straight into
 * a streaming and download URL, so a malformed or plain-HTTP entry would have
 * the app fetch audio over a cleartext connection. Anything that does not
 * match the expected shape — or that is not HTTPS — is dropped rather than
 * cast through with `as`.
 */
function isValidReciter(value: unknown): value is Reciter {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<Reciter>;

  if (typeof r.id !== 'number' || typeof r.name !== 'string') return false;
  if (!Array.isArray(r.moshaf)) return false;

  return r.moshaf.every(
    (m) =>
      typeof m === 'object' &&
      m !== null &&
      typeof m.id === 'number' &&
      typeof m.server === 'string' &&
      m.server.startsWith('https://') &&
      typeof m.surah_list === 'string',
  );
}

/** Keeps only the well-formed reciters from an API payload. */
export function parseRecitersResponse(json: unknown): Reciter[] {
  if (typeof json !== 'object' || json === null) return [];
  const { reciters } = json as { reciters?: unknown };
  if (!Array.isArray(reciters)) return [];

  return reciters.filter(isValidReciter);
}

/**
 * Fetches all available reciters from MP3Quran API, with local storage cache.
 */
export async function fetchReciters(): Promise<Reciter[]> {
  // Try loading from local cache first
  const cached = await readRecitersCache();
  if (cached.length > 0) {
    // Fetch a fresh copy in the background. Failures are expected offline and
    // must not surface as an unhandled rejection — the cache already answered.
    void refreshRecitersCache().catch(() => {});
    return cached;
  }

  return refreshRecitersCache();
}

/**
 * Fetches fresh list from API and updates cache.
 */
async function refreshRecitersCache(): Promise<Reciter[]> {
  try {
    const res = await fetch(`${API_BASE}/reciters?language=ar`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const reciters = parseRecitersResponse(await res.json());

    if (reciters.length > 0) {
      // Only the validated list is cached, so a bad payload cannot persist.
      await AsyncStorage.setItem(CACHE_KEY_RECITERS, JSON.stringify(reciters));
    }
    return reciters;
  } catch (error) {
    // If offline and cache exists, return cache
    const cached = await readRecitersCache();
    if (cached.length > 0) return cached;
    throw error;
  }
}

/**
 * Reads the cached reciters, re-validating them.
 *
 * The cache is on-device JSON written by an earlier app version, so it is
 * revalidated rather than trusted: a payload cached before validation existed
 * would otherwise flow straight through.
 */
async function readRecitersCache(): Promise<Reciter[]> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY_RECITERS);
    if (cached === null) return [];
    const parsed: unknown = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed.filter(isValidReciter) : [];
  } catch {
    return [];
  }
}
