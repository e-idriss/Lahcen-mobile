/**
 * Data-integrity tests — mandated by CLAUDE.md.
 *
 * These run against the REAL Tanzil source files, not fixtures. Reproducing
 * scripture incorrectly is the most serious class of bug in this app, so these
 * assertions are deliberately strict.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  SURAH_WITHOUT_BASMALAH,
  TOTAL_AYAHS,
  TOTAL_PAGES,
  TOTAL_SURAHS,
  extractBasmalah,
  normaliseForSearch,
  parsePageMetadata,
  parseSurahMetadata,
  parseTanzilText,
  splitBasmalah,
} from '../parseTanzil';

const SRC = join(__dirname, '..', '..', '..', 'data-src');
const read = (file: string) => readFileSync(join(SRC, file), 'utf8');

const uthmani = parseTanzilText(read('quran-uthmani.txt'));
const simple = parseTanzilText(read('quran-simple.txt'));
const english = parseTanzilText(read('en.sahih.txt'));
const surahs = parseSurahMetadata(read('quran-data.xml'));

const basmalahUthmani = extractBasmalah(uthmani)!;
const basmalahSimple = extractBasmalah(simple)!;

describe('parseTanzilText', () => {
  it('parses exactly 6236 ayahs from every text file', () => {
    expect(uthmani).toHaveLength(TOTAL_AYAHS);
    expect(simple).toHaveLength(TOTAL_AYAHS);
    expect(english).toHaveLength(TOTAL_AYAHS);
  });

  it('strips the trailing licence block and leaks no comment lines', () => {
    for (const list of [uthmani, simple, english]) {
      expect(list.some((a) => a.text.startsWith('#'))).toBe(false);
      expect(list.some((a) => a.text.trim() === '')).toBe(false);
      expect(list.some((a) => Number.isNaN(a.surah) || Number.isNaN(a.ayah))).toBe(false);
    }
  });

  it('covers surahs 1..114 with ayahs numbered from 1 contiguously', () => {
    const bySurah = new Map<number, number[]>();
    for (const a of uthmani) {
      if (!bySurah.has(a.surah)) bySurah.set(a.surah, []);
      bySurah.get(a.surah)!.push(a.ayah);
    }

    expect(bySurah.size).toBe(TOTAL_SURAHS);
    for (const [surah, ayahNumbers] of bySurah) {
      expect(ayahNumbers).toEqual(
        Array.from({ length: ayahNumbers.length }, (_, i) => i + 1),
      );
      expect(surah).toBeGreaterThanOrEqual(1);
      expect(surah).toBeLessThanOrEqual(TOTAL_SURAHS);
    }
  });

  it('aligns the translation 1:1 with the Arabic', () => {
    const keys = (list: typeof uthmani) => list.map((a) => `${a.surah}:${a.ayah}`);
    expect(keys(english)).toEqual(keys(uthmani));
    expect(keys(simple)).toEqual(keys(uthmani));
  });
});

describe('surah metadata', () => {
  it('parses all 114 surahs', () => {
    expect(surahs).toHaveLength(TOTAL_SURAHS);
  });

  it('matches the ayah counts found in the text', () => {
    for (const meta of surahs) {
      const actual = uthmani.filter((a) => a.surah === meta.index).length;
      expect(actual).toBe(meta.ayas);
    }
  });

  it('uses 0-based cumulative start offsets that sum to 6236', () => {
    let running = 0;
    for (const meta of surahs) {
      expect(meta.start).toBe(running);
      running += meta.ayas;
    }
    expect(running).toBe(TOTAL_AYAHS);
  });

  it('reads Al-Fatiha correctly', () => {
    expect(surahs[0]).toMatchObject({
      index: 1,
      ayas: 7,
      start: 0,
      type: 'Meccan',
      tname: 'Al-Faatiha',
    });
  });
});

describe('splitBasmalah', () => {
  it('keeps the Basmalah as ayah 1 of Al-Fatiha', () => {
    const result = splitBasmalah(1, 1, basmalahUthmani, basmalahUthmani);
    expect(result.hasBasmalah).toBe(false);
    expect(result.body).toBe(basmalahUthmani);
  });

  it('leaves At-Tawba untouched — it has no Basmalah', () => {
    const tawba = uthmani.find((a) => a.surah === SURAH_WITHOUT_BASMALAH && a.ayah === 1)!;
    const result = splitBasmalah(9, 1, tawba.text, basmalahUthmani);
    expect(result.hasBasmalah).toBe(false);
    expect(result.body).toBe(tawba.text);
  });

  it('splits the Basmalah off Al-Baqara without leaving an orphaned diacritic', () => {
    const baqara = uthmani.find((a) => a.surah === 2 && a.ayah === 1)!;
    const result = splitBasmalah(2, 1, baqara.text, basmalahUthmani);
    expect(result.hasBasmalah).toBe(true);
    expect(result.body).toBe('الٓمٓ');
    expect(result.body).not.toMatch(/^\p{Mn}/u);
  });

  it.each([95, 97])(
    'splits surah %i, whose Basmalah carries an extra shadda on the ba',
    (surahNumber) => {
      const ayah = uthmani.find((a) => a.surah === surahNumber && a.ayah === 1)!;
      const result = splitBasmalah(surahNumber, 1, ayah.text, basmalahUthmani);
      expect(result.hasBasmalah).toBe(true);
      expect(result.body).not.toMatch(/^\p{Mn}/u);
      // The shadda variant must not survive into the body.
      expect(result.body.startsWith('بِّسْمِ')).toBe(false);
    },
  );

  it('never touches ayahs other than the first', () => {
    const ayah = uthmani.find((a) => a.surah === 2 && a.ayah === 2)!;
    const result = splitBasmalah(2, 2, ayah.text, basmalahUthmani);
    expect(result.hasBasmalah).toBe(false);
    expect(result.body).toBe(ayah.text);
  });

  it('finds exactly 112 prefixed Basmalahs across the whole Quran', () => {
    const count = uthmani.filter(
      (a) => splitBasmalah(a.surah, a.ayah, a.text, basmalahUthmani).hasBasmalah,
    ).length;
    expect(count).toBe(112);
  });

  // The display text comes from quran-simple.txt (the orthography the bundled
  // Elgharib font shapes correctly), so the 112 count must hold there too —
  // that is the file the shipped database is actually built from.
  it('finds exactly 112 prefixed Basmalahs in the simple text as well', () => {
    const count = simple.filter(
      (a) => splitBasmalah(a.surah, a.ayah, a.text, basmalahSimple).hasBasmalah,
    ).length;
    expect(count).toBe(112);
  });

  it('splits the Basmalah off Al-Baqara in the simple script', () => {
    const baqara = simple.find((a) => a.surah === 2 && a.ayah === 1)!;
    const result = splitBasmalah(2, 1, baqara.text, basmalahSimple);
    expect(result.hasBasmalah).toBe(true);
    expect(result.body).toBe('الم');
    expect(result.body).not.toMatch(/^\p{Mn}/u);
  });

  it('leaves no ayah empty or diacritic-led after splitting, in either script', () => {
    const cases: Array<[typeof uthmani, string]> = [
      [uthmani, basmalahUthmani],
      [simple, basmalahSimple],
    ];

    for (const [list, basmalah] of cases) {
      for (const a of list) {
        const { body } = splitBasmalah(a.surah, a.ayah, a.text, basmalah);
        expect(body.length).toBeGreaterThan(0);
        expect(body).not.toMatch(/^\p{Mn}/u);
      }
    }
  });

  it('preserves every diacritic of the retained text', () => {
    // Splitting must only remove the Basmalah — never normalise what remains.
    const baqara = uthmani.find((a) => a.surah === 2 && a.ayah === 1)!;
    const { body } = splitBasmalah(2, 1, baqara.text, basmalahUthmani);
    expect(baqara.text.endsWith(body)).toBe(true);
  });
});

describe('normaliseForSearch', () => {
  it('strips diacritics so undiacritised queries match', () => {
    expect(normaliseForSearch('ٱلرَّحْمَـٰنِ')).toBe('الرحمن');
  });

  it('folds alef, ya, ta marbuta and hamza variants', () => {
    expect(normaliseForSearch('أإآٱ')).toBe('اااا');
    expect(normaliseForSearch('رحمة')).toBe('رحمه');
    expect(normaliseForSearch('علىي')).toBe('عليي');
  });

  it('is idempotent — applying it twice changes nothing', () => {
    for (const a of uthmani.slice(0, 300)) {
      const once = normaliseForSearch(a.text);
      expect(normaliseForSearch(once)).toBe(once);
    }
  });

  it('never produces an empty string for a real ayah', () => {
    for (const a of uthmani) {
      expect(normaliseForSearch(a.text).length).toBeGreaterThan(0);
    }
  });
});

describe('page metadata', () => {
  const pages = parsePageMetadata(read('quran-data.xml'));

  it('parses all 604 mushaf pages', () => {
    expect(pages).toHaveLength(TOTAL_PAGES);
  });

  it('numbers pages 1..604 contiguously', () => {
    expect(pages.map((p) => p.index)).toEqual(
      Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1),
    );
  });

  it('starts on Al-Fatiha 1:1', () => {
    expect(pages[0]).toEqual({ index: 1, surah: 1, ayah: 1 });
  });

  it('advances monotonically through the Quran', () => {
    // Each page must start strictly after the previous one.
    for (let i = 1; i < pages.length; i += 1) {
      const prev = pages[i - 1];
      const curr = pages[i];
      const advanced =
        curr.surah > prev.surah || (curr.surah === prev.surah && curr.ayah > prev.ayah);
      expect(advanced).toBe(true);
    }
  });

  it('references only ayahs that exist', () => {
    const existing = new Set(uthmani.map((a) => `${a.surah}:${a.ayah}`));
    for (const page of pages) {
      expect(existing.has(`${page.surah}:${page.ayah}`)).toBe(true);
    }
  });
});
