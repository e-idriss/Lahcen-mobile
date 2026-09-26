/**
 * Prayer Times Service using Batoul Apps 'adhan' library.
 *
 * 100% offline, high-precision astronomical calculations based on Jean Meeus algorithms.
 */

import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
  type CalculationParameters,
} from 'adhan';

import { toArabicDigits } from '../../utils/arabicDigits';
import type {
  CalculationMethodName,
  CityPreset,
  PrayerKey,
  PrayerTimeItem,
  PrayerTimesResult,
} from './types';

/**
 * Major City Presets for quick selection & offline fallback.
 */
export const CITY_PRESETS: CityPreset[] = [
  { id: 'makkah', nameAr: 'مكة المكرمة', nameEn: 'Makkah', countryAr: 'المملكة العربية السعودية', lat: 21.4225, lng: 39.8262 },
  { id: 'madinah', nameAr: 'المدينة المنورة', nameEn: 'Madinah', countryAr: 'المملكة العربية السعودية', lat: 24.5247, lng: 39.5692 },
  { id: 'jerusalem', nameAr: 'القدس الشريف', nameEn: 'Jerusalem', countryAr: 'فلسطين', lat: 31.7683, lng: 35.2137 },
  { id: 'riyadh', nameAr: 'الرياض', nameEn: 'Riyadh', countryAr: 'المملكة العربية السعودية', lat: 24.7136, lng: 46.6753 },
  { id: 'cairo', nameAr: 'القاهرة', nameEn: 'Cairo', countryAr: 'مصر', lat: 30.0444, lng: 31.2357 },
  { id: 'casablanca', nameAr: 'الدار البيضاء', nameEn: 'Casablanca', countryAr: 'المغرب', lat: 33.5731, lng: -7.5898 },
  { id: 'rabat', nameAr: 'الرباط', nameEn: 'Rabat', countryAr: 'المغرب', lat: 34.0209, lng: -6.8416 },
  { id: 'algiers', nameAr: 'الجزائر العاصمة', nameEn: 'Algiers', countryAr: 'الجزائر', lat: 36.7538, lng: 3.0588 },
  { id: 'tunis', nameAr: 'تونس', nameEn: 'Tunis', countryAr: 'تونس', lat: 36.8065, lng: 10.1815 },
  { id: 'dubai', nameAr: 'دبي', nameEn: 'Dubai', countryAr: 'الإمارات العربية المتحدة', lat: 25.2048, lng: 55.2708 },
  { id: 'doha', nameAr: 'الدوحة', nameEn: 'Doha', countryAr: 'قطر', lat: 25.2854, lng: 51.531 },
  { id: 'kuwait', nameAr: 'مدينة الكويت', nameEn: 'Kuwait City', countryAr: 'الكويت', lat: 29.3759, lng: 47.9774 },
  { id: 'paris', nameAr: 'باريس', nameEn: 'Paris', countryAr: 'فرنسا', lat: 48.8566, lng: 2.3522 },
  { id: 'london', nameAr: 'لندن', nameEn: 'London', countryAr: 'المملكة المتحدة', lat: 51.5074, lng: -0.1278 },
  { id: 'istanbul', nameAr: 'إسطنبول', nameEn: 'Istanbul', countryAr: 'تركيا', lat: 41.0082, lng: 28.9784 },
  { id: 'newyork', nameAr: 'نيويورك', nameEn: 'New York', countryAr: 'الولايات المتحدة', lat: 40.7128, lng: -74.006 },
  { id: 'montreal', nameAr: 'مونتريال', nameEn: 'Montreal', countryAr: 'كندا', lat: 45.5017, lng: -73.5673 },
];

export const CALCULATION_METHODS_META: Array<{ key: CalculationMethodName; nameAr: string }> = [
  { key: 'UmmAlQura', nameAr: 'أم القرى (مكة المكرمة)' },
  { key: 'MuslimWorldLeague', nameAr: 'رابطة العالم الإسلامي' },
  { key: 'Egyptian', nameAr: 'الهيئة المصرية العامة للمساحة' },
  { key: 'Karachi', nameAr: 'جامعة العلوم الإسلامية بكراتشي' },
  { key: 'NorthAmerica', nameAr: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)' },
  { key: 'Dubai', nameAr: 'دبي / الإمارات' },
  { key: 'Qatar', nameAr: 'قطر' },
  { key: 'Kuwait', nameAr: 'الكويت' },
  { key: 'Turkey', nameAr: 'رئاسة الشؤون الدينية التركية' },
];

