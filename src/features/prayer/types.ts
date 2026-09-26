/**
 * Types for Islamic Prayer Times & Qibla.
 */

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerTimeItem {
  key: PrayerKey;
  nameAr: string;
  nameEn: string;
  timeFormatted: string;
  timeArabicFormatted: string;
  date: Date;
  isCurrent: boolean;
  isNext: boolean;
  isPassed: boolean;
}

export interface PrayerTimesResult {
  fajr: PrayerTimeItem;
  sunrise: PrayerTimeItem;
  dhuhr: PrayerTimeItem;
  asr: PrayerTimeItem;
  maghrib: PrayerTimeItem;
  isha: PrayerTimeItem;
  all: PrayerTimeItem[];
  nextPrayer: PrayerTimeItem | null;
  currentPrayer: PrayerTimeItem | null;
  timeRemainingSeconds: number;
  timeRemainingFormatted: string;
}

export interface CityPreset {
  id: string;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  lat: number;
  lng: number;
}

export type CalculationMethodName =
  | 'UmmAlQura'
  | 'MuslimWorldLeague'
  | 'Egyptian'
  | 'Karachi'
  | 'NorthAmerica'
  | 'Dubai'
  | 'Qatar'
  | 'Kuwait'
  | 'Turkey';
