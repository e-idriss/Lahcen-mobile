/**
 * Today's Hijri (Umm al-Qura) date, plus font-ligature keys and pure Arabic month names.
 */

// @ts-expect-error moment-hijri does not include type definitions
import moment from 'moment-hijri';

export const HIJRI_MONTHS_AR = [
  'المُحَرَّم',
  'صَفَر',
  'رَبِيع الأَوَّل',
  'رَبِيع الآخِر',
  'جُمَادَى الأُولَى',
  'جُمَادَى الآخِرَة',
  'رَجَب',
  'شَعْبَان',
  'رَمَضَان',
  'شَوَّال',
  'ذُو القَعْدَة',
  'ذُو الحِجَّة',
] as const;

export interface HijriToday {
  /** Hijri day of month (1..30) */
  dayOfMonth: number;
  /** Hijri month, 1-indexed (1 = Muharram .. 12 = Dhu al-Hijjah). */
  month: number;
  /** Authentic Arabic month name without any Latin text */
  monthNameAr: string;
  /** Hijri year. */
  year: number;
  /** Ligature key ("1".."7") for `Elgharib-Days Of Week.ttf`; 1 = Sunday. */
  weekdayLigature: string;
  /** Ligature key ("1".."12") for `Elgharib-AYB-Hijri Months.ttf`. */
  monthLigature: string;
}

export function getHijriToday(): HijriToday {
  const now = moment();
  const mIndex = Math.max(0, Math.min(11, now.iMonth()));
  return {
    dayOfMonth: now.iDate(),
    month: mIndex + 1,
    monthNameAr: HIJRI_MONTHS_AR[mIndex] ?? 'رَبِيع الأَوَّل',
    year: now.iYear(),
    weekdayLigature: String(now.day() + 1),
    monthLigature: String(mIndex + 1),
  };
}
