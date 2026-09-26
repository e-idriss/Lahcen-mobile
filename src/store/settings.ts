/**
 * Persistent user settings and reading position.
 *
 * Backed by AsyncStorage rather than MMKV: MMKV v4 is a Nitro module, which
 * cannot load in Expo Go and crashes the app at startup with
 * "The native NitroModules Turbo/Native-Module could not be found".
 * AsyncStorage is Expo-supported and works in both Expo Go and dev builds.
 *
 * Because AsyncStorage is asynchronous, rehydration is not instant — consumers
 * that need the restored value on first paint must wait for `useSettingsReady`.
 *
 * Everything here stays on-device. No reading data ever leaves the phone
 * (see the Security & Privacy section of CLAUDE.md).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ARABIC_FONT_SIZE, type ThemeName } from '../theme/tokens';

export interface LastRead {
  surah: number;
  ayah: number;
}

export interface Bookmark extends LastRead {
  /** Epoch ms — used for "recently saved" ordering. */
  savedAt: number;
}

/**
 * Riwaya (Recitation tradition) supported by the reader.
 * - 'hafs': Hafs 'an 'Asim (Madinah Mushaf - 604 pages, 6236 ayahs, King Fahd Complex QCF v2 fonts)
 * - 'warsh': Warsh 'an Nafi' (Maghribi Mushaf - 604 pages, 6214 ayahs, Almaghribi Uthmani script)
 */
export type Riwaya = 'hafs' | 'warsh';
export type WarshFont = 'uthmani' | 'almaghribi';

interface SettingsState {
  /** `system` follows the OS; the others pin a specific theme. */
  themePreference: ThemeName | 'system';
  arabicFontSize: number;
  showTranslation: boolean;
  riwaya: Riwaya;
  warshFont: WarshFont;
  lastRead: LastRead | null;
  bookmarks: Bookmark[];

  setThemePreference: (theme: ThemeName | 'system') => void;
  setArabicFontSize: (size: number) => void;
  toggleTranslation: () => void;
  setRiwaya: (riwaya: Riwaya) => void;
  setWarshFont: (warshFont: WarshFont) => void;
  setLastRead: (position: LastRead) => void;
  toggleBookmark: (position: LastRead) => void;
  isBookmarked: (position: LastRead) => boolean;
}

const clampFontSize = (size: number) =>
  Math.min(ARABIC_FONT_SIZE.max, Math.max(ARABIC_FONT_SIZE.min, size));

const samePosition = (a: LastRead, b: LastRead) => a.surah === b.surah && a.ayah === b.ayah;

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      themePreference: 'system',
      arabicFontSize: ARABIC_FONT_SIZE.default,
      showTranslation: false,
      riwaya: 'hafs',
      warshFont: 'uthmani',
      lastRead: null,
      bookmarks: [],

      setThemePreference: (themePreference) => set({ themePreference }),

      setArabicFontSize: (size) => set({ arabicFontSize: clampFontSize(size) }),

      toggleTranslation: () => set((state) => ({ showTranslation: !state.showTranslation })),

      setRiwaya: (riwaya) => set({ riwaya }),
      setWarshFont: (warshFont) => set({ warshFont }),

      setLastRead: (lastRead) => {
        set({ lastRead });
      },

      toggleBookmark: (position) =>
        set((state) => {
          const existing = state.bookmarks.find((b) => samePosition(b, position));
          return {
            bookmarks: existing
              ? state.bookmarks.filter((b) => !samePosition(b, position))
              : [{ ...position, savedAt: Date.now() }, ...state.bookmarks],
          };
        }),

      isBookmarked: (position) => get().bookmarks.some((b) => samePosition(b, position)),
    }),
    {
      name: 'quran-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted) => ({
        ...(persisted as object),
        arabicFontSize: ARABIC_FONT_SIZE.default,
      }),
    },
  ),
);

/**
 * True once the persisted state has been read back from storage.
 *
 * The reader must not restore its scroll position until this is true, or it
 * would jump from Al-Fatiha to the real last-read surah after the first frame.
 */
export function useSettingsReady(): boolean {
  const [ready, setReady] = useState(() => useSettings.persist.hasHydrated());

  useEffect(() => {
    if (ready) return;
    const unsubscribe = useSettings.persist.onFinishHydration(() => setReady(true));
    // Guard against hydration completing between render and effect.
    if (useSettings.persist.hasHydrated()) setReady(true);
    return unsubscribe;
  }, [ready]);

  return ready;
}
