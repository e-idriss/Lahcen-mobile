/**
 * Cross-validates `quran-meta` against our own Tanzil-derived data.
 *
 * The two sources are independent, so agreement across all 6236 ayahs is strong
 * evidence that the indexing conventions are being converted correctly.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ayahCountInSurah,
  ayahIdToSurahAyah,
  getAllHizbs,
  getAllJuz,
  hizbForAyah,
  hizbForPage,
  indexForPage,
  juzForPage,
  pageForIndex,
  startIndexToAyahId,
  surahAyahToAyahId,
} from '../navigation';
import {
  TOTAL_AYAHS,
  TOTAL_PAGES,
  TOTAL_SURAHS,
  parseSurahMetadata,
  parseTanzilText,
} from '../parseTanzil';

const SRC = join(__dirname, '..', '..', '..', 'data-src');
const ayahs = parseTanzilText(readFileSync(join(SRC, 'quran-uthmani.txt'), 'utf8'));
const surahs = parseSurahMetadata(readFileSync(join(SRC, 'quran-data.xml'), 'utf8'));

describe('quran-meta agrees with the Tanzil data', () => {
  it('reports the same ayah count for every surah', () => {
    for (const meta of surahs) {
      expect(ayahCountInSurah(meta.index)).toBe(meta.ayas);
    }
  });

  it('maps every ayahId back to the same surah:ayah as the source text', () => {
    // Guards the whole 1-based mapping in one sweep.
    for (let index = 0; index < ayahs.length; index += 1) {
      const expected = ayahs[index];
      const actual = ayahIdToSurahAyah(index + 1);
      expect(actual).toEqual({ surah: expected.surah, ayah: expected.ayah });
    }
  });

  it('round-trips surah:ayah → ayahId → surah:ayah', () => {
    for (const { surah, ayah } of ayahs) {
      expect(ayahIdToSurahAyah(surahAyahToAyahId(surah, ayah))).toEqual({ surah, ayah });
    }
  });

  it('converts Tanzil 0-based start offsets to the first ayahId of each surah', () => {
    for (const meta of surahs) {
      const ayahId = startIndexToAyahId(meta.start);
      expect(ayahIdToSurahAyah(ayahId)).toEqual({ surah: meta.index, ayah: 1 });
    }
  });

  it('anchors the known boundaries', () => {
    expect(ayahIdToSurahAyah(1)).toEqual({ surah: 1, ayah: 1 });
    expect(ayahIdToSurahAyah(TOTAL_AYAHS)).toEqual({ surah: TOTAL_SURAHS, ayah: 6 });
    // Al-Fatiha has 7 ayahs, so Al-Baqara starts at ayahId 8 — not 7.
    expect(surahAyahToAyahId(2, 1)).toBe(8);
  });
});

/*
 * The pager feeds its list REVERSED page numbers so page 1 lands on the right,
 * as in a bound mushaf. That makes index ≠ page, and using one for the other
 * opens the reader on the wrong page — so the conversion is pinned here.
 */
describe('pager index ⇄ page number', () => {
  it('round-trips every page 1..604', () => {
    for (let page = 1; page <= TOTAL_PAGES; page += 1) {
      expect(pageForIndex(indexForPage(page))).toBe(page);
    }
  });

  it('round-trips every index 0..603', () => {
    for (let index = 0; index < TOTAL_PAGES; index += 1) {
      expect(indexForPage(pageForIndex(index))).toBe(index);
    }
  });

  it('puts page 1 at the LAST index — the rightmost page', () => {
    expect(indexForPage(1)).toBe(TOTAL_PAGES - 1);
    expect(indexForPage(1)).toBe(603);
    expect(pageForIndex(TOTAL_PAGES - 1)).toBe(1);
  });

  it('puts the last page at index 0', () => {
    expect(indexForPage(TOTAL_PAGES)).toBe(0);
    expect(pageForIndex(0)).toBe(TOTAL_PAGES);
  });

  it('keeps every index inside the list bounds', () => {
    for (let page = 1; page <= TOTAL_PAGES; page += 1) {
      const index = indexForPage(page);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(TOTAL_PAGES);
    }
  });
});

describe('juz navigation maths', () => {
  it('correctly maps pages to juz (1..30)', () => {
    expect(juzForPage(1)).toBe(1);
    expect(juzForPage(2)).toBe(1);
    expect(juzForPage(604)).toBe(30);
  });

  it('returns all 30 juz with valid starting points', () => {
    const list = getAllJuz();
    expect(list.length).toBe(30);
    expect(list[0].number).toBe(1);
    expect(list[0].startSurah).toBe(1);
    expect(list[0].startAyah).toBe(1);
    expect(list[0].startPage).toBe(1);

    expect(list[29].number).toBe(30);
    expect(list[29].startPage).toBeGreaterThan(500);
  });
});

describe('hizb navigation maths', () => {
  it('correctly maps pages to hizb (1..60)', () => {
    expect(hizbForPage(1)).toBe(1);
    expect(hizbForPage(604)).toBe(60);
  });

  it('correctly maps ayahs to hizb (1..60)', () => {
    expect(hizbForAyah(1, 1)).toBe(1);
    expect(hizbForAyah(2, 75)).toBe(2);
    expect(hizbForAyah(114, 6)).toBe(60);
  });

  it('returns all 60 hizbs with valid starting points and parents', () => {
    const list = getAllHizbs();
    expect(list.length).toBe(60);
    expect(list[0].number).toBe(1);
    expect(list[0].juzNumber).toBe(1);
    expect(list[0].startSurah).toBe(1);
    expect(list[0].startAyah).toBe(1);
    expect(list[0].startPage).toBe(1);

    expect(list[1].number).toBe(2);
    expect(list[1].juzNumber).toBe(1);
    expect(list[1].startSurah).toBe(2);
    expect(list[1].startAyah).toBe(75);

    expect(list[59].number).toBe(60);
    expect(list[59].juzNumber).toBe(30);
    expect(list[59].startPage).toBeGreaterThan(580);
  });
});