function getCalculationParams(methodName: CalculationMethodName): CalculationParameters {
  switch (methodName) {
    case 'MuslimWorldLeague':
      return CalculationMethod.MuslimWorldLeague();
    case 'Egyptian':
      return CalculationMethod.Egyptian();
    case 'Karachi':
      return CalculationMethod.Karachi();
    case 'NorthAmerica':
      return CalculationMethod.NorthAmerica();
    case 'Dubai':
      return CalculationMethod.Dubai();
    case 'Qatar':
      return CalculationMethod.Qatar();
    case 'Kuwait':
      return CalculationMethod.Kuwait();
    case 'Turkey':
      return CalculationMethod.Turkey();
    case 'UmmAlQura':
    default:
      return CalculationMethod.UmmAlQura();
  }
}

function formatPrayerTime(date: Date): { formatted: string; arabicFormatted: string } {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  const formatted = `${hStr}:${mStr}`;
  const arabicFormatted = `${toArabicDigits(hStr)}:${toArabicDigits(mStr)}`;
  return { formatted, arabicFormatted };
}

/**
 * Calculates high-accuracy prayer times for a given coordinate and date.
 */
export function getPrayerTimes(
  lat: number,
  lng: number,
  date: Date = new Date(),
  methodName: CalculationMethodName = 'UmmAlQura',
  isHanafi: boolean = false,
): PrayerTimesResult {
  const coordinates = new Coordinates(lat, lng);
  const params = getCalculationParams(methodName);
  if (isHanafi) {
    params.madhab = Madhab.Hanafi;
  }

  const p = new PrayerTimes(coordinates, date, params);
  const now = date.getTime();

  const prayerItems: Array<{ key: PrayerKey; nameAr: string; nameEn: string; date: Date }> = [
    { key: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', date: p.fajr },
    { key: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', date: p.sunrise },
    { key: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', date: p.dhuhr },
    { key: 'asr', nameAr: 'العصر', nameEn: 'Asr', date: p.asr },
    { key: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', date: p.maghrib },
    { key: 'isha', nameAr: 'العشاء', nameEn: 'Isha', date: p.isha },
  ];

  // Find next upcoming prayer
  let nextItem: { key: PrayerKey; nameAr: string; nameEn: string; date: Date } | null = null;
  let currentItem: { key: PrayerKey; nameAr: string; nameEn: string; date: Date } | null = null;

  for (let i = 0; i < prayerItems.length; i++) {
    const item = prayerItems[i];
    if (item.date.getTime() > now) {
      nextItem = item;
      currentItem = i > 0 ? prayerItems[i - 1] : null;
      break;
    }
  }

  // If all prayers today have passed, next is tomorrow's Fajr
  if (!nextItem) {
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pTomorrow = new PrayerTimes(coordinates, tomorrow, params);
    nextItem = { key: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', date: pTomorrow.fajr };
    currentItem = prayerItems[prayerItems.length - 1]; // Isha
  }

  // Calculate remaining time (digital format: 05:11)
  const timeRemainingSeconds = Math.max(0, Math.floor((nextItem.date.getTime() - now) / 1000));
  const remHours = Math.floor(timeRemainingSeconds / 3600);
  const remMinutes = Math.floor((timeRemainingSeconds % 3600) / 60);

  const hStr = String(remHours).padStart(2, '0');
  const mStr = String(remMinutes).padStart(2, '0');
  const timeRemainingFormatted = `${hStr}:${mStr}`;

  const buildResultItem = (item: { key: PrayerKey; nameAr: string; nameEn: string; date: Date }): PrayerTimeItem => {
    const { formatted, arabicFormatted } = formatPrayerTime(item.date);
    return {
      key: item.key,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      timeFormatted: formatted,
      timeArabicFormatted: arabicFormatted,
      date: item.date,
      isCurrent: currentItem?.key === item.key,
      isNext: nextItem?.key === item.key,
      isPassed: item.date.getTime() <= now,
    };
  };

  const all = prayerItems.map(buildResultItem);

  return {
    fajr: all[0],
    sunrise: all[1],
    dhuhr: all[2],
    asr: all[3],
    maghrib: all[4],
    isha: all[5],
    all,
    nextPrayer: nextItem ? buildResultItem(nextItem) : null,
    currentPrayer: currentItem ? buildResultItem(currentItem) : null,
    timeRemainingSeconds,
    timeRemainingFormatted,
  };
}
