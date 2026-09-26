/**
 * Quran navigation maths (juz, hizb, page, ruku, and ayahId conversions).
 *
 * All of this is delegated to `quran-meta` rather than hand-rolled — see the
 * "Research First" section of CLAUDE.md. This module exists purely to own the
 * indexing-convention boundary described below.
 *
 * ⚠️ INDEXING CONVENTIONS — the single most likely source of off-by-one bugs:
 *   - `quran-meta` uses 1-based ayahIds (1..6236).
 *   - Our `ayahs.id` column is also 1-based, so the two line up directly.
 *   - Tanzil's `surahs.start_index` is 0-BASED, so it needs +1 to become an
 *     ayahId. Only `startIndexToAyahId` may perform that conversion.
 */

import { createHafs, type Surah } from 'quran-meta';

import { TOTAL_PAGES, TOTAL_SURAHS } from './parseTanzil';

const quran = createHafs();

/*
 * Pager index ⇄ mushaf page number.
 *
 * A mushaf is bound right to left, so page 1 is the RIGHTMOST page. The reader
 * gets that by feeding its horizontal list the page numbers in REVERSED order
 * (604 → 1) — never with `I18nManager.forceRTL`, which inverts the Latin UI,
 * and never with a `scaleX: -1` transform, which mirrors the rendered glyphs
 * and knocks justified lines outside the page frame.
 *
 * The consequence is that LIST INDEX ≠ PAGE NUMBER. Every `initialScrollIndex`,
 * `scrollToIndex` and `onMomentumScrollEnd` handler must convert through these.
 * They live here, not in the route file, so they can be unit-tested.
 */

/** Mushaf page number (1-based) → pager index. Page 1 is the LAST index. */
export function indexForPage(page: number): number {
  return TOTAL_PAGES - page;
}

/** Pager index → mushaf page number (1-based). Index 0 is the LAST page. */
export function pageForIndex(index: number): number {
  return TOTAL_PAGES - index;
}

/**
 * `quran-meta` types a surah number as the literal union 1..114. Validating
 * here converts that compile-time constraint into a real runtime guard, so a
 * bad surah number fails loudly instead of returning nonsense navigation data.
 */
function asSurah(surah: number): Surah {
  if (!Number.isInteger(surah) || surah < 1 || surah > TOTAL_SURAHS) {
    throw new RangeError(`Invalid surah number: ${surah}`);
  }
  return surah as Surah;
}

/** Tanzil's 0-based global offset → a 1-based ayahId. */
export function startIndexToAyahId(startIndex: number): number {
  return startIndex + 1;
}

/** A 1-based ayahId → its surah and ayah numbers. */
export function ayahIdToSurahAyah(ayahId: number): { surah: number; ayah: number } {
  const [surah, ayah] = quran.findSurahAyahByAyahId(ayahId);
  return { surah, ayah };
}

/** Surah and ayah numbers → the 1-based global ayahId. */
export function surahAyahToAyahId(surah: number, ayah: number): number {
  return quran.findAyahIdBySurah(asSurah(surah), ayah as Parameters<typeof quran.findAyahIdBySurah>[1]);
}

/** The mushaf page (1..604) an ayah falls on. */
export function pageForAyah(surah: number, ayah: number): number {
  return quran.findPagebyAyahId(surahAyahToAyahId(surah, ayah));
}

/** The juz (1..30) an ayah falls in. */
export function juzForAyah(surah: number, ayah: number): number {
  return quran.findJuzByAyahId(surahAyahToAyahId(surah, ayah));
}

export function ayahCountInSurah(surah: number): number {
  return quran.getAyahCountInSurah(asSurah(surah));
}

/** The juz (1..30) a mushaf page falls in. */
export function juzForPage(page: number): number {
  if (page < 1 || page > TOTAL_PAGES) return 1;
  const pageMeta = quran.getPageMeta(page as Parameters<typeof quran.getPageMeta>[0]);
  return quran.findJuzByAyahId(pageMeta.firstAyahId);
}

/** Returns the first ayah position { surah, ayah } on a given page (1..604). */
export function firstAyahOnPage(page: number): { surah: number; ayah: number } {
  if (page < 1 || page > TOTAL_PAGES) return { surah: 1, ayah: 1 };
  const pageMeta = quran.getPageMeta(page as Parameters<typeof quran.getPageMeta>[0]);
  return ayahIdToSurahAyah(pageMeta.firstAyahId);
}

export interface JuzInfo {
  number: number;
  startSurah: number;
  startAyah: number;
  startPage: number;
  ayahCount: number;
}

/** Returns the list of all 30 Juz with start position and page. */
export function getAllJuz(): JuzInfo[] {
  const list: JuzInfo[] = [];
  for (let i = 1; i <= 30; i++) {
    const meta = quran.getJuzMeta(i as Parameters<typeof quran.getJuzMeta>[0]);
    const startSurah = meta.first[0];
    const startAyah = meta.first[1];
    const startPage = quran.findPagebyAyahId(meta.firstAyahId);
    const ayahCount = meta.lastAyahId - meta.firstAyahId + 1;
    list.push({
      number: i,
      startSurah,
      startAyah,
      startPage,
      ayahCount,
    });
  }
  return list;
}

/** The hizb (1..60) an ayah falls in. */
export function hizbForAyah(surah: number, ayah: number): number {
  const ayahId = surahAyahToAyahId(surah, ayah);
  const rubInfo = quran.getRubAlHizbByAyahId(ayahId);
  return rubInfo.hizbId;
}

/** The hizb (1..60) a mushaf page falls in. */
export function hizbForPage(page: number): number {
  if (page < 1 || page > TOTAL_PAGES) return 1;
  const pageMeta = quran.getPageMeta(page as Parameters<typeof quran.getPageMeta>[0]);
  const rubInfo = quran.getRubAlHizbByAyahId(pageMeta.firstAyahId);
  return rubInfo.hizbId;
}

/** The quarter (rub' al-hizb 1..240) an ayah falls in. */
export function rubAlHizbForAyah(surah: number, ayah: number): number {
  const ayahId = surahAyahToAyahId(surah, ayah);
  const rubInfo = quran.getRubAlHizbByAyahId(ayahId);
  return rubInfo.rubAlHizbId;
}

export interface HizbInfo {
  number: number;
  juzNumber: number;
  quarterIndex: number;
  startSurah: number;
  startAyah: number;
  startPage: number;
  ayahCount: number;
}

/** Returns the list of all 60 Hizbs with start position and page. */
export function getAllHizbs(): HizbInfo[] {
  const list: HizbInfo[] = [];
  for (let h = 1; h <= 60; h++) {
    const startQuarterIndex = ((h - 1) * 4 + 1) as Parameters<typeof quran.getRubAlHizbMeta>[0];
    const endQuarterIndex = (h * 4) as Parameters<typeof quran.getRubAlHizbMeta>[0];
    const startMeta = quran.getRubAlHizbMeta(startQuarterIndex);
    const endMeta = quran.getRubAlHizbMeta(endQuarterIndex);
    const startSurah = startMeta.first[0];
    const startAyah = startMeta.first[1];
    const startPage = quran.findPagebyAyahId(startMeta.firstAyahId);
    const ayahCount = endMeta.lastAyahId - startMeta.firstAyahId + 1;
    list.push({
      number: h,
      juzNumber: startMeta.juz,
      quarterIndex: (h - 1) * 4 + 1,
      startSurah,
      startAyah,
      startPage,
      ayahCount,
    });
  }
  return list;
}

