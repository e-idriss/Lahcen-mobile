/**
 * iOS bridge: mirrors the widget data blob into the shared App Group container
 * that the WidgetKit extension in `targets/widgets/index.swift` reads, then asks
 * WidgetCenter to reload the timelines.
 *
 * Uses `@bacons/apple-targets`' `ExtensionStorage`, which reads/writes the App
 * Group's UserDefaults / container. No-op on Android.
 */

import { Platform } from 'react-native';

import type { WidgetData } from './widgetData';

const APP_GROUP = 'group.com.idriss.quran.widgets';
const DATA_FILE = 'widget-data.json';

export async function pushIOSWidgetData(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    // Lazy require so Android bundles never pull the native module in.
    const { ExtensionStorage } = await import('@bacons/apple-targets');
    const storage = new ExtensionStorage(APP_GROUP);
    storage.set(DATA_FILE, JSON.stringify(data));
    ExtensionStorage.reloadWidget();
  } catch {
    // Module missing in Expo Go / dev without the target — the widget just
    // keeps its last render.
  }
}
