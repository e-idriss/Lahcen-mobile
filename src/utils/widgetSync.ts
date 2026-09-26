/**
 * Widget synchronization utility.
 *
 * Prepares, formats, and syncs data payloads for iOS Home Screen Widgets (WidgetKit)
 * and Android App Widgets across 4 categories:
 * 1. Next Prayer & Countdown / Adhan Time (الصلاة القادمة ومواقيت الصلاة)
 * 2. Hijri Date (التاريخ الهجري مع الخطوط الإسلامية)
 * 3. Continue Reading Quran (متابعة الورد القرآني)
 * 4. Ayah of the Day & Daily Reflection (آية وتدبر اليوم)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAyahRange } from '../data/database';
import { toArabicDigits } from './arabicDigits';
import { WEEKDAYS_AR, getHijriToday } from './hijriDate';

export interface NextPrayerWidgetPayload {
  nextPrayerKey: string;
  nextPrayerNameAr: string;
  nextPrayerCalligraphyKey: string | null;
  adhanTime: string;
  adhanTimeArabic: string;
  timeRemainingFormatted: string;
  timeRemainingSeconds: number;
  cityName: string;
  prayers: Array<{
    key: string;
    nameAr: string;
    timeFormatted: string;
    isCurrent: boolean;
    isNext: boolean;
  }>;
  updatedAt: string;
}


export interface HijriWidgetPayload {
  day: number;
  dayArabic: string;
  weekdayName: string;
  weekdayLigature: string;
  monthNameAr: string;
  monthLigature: string;
  year: number;
  yearArabic: string;
  yearWithSuffix: string;
  gregorianDateFormatted: string;
  updatedAt: string;
}

export interface LastReadWidgetPayload {
  surahNumber: number;
  surahNameAr: string;
  ayahNumber: number;
  ayahArabic: string;
  pageNumber: number;
  pageArabic: string;
  juzNumber: number;
  juzArabic: string;
  updatedAt: string;
}

export interface DailyAyahWidgetPayload {
  surahNumber: number;
  surahNameAr: string;
  ayahNumber: number;
  ayahArabic: string;
  pageNumber: number;
  text: string;
  theme: string;
  updatedAt: string;
}

export const WIDGET_STORAGE_KEY_NEXT_PRAYER = '@quran_widget_next_prayer';
export const WIDGET_STORAGE_KEY_HIJRI = '@quran_widget_hijri';
export const WIDGET_STORAGE_KEY_LAST_READ = '@quran_widget_last_read';
export const WIDGET_STORAGE_KEY_DAILY_AYAH = '@quran_widget_daily_ayah';

/**
 * The daily-ayah rotation, as REFERENCES only.
 *
 * The Arabic text is not stored here: it is read from `text_display` in the
 * bundled database by `loadTodayAyahText`. An earlier version retyped these
 * verses inline and seven of the eight were silently truncated mid-ayah.
 */
export interface CuratedVerseRef {
  surahNumber: number;
  surahNameAr: string;
  ayahNumber: number;
  pageNumber: number;
  theme: string;
}

export const CURATED_DAILY_VERSES: CuratedVerseRef[] = [
  { surahNumber: 13, surahNameAr: "الرعد", ayahNumber: 28, pageNumber: 252, theme: "السكينة والطمأنينة" },
  { surahNumber: 94, surahNameAr: "الشرح", ayahNumber: 6, pageNumber: 596, theme: "البشرى والفرج القريب" },
  { surahNumber: 2, surahNameAr: "البقرة", ayahNumber: 186, pageNumber: 28, theme: "الدعاء والقرب من الله" },
  { surahNumber: 65, surahNameAr: "الطلاق", ayahNumber: 3, pageNumber: 558, theme: "التوكل واليقين" },
  { surahNumber: 20, surahNameAr: "طه", ayahNumber: 114, pageNumber: 320, theme: "طلب العلم والهدى" },
  { surahNumber: 39, surahNameAr: "الزمر", ayahNumber: 53, pageNumber: 464, theme: "سعة رحمة الله تعالى" },
  { surahNumber: 14, surahNameAr: "إبراهيم", ayahNumber: 7, pageNumber: 256, theme: "الشكر والزيادة في الخير" },
  { surahNumber: 57, surahNameAr: "الحديد", ayahNumber: 4, pageNumber: 537, theme: "معية الله الدائمة" },
];

