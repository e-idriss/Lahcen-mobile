/**
 * Public surface for the native widgets feature.
 *
 * `registerWidgets()` wires the headless task handler (call once, at module
 * load, before React renders). `syncWidgets()` recomputes the mirrored data
 * blob from app state and asks Android to redraw every widget instance.
 */

import { Platform } from 'react-native';
import {
  registerWidgetTaskHandler,
  requestWidgetUpdate,
} from 'react-native-android-widget';

import { getPageForAyah, getSurah } from '../../data/database';
import { usePrayerStore } from '../prayer/prayerStore';
import { useSettings } from '../../store/settings';
import { pushIOSWidgetData } from './iosWidgetBridge';
import { placeholderWidgetData, readWidgetData, refreshWidgetData } from './widgetData';
import { widgetTaskHandler } from './widgetTaskHandler';
import { renderWidget, type WidgetName } from './WidgetViews';

const WIDGET_NAMES: WidgetName[] = ['NextPrayer', 'HijriDate', 'LastRead', 'DailyAyah'];

let registered = false;

/** Registers the headless task handler. Safe to call more than once. */
export function registerWidgets(): void {
  if (Platform.OS !== 'android' || registered) return;
  registered = true;
  registerWidgetTaskHandler(widgetTaskHandler);
}

/**
 * Recomputes widget data from the current stores and repaints every widget.
 * Call on app launch and whenever prayer settings or the reading position change.
 */
export async function syncWidgets(): Promise<void> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

  const prayer = usePrayerStore.getState();
  const { lastRead } = useSettings.getState();

  let lastReadInfo: { surahNameAr: string; ayah: number; page: number } | null = null;
  if (lastRead) {
    try {
      const surah = await getSurah(lastRead.surah);
      const page = await getPageForAyah(lastRead.surah, lastRead.ayah);
      if (surah) {
        lastReadInfo = { surahNameAr: surah.nameAr, ayah: lastRead.ayah, page };
      }
    } catch {
      // leave null — the widget shows its "open the app" prompt
    }
  }

  const data = await refreshWidgetData({
    latitude: prayer.latitude,
    longitude: prayer.longitude,
    calculationMethod: prayer.calculationMethod,
    isHanafi: prayer.isHanafi,
    cityName: prayer.cityName,
    lastRead: lastReadInfo,
  });

  if (Platform.OS === 'ios') {
    await pushIOSWidgetData(data);
    return;
  }

  await Promise.all(
    WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: () => renderWidget(widgetName, data),
        widgetNotFound: () => {
          // No instance of this widget on the home screen — nothing to do.
        },
      }),
    ),
  );
}

let syncSubscribed = false;
let syncTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleSync(): void {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void syncWidgets();
  }, 500);
}

/**
 * Keeps the widgets in step with app state: repaints (debounced) whenever the
 * reading position or prayer settings change. Call once, after registration.
 */
export function startWidgetSync(): void {
  if ((Platform.OS !== 'android' && Platform.OS !== 'ios') || syncSubscribed) return;
  syncSubscribed = true;
  useSettings.subscribe((s, prev) => {
    if (s.lastRead !== prev.lastRead) scheduleSync();
  });
  usePrayerStore.subscribe((s, prev) => {
    if (
      s.latitude !== prev.latitude ||
      s.longitude !== prev.longitude ||
      s.calculationMethod !== prev.calculationMethod ||
      s.isHanafi !== prev.isHanafi
    ) {
      scheduleSync();
    }
  });
}

export { readWidgetData, placeholderWidgetData };
