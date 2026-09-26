/**
 * Ligature keys for `fonts.prayers` (ElgharibPrayers), which draws each
 * prayer name as one calligraphic glyph: "3" → صلاة الفجر … "7" → صلاة العشاء.
 *
 * The font has no Shuruq glyph, so `sunrise` returns null and callers fall
 * back to plain text.
 */

import type { PrayerKey } from './types';

const CALLIGRAPHY_KEYS: Partial<Record<string, string>> = {
  fajr: '3',
  dhuhr: '4',
  asr: '5',
  maghrib: '6',
  isha: '7',
};

export function getPrayerCalligraphyKey(key?: PrayerKey | string): string | null {
  return (key && CALLIGRAPHY_KEYS[key]) ?? null;
}
