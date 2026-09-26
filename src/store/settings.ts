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
import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { pageForAyah } from '../data/navigation';
import { ARABIC_FONT_SIZE, type ThemeName } from '../theme/tokens';

/**
 * Riwaya (Recitation tradition) supported by the reader.
 * - 'hafs': Hafs 'an 'Asim (Madinah Mushaf - 604 pages, 6236 ayahs, King Fahd Complex QCF v2 fonts)
 * - 'warsh': Warsh 'an Nafi' (Maghribi Mushaf - 604 pages, 6214 ayahs, Almaghribi Uthmani script)
 */
export type Riwaya = 'hafs' | 'warsh';
export type WarshFont = 'uthmani' | 'almaghribi';

/** An ayah as numbered in ONE riwaya, plus the page it sits on in that mushaf. */
export interface AyahPosition {
  surah: number;
  ayah: number;
  page: number;
}

/**
 * A saved reading position. Hafs and Warsh number ayahs differently (6236 vs
 * 6214) and paginate differently, so a position is only meaningful together
 * with the riwaya it was saved in.
 */
export interface LastRead extends AyahPosition {
  riwaya: Riwaya;
  /** Epoch ms. */
  savedAt: number;
}

export type Bookmark = LastRead;

interface SettingsState {
  /** `system` follows the OS; the others pin a specific theme. */
  themePreference: ThemeName | 'system';
  arabicFontSize: number;
  showTranslation: boolean;
  riwaya: Riwaya;
  warshFont: WarshFont;
  /** Where the reader stopped, kept separately for each riwaya. */
  lastReadByRiwaya: Record<Riwaya, LastRead | null>;
  bookmarks: Bookmark[];

  setThemePreference: (theme: ThemeName | 'system') => void;
  setArabicFontSize: (size: number) => void;
  toggleTranslation: () => void;
  setRiwaya: (riwaya: Riwaya) => void;
  setWarshFont: (warshFont: WarshFont) => void;
  /** Saves the stopping point for the CURRENT riwaya. */
  setLastRead: (position: AyahPosition) => void;
  clearLastRead: () => void;
  /** Toggles a bookmark in the current riwaya (or `position.riwaya` for an existing bookmark). */
  toggleBookmark: (position: AyahPosition & { riwaya?: Riwaya }) => void;
}

const clampFontSize = (size: number) =>
  Math.min(ARABIC_FONT_SIZE.max, Math.max(ARABIC_FONT_SIZE.min, size));

const samePosition = (a: Bookmark, b: { surah: number; ayah: number; riwaya: Riwaya }) =>
  a.riwaya === b.riwaya && a.surah === b.surah && a.ayah === b.ayah;

/** Old (v3) positions were `{ surah, ayah }` with no riwaya or page. */
function migratePosition(value: unknown, riwaya: Riwaya): LastRead | null {
  if (typeof value !== 'object' || value === null) return null;
  const { surah, ayah, savedAt } = value as { surah?: unknown; ayah?: unknown; savedAt?: unknown };
  if (typeof surah !== 'number' || typeof ayah !== 'number') return null;
  let page = 1;
  try {
    // Hafs pagination; for an old Warsh position this is a close approximation
    // (both mushafs have 604 pages) and is corrected on the next save.
    page = pageForAyah(surah, ayah);
  } catch {
    // Ayah number exists only in Warsh numbering — keep page 1 as a fallback.
  }
  return { surah, ayah, page, riwaya, savedAt: typeof savedAt === 'number' ? savedAt : 0 };
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      arabicFontSize: ARABIC_FONT_SIZE.default,
      showTranslation: false,
      riwaya: 'hafs',
      warshFont: 'uthmani',
      lastReadByRiwaya: { hafs: null, warsh: null },
      bookmarks: [],

      setThemePreference: (themePreference) => set({ themePreference }),

      setArabicFontSize: (size) => set({ arabicFontSize: clampFontSize(size) }),

      toggleTranslation: () => set((state) => ({ showTranslation: !state.showTranslation })),

      setRiwaya: (riwaya) => set({ riwaya }),
      setWarshFont: (warshFont) => set({ warshFont }),

      setLastRead: ({ surah, ayah, page }) =>
        set((state) => ({
          lastReadByRiwaya: {
            ...state.lastReadByRiwaya,
            [state.riwaya]: { surah, ayah, page, riwaya: state.riwaya, savedAt: Date.now() },
          },
        })),

      clearLastRead: () =>
        set((state) => ({
          lastReadByRiwaya: { ...state.lastReadByRiwaya, [state.riwaya]: null },
        })),

      toggleBookmark: ({ surah, ayah, page, riwaya }) =>
        set((state) => {
          const key = { surah, ayah, riwaya: riwaya ?? state.riwaya };
          const existing = state.bookmarks.some((b) => samePosition(b, key));
          return {
            bookmarks: existing
              ? state.bookmarks.filter((b) => !samePosition(b, key))
              : [{ ...key, page, savedAt: Date.now() }, ...state.bookmarks],
          };
        }),
    }),
    {
      name: 'quran-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      migrate: (persisted, version) => {
        const state = { ...(persisted as Record<string, unknown>) };
        if (version < 3) state.arabicFontSize = ARABIC_FONT_SIZE.default;
        if (version < 4) {
          // v3 kept one riwaya-less position shared by Hafs and Warsh. Attach it
          // to the riwaya that was active, since that is the numbering it used.
          const riwaya: Riwaya = state.riwaya === 'warsh' ? 'warsh' : 'hafs';
          const lastRead = migratePosition(state.lastRead, riwaya);
          state.lastReadByRiwaya = { hafs: null, warsh: null, [riwaya]: lastRead };
          delete state.lastRead;
          state.bookmarks = Array.isArray(state.bookmarks)
            ? state.bookmarks.map((b) => migratePosition(b, riwaya)).filter((b) => b !== null)
            : [];
        }
        return state as unknown as SettingsState;
      },
    },
  ),
);

/** The saved stopping point for the riwaya currently being read. */
export function useLastRead(): LastRead | null {
  return useSettings((s) => s.lastReadByRiwaya[s.riwaya]);
}

/** Bookmarks of the current riwaya only, newest first. */
export function useRiwayaBookmarks(): Bookmark[] {
  const riwaya = useSettings((s) => s.riwaya);
  const bookmarks = useSettings((s) => s.bookmarks);
  return useMemo(() => bookmarks.filter((b) => b.riwaya === riwaya), [bookmarks, riwaya]);
}

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