/** Which curated verse today falls on. Rotates once per day. */
export function getTodayAyah(): CuratedVerseRef {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return CURATED_DAILY_VERSES[dayOfYear % CURATED_DAILY_VERSES.length];
}

/** Today's verse with its Arabic text loaded from the database. */
export async function loadTodayAyahText(): Promise<string> {
  const verse = getTodayAyah();
  const [ayah] = await getAyahRange(verse.surahNumber, verse.ayahNumber, verse.ayahNumber);
  return ayah?.text ?? "";
}

/**
 * Syncs the Next Prayer widget data payload.
 */
export async function syncNextPrayerWidgetData(data: {
  nextPrayerKey: string;
  nextPrayerNameAr: string;
  nextPrayerCalligraphyKey: string | null;
  adhanTime: string;
  timeRemainingFormatted: string;
  timeRemainingSeconds: number;
  cityName?: string;
  prayers?: Array<{
    key: string;
    nameAr: string;
    timeFormatted: string;
    isCurrent: boolean;
    isNext: boolean;
  }>;
}): Promise<NextPrayerWidgetPayload> {
  const payload: NextPrayerWidgetPayload = {
    nextPrayerKey: data.nextPrayerKey,
    nextPrayerNameAr: data.nextPrayerNameAr,
    nextPrayerCalligraphyKey: data.nextPrayerCalligraphyKey,
    adhanTime: data.adhanTime,
    adhanTimeArabic: toArabicDigits(data.adhanTime),
    timeRemainingFormatted: data.timeRemainingFormatted,
    timeRemainingSeconds: data.timeRemainingSeconds,
    cityName: data.cityName || 'موقعي الحالي',
    prayers: data.prayers || [],
    updatedAt: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(WIDGET_STORAGE_KEY_NEXT_PRAYER, JSON.stringify(payload));
  } catch {}

  return payload;
}

/**
 * Syncs the current Hijri date to widget storage.
 */
export async function syncHijriWidgetData(): Promise<HijriWidgetPayload> {
  const hijri = getHijriToday();
  const now = new Date();
  const gregorianFormatted = now.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const payload: HijriWidgetPayload = {
    day: hijri.dayOfMonth,
    dayArabic: toArabicDigits(hijri.dayOfMonth),
    weekdayName: WEEKDAYS_AR[hijri.weekday] || 'اليوم',
    weekdayLigature: hijri.weekdayLigature,
    monthNameAr: hijri.monthNameAr,
    monthLigature: hijri.monthLigature,
    year: hijri.year,
    yearArabic: toArabicDigits(hijri.year),
    yearWithSuffix: `${toArabicDigits(hijri.year)} هـ`,
    gregorianDateFormatted: gregorianFormatted,
    updatedAt: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(WIDGET_STORAGE_KEY_HIJRI, JSON.stringify(payload));
  } catch {}

  return payload;
}

/**
 * Syncs the last read Quran position to widget storage.
 */
export async function syncLastReadWidgetData(data: {
  surahNumber: number;
  surahNameAr: string;
  ayahNumber: number;
  pageNumber: number;
  juzNumber: number;
}): Promise<LastReadWidgetPayload> {
  const payload: LastReadWidgetPayload = {
    ...data,
    ayahArabic: toArabicDigits(data.ayahNumber),
    pageArabic: toArabicDigits(data.pageNumber),
    juzArabic: toArabicDigits(data.juzNumber),
    updatedAt: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(WIDGET_STORAGE_KEY_LAST_READ, JSON.stringify(payload));
  } catch {}

  return payload;
}

/**
 * Syncs the Daily Ayah widget data payload.
 */
export async function syncDailyAyahWidgetData(): Promise<DailyAyahWidgetPayload> {
  const verse = getTodayAyah();
  const payload: DailyAyahWidgetPayload = {
    surahNumber: verse.surahNumber,
    surahNameAr: verse.surahNameAr,
    ayahNumber: verse.ayahNumber,
    ayahArabic: toArabicDigits(verse.ayahNumber),
    pageNumber: verse.pageNumber,
    text: await loadTodayAyahText(),
    theme: verse.theme,
    updatedAt: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(WIDGET_STORAGE_KEY_DAILY_AYAH, JSON.stringify(payload));
  } catch {}

  return payload;
}
