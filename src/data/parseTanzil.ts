/**
 * Parsers for the Tanzil.net source data files.
 *
 * These are pure functions with no I/O so they can be unit-tested directly and
 * reused by both the build-time DB generator and the test suite.
 *
 * Source format is pipe-delimited `surah|ayah|text`, wrapped in `#` comment
 * blocks at BOTH the head and the tail of the file. The trailing licence block
 * is the usual cause of corrupt parses, so it is stripped explicitly.
 */

export const TOTAL_AYAHS = 6236;
export const TOTAL_SURAHS = 114;

/**
 * The Basmalah is NEVER hardcoded as a literal here.
 *
 * The two source files use different orthography for the same words — the
 * Uthmani text uses alef wasla (U+0671) where the simple text uses plain alef
 * (U+0627), and both embed a tatweel (U+0640) before the superscript alef in
 * ٱلرَّحْمَـٰن. Retyping the Arabic by hand silently produces a string that never
 * matches, so the Basmalah is instead derived from ayah 1:1 of whichever file
 * is being parsed. Ayah 1:1 is verified to be an exact prefix of ayah 2:1 in
 * both files, which is precisely the property the split relies on.
 */
export function extractBasmalah(ayahs: ParsedAyah[]): string | undefined {
  return ayahs.find((a) => a.surah === 1 && a.ayah === 1)?.text;
}

/** Surah 9 (At-Tawba) is the only surah with no Basmalah at all. */
export const SURAH_WITHOUT_BASMALAH = 9;
/** In Surah 1 (Al-Fatiha) the Basmalah *is* ayah 1 and must stay in the text. */
export const SURAH_WITH_BASMALAH_AS_AYAH = 1;

export interface ParsedAyah {
  surah: number;
  ayah: number;
  text: string;
}

/**
 * Parses a Tanzil pipe-delimited text file into ayah records.
 *
 * Skips `#` comment lines and blank lines. Only splits on the first two
 * delimiters, so any `|` occurring inside the text itself is preserved.
 */
export function parseTanzilText(raw: string): ParsedAyah[] {
  const out: ParsedAyah[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const firstPipe = trimmed.indexOf('|');
    const secondPipe = trimmed.indexOf('|', firstPipe + 1);
    if (firstPipe === -1 || secondPipe === -1) continue;

    const surah = Number(trimmed.slice(0, firstPipe));
    const ayah = Number(trimmed.slice(firstPipe + 1, secondPipe));
    const text = trimmed.slice(secondPipe + 1).trim();

    if (!Number.isInteger(surah) || !Number.isInteger(ayah) || text === '') continue;

    out.push({ surah, ayah, text });
  }

  return out;
}

/**
 * Splits the leading Basmalah off an ayah where it is a prefix rather than a
 * verse of its own.
 *
 * Rules encoded here (see CLAUDE.md — this is correctness-critical):
 *  - Surah 1: the Basmalah IS ayah 1 → never split, text returned unchanged.
 *  - Surah 9: has no Basmalah at all → nothing to split.
 *  - All others, ayah 1: the Basmalah is a prefix → split it off so the reader
 *    can render it as a centred, unnumbered header.
 *
 * `basmalah` must be the 1:1 text of the SAME file being parsed — see
 * `extractBasmalah`. Passing the other file's orthography will never match.
 *
 * Matching is done on the DIACRITIC-FREE letter skeleton, because surahs 95 and
 * 97 carry an extra shadda (U+0651) on the ba — بِّسْمِ rather than بِسْمِ — as
 * idgham notation inherited from the end of the preceding surah. That is
 * genuine Uthmani orthography, not a data error, so an exact string comparison
 * would wrongly leave the Basmalah embedded in those two ayahs.
 *
 * Crucially, only the COMPARISON ignores diacritics: the returned body is
 * sliced from the ORIGINAL text, so no mark is ever lost from displayed
 * scripture.
 *
 * Returns the body with the Basmalah removed, and whether one was found.
 */
