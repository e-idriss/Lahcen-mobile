/**
 * Scheduled prayer-time (adhan) notifications.
 *
 * `expo-notifications` can only hold a bounded queue of pending notifications,
 * so this schedules a rolling window of the next `SCHEDULE_DAYS` days of the
 * five daily prayers and re-arms the window whenever the app opens or the
 * location / calculation settings change. Prayer times are computed entirely
 * on-device with the `adhan` library — no network, no server push.
 */

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getPrayerTimes } from './prayerService';
import type { CalculationMethodName, PrayerKey } from './types';

export const PRAYER_ANDROID_CHANNEL_ID = 'prayer-adhan';

/**
 * True when running inside the Expo Go app (vs a standalone/dev-client build).
 * In Expo Go the native plugin sounds array is not embedded, so passing
 * 'adhan-madina.mp3' as a notification sound triggers a warning on every render.
 * We fall back to the default system sound in that environment only.
 */
const IS_EXPO_GO = Constants.appOwnership === 'expo';

/** How many days ahead to keep scheduled. iOS caps pending notifications at 64. */
const SCHEDULE_DAYS = 7;

/** Only the five obligatory prayers get an adhan — never sunrise. */
const NOTIFIED_PRAYERS: ReadonlyArray<{ key: PrayerKey; nameAr: string }> = [
  { key: 'fajr', nameAr: 'الفجر' },
  { key: 'dhuhr', nameAr: 'الظهر' },
  { key: 'asr', nameAr: 'العصر' },
  { key: 'maghrib', nameAr: 'المغرب' },
  { key: 'isha', nameAr: 'العشاء' },
];

/** Marks every notification this module owns, so we never clear unrelated ones. */
const DATA_TAG = 'prayer-adhan';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ensures the Android notification channel exists with the bundled adhan sound.
 * No-op on iOS.
 */
export async function ensurePrayerNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(PRAYER_ANDROID_CHANNEL_ID, {
    name: 'مواقيت الصلاة',
    importance: Notifications.AndroidImportance.HIGH,
    // Only set the custom adhan sound in a real native build where the asset
    // is embedded by the expo-notifications config plugin.
    ...(IS_EXPO_GO ? {} : { sound: 'adhan-madina.mp3' }),
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/**
 * Requests notification permission. Returns whether it is granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

/** Cancels only the prayer notifications this module scheduled. */
export async function cancelPrayerNotifications(): Promise<void> {
  // expo-notifications' scheduling API is native-only; on web it throws.
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as { tag?: string } | null)?.tag === DATA_TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

interface ScheduleArgs {
  enabled: boolean;
  latitude: number;
  longitude: number;
  calculationMethod: CalculationMethodName;
  isHanafi: boolean;
}

/**
 * Re-arms the rolling window of prayer notifications.
 *
 * Always clears this module's existing notifications first, so calling it
 * repeatedly (on every app open, or setting change) is safe and idempotent.
 */
export async function reschedulePrayerNotifications({
  enabled,
  latitude,
  longitude,
  calculationMethod,
  isHanafi,
}: ScheduleArgs): Promise<void> {
  // Scheduled notifications are a native-only capability (no-op on web).
  if (Platform.OS === 'web') return;

  await ensurePrayerNotificationChannel();
  await cancelPrayerNotifications();

  if (!enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const now = Date.now();

  for (let dayOffset = 0; dayOffset < SCHEDULE_DAYS; dayOffset++) {
    const day = new Date();
    day.setDate(day.getDate() + dayOffset);
    day.setHours(12, 0, 0, 0); // midday anchor keeps the calc on the right date

    const result = getPrayerTimes(latitude, longitude, day, calculationMethod, isHanafi);

    for (const prayer of NOTIFIED_PRAYERS) {
      const item = result[prayer.key];
      const fireAt = item.date.getTime();
      if (fireAt <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `حان الآن موعد أذان ${prayer.nameAr}`,
          body: 'الصلاة خير من النوم — حيّ على الصلاة',
          // Skip custom sound in Expo Go: the .mp3 is not bundled in that env.
          ...(IS_EXPO_GO ? {} : { sound: 'adhan-madina.mp3' }),
          data: { tag: DATA_TAG, prayer: prayer.key },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.date,
          ...(Platform.OS === 'android'
            ? { channelId: PRAYER_ANDROID_CHANNEL_ID }
            : {}),
        },
      });
    }
  }
}
