/**
 * Text of the adhan notification for one prayer.
 *
 * "الصلاة خير من النوم" belongs to the Fajr adhan only; the other prayers get
 * the call common to every adhan. Both lines start with U+200F (RIGHT-TO-LEFT
 * MARK) so iOS/Android lay the paragraph out right-to-left even when the time
 * digits or the device language would otherwise pull it left-to-right.
 */

import type { PrayerKey } from './types';

const RLM = '‏';

const FAJR_CALL = 'الصلاة خير من النوم';
const COMMON_CALL = 'حيّ على الصلاة، حيّ على الفلاح';

export interface AdhanNotificationContent {
  title: string;
  body: string;
}

export function buildAdhanNotificationContent(
  key: PrayerKey,
  nameAr: string,
  timeFormatted: string,
): AdhanNotificationContent {
  const call = key === 'fajr' ? FAJR_CALL : COMMON_CALL;
  return {
    title: `${RLM}حان وقت صلاة ${nameAr}`,
    body: `${RLM}${call} · ${timeFormatted}`,
  };
}