export function splitBasmalah(
  surah: number,
  ayah: number,
  text: string,
  basmalah: string,
): { body: string; hasBasmalah: boolean } {
  if (ayah !== 1) return { body: text, hasBasmalah: false };
  if (surah === SURAH_WITH_BASMALAH_AS_AYAH) return { body: text, hasBasmalah: false };
  if (surah === SURAH_WITHOUT_BASMALAH) return { body: text, hasBasmalah: false };

  // Walk the original text until its letter skeleton covers the whole Basmalah
  // skeleton, then cut there — this yields the correct index into the original.
  const targetSkeleton = lettersOnly(basmalah);
  let skeletonSoFar = '';

  for (let i = 0; i < text.length; i += 1) {
    skeletonSoFar += lettersOnly(text[i]);

    if (skeletonSoFar.length >= targetSkeleton.length) {
      if (skeletonSoFar === targetSkeleton) {
        // The final letter may carry trailing diacritics that belong to the
        // Basmalah, not to the following ayah. Consume them, or they surface as
        // a stray mark at the head of the body (e.g. "ِ الٓمٓ" for 2:1).
        let end = i + 1;
        while (end < text.length && lettersOnly(text[end]) === '') end += 1;
        return { body: text.slice(end).trim(), hasBasmalah: true };
      }
      break; // diverged — not a Basmalah prefix
    }
  }

  // Defensive: the surah should have had a Basmalah prefix but did not match.
  // Return unchanged rather than silently mangling scripture.
  return { body: text, hasBasmalah: false };
}

/** Removes all Arabic diacritics and tatweel, leaving only base letters and spaces. */
function lettersOnly(text: string): string {
  return text.replace(/[\p{Mn}\u0640]/gu, '');
}

/**
 * Strips Arabic diacritics and normalises letter variants so that search works
 * on the simplified text. Used for the FTS index and for query normalisation —
 * both sides must use this same function or matching silently fails.
 */
export function normaliseForSearch(text: string): string {
  return text
    // Harakat, tanween, shadda, sukun, superscript alef, and tatweel.
    .replace(/[\p{Mn}\u0640]/gu, '')
    .replace(/[آأإٱ]/g, 'ا') // alef variants → bare alef
    .replace(/ة/g, 'ه') // ta marbuta → ha
    .replace(/[ىي]/g, 'ي') // alef maqsura → ya
    .replace(/[ؤئ]/g, 'ء') // hamza carriers → bare hamza
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SurahMetaRow {
  index: number;
  ayas: number;
  start: number;
  name: string;
  tname: string;
  ename: string;
  type: 'Meccan' | 'Medinan';
  order: number;
  rukus: number;
}

/**
 * Parses the `<sura .../>` rows out of Tanzil's `quran-data.xml`.
 *
 * A small regex reader is used rather than a full XML dependency: the file is
 * a fixed, known asset read only at build time, never at runtime.
 *
 * NOTE: `start` here is Tanzil's 0-BASED global ayah offset. `quran-meta` uses
 * 1-based ayahIds. Convert at the boundary — see CLAUDE.md.
 */
export function parseSurahMetadata(xml: string): SurahMetaRow[] {
  const rows: SurahMetaRow[] = [];
  const suraTag = /<sura\s+([^/>]+)\/>/g;
  const attr = /(\w+)="([^"]*)"/g;

  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = suraTag.exec(xml)) !== null) {
    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    attr.lastIndex = 0;
    while ((attrMatch = attr.exec(tagMatch[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    if (attrs.index === undefined) continue;

    rows.push({
      index: Number(attrs.index),
      ayas: Number(attrs.ayas),
      start: Number(attrs.start),
      name: attrs.name,
      tname: attrs.tname,
      ename: attrs.ename,
      type: attrs.type as 'Meccan' | 'Medinan',
      order: Number(attrs.order),
      rukus: Number(attrs.rukus),
    });
  }

  return rows;
}

/** Total pages in the standard Madani mushaf. */
export const TOTAL_PAGES = 604;

export interface PageMetaRow {
  /** 1-based mushaf page number, 1..604. */
  index: number;
  /** Surah of the first ayah on this page. */
  surah: number;
  /** Ayah number of the first ayah on this page. */
  ayah: number;
}

/**
 * Parses the `<page .../>` rows out of Tanzil's `quran-data.xml`.
 *
 * Each row marks where a page STARTS; a page runs until the next page's start
 * (the last page runs to the end of the Quran).
 */
export function parsePageMetadata(xml: string): PageMetaRow[] {
  const rows: PageMetaRow[] = [];
  const pageTag = /<page\s+index="(\d+)"\s+sura="(\d+)"\s+aya="(\d+)"\s*\/>/g;

  let match: RegExpExecArray | null;
  while ((match = pageTag.exec(xml)) !== null) {
    rows.push({
      index: Number(match[1]),
      surah: Number(match[2]),
      ayah: Number(match[3]),
    });
  }

  return rows;
}
