/**
 * Data source for the native Android home-screen widgets.
 *
 * The widget task handler runs in a short-lived headless JS context with no
 * access to the app's Zustand stores, so everything a widget needs is mirrored
 * into a single AsyncStorage blob (`WIDGET_DATA_KEY`) by `refreshWidgetData`,
 * which the app calls on launch and whenever the underlying values change.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAyahRange } from '../../data/database';
import { toArabicDigits } from '../../utils/arabicDigits';
import { getHijriToday } from '../../utils/hijriDate';
import { getPrayerTimes } from '../prayer/prayerService';
import type { CalculationMethodName } from '../prayer/types';
import {
  CURATED_DAILY_VERSES,
  getTodayAyah,
} from '../../utils/widgetSync';

export const WIDGET_DATA_KEY = '@quran_widget_data_v1';

export interface WidgetData {
  nextPrayer: {
    nameAr: string;
    timeFormatted: string;
    remainingFormatted: string;
    cityName: string;
    all: Array<{ nameAr: string; timeFormatted: string; isNext: boolean }>;
  };
  hijri: {
    dayArabic: string;
    monthNameAr: string;
    yearWithSuffix: string;
    gregorianFormatted: string;
  };
  lastRead: {
    surahNameAr: string;
    ayahArabic: string;
    pageArabic: string;
  } | null;
  dailyAyah: {
    text: string;
    surahNameAr: string;
    ayahArabic: string;
    theme: string;
  };
  updatedAt: string;
}

interface RefreshInput {
  latitude: number;
  longitude: number;
  calculationMethod: CalculationMethodName;
  isHanafi: boolean;
  cityName: string;
  lastRead: { surahNameAr: string; ayah: number; page: number } | null;
}

/** Recomputes the widget blob from current app state and persists it. */
export async function refreshWidgetData(input: RefreshInput): Promise<WidgetData> {
  const now = new Date();
  const prayer = getPrayerTimes(
    input.latitude,
    input.longitude,
    now,
    input.calculationMethod,
    input.isHanafi,
  );
  const hijri = getHijriToday();
  const verse = getTodayAyah();

  let ayahText = '';
  try {
    const [ayah] = await getAyahRange(verse.surahNumber, verse.ayahNumber, verse.ayahNumber);
    ayahText = ayah?.text ?? '';
  } catch {
    // Leave empty rather than showing hand-typed scripture.
  }

  const data: WidgetData = {
    nextPrayer: {
      nameAr: prayer.nextPrayer?.nameAr ?? 'الفجر',
      timeFormatted: prayer.nextPrayer?.timeFormatted ?? '--:--',
      remainingFormatted: prayer.timeRemainingFormatted,
      cityName: input.cityName || 'موقعي الحالي',
      all: prayer.all
        .filter((p) => p.key !== 'sunrise')
        .map((p) => ({ nameAr: p.nameAr, timeFormatted: p.timeFormatted, isNext: p.isNext })),
    },
    hijri: {
      dayArabic: toArabicDigits(hijri.dayOfMonth),
      monthNameAr: hijri.monthNameAr,
      yearWithSuffix: `${toArabicDigits(hijri.year)} هـ`,
      gregorianFormatted: now.toLocaleDateString('ar-SA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    },
    lastRead: input.lastRead
      ? {
          surahNameAr: input.lastRead.surahNameAr,
          ayahArabic: toArabicDigits(input.lastRead.ayah),
          pageArabic: toArabicDigits(input.lastRead.page),
        }
      : null,
    dailyAyah: {
      text: ayahText,
      surahNameAr: verse.surahNameAr,
      ayahArabic: toArabicDigits(verse.ayahNumber),
      theme: verse.theme,
    },
    updatedAt: now.toISOString(),
  };

  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  } catch {
    // Non-fatal: the widget keeps showing its last good render.
  }

  return data;
}

/** Reads the persisted widget blob. Used by the headless task handler. */
export async function readWidgetData(): Promise<WidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw === null) return null;
    return JSON.parse(raw) as WidgetData;
  } catch {
    return null;
  }
}

/** A safe default so a widget added before the app has ever run still renders. */
export function placeholderWidgetData(): WidgetData {
  const verse = CURATED_DAILY_VERSES[0];
  return {
    nextPrayer: {
      nameAr: 'الصلاة',
      timeFormatted: '--:--',
      remainingFormatted: '--:--',
      cityName: 'افتح التطبيق لتحديث المواقيت',
      all: [],
    },
    hijri: {
      dayArabic: toArabicDigits(getHijriToday().dayOfMonth),
      monthNameAr: getHijriToday().monthNameAr,
      yearWithSuffix: `${toArabicDigits(getHijriToday().year)} هـ`,
      gregorianFormatted: new Date().toLocaleDateString('ar-SA'),
    },
    lastRead: null,
    dailyAyah: {
      text: '',
      surahNameAr: verse.surahNameAr,
      ayahArabic: toArabicDigits(verse.ayahNumber),
      theme: verse.theme,
    },
    updatedAt: new Date().toISOString(),
  };
}
