/**
 * Runtime access to the prebuilt Quran database.
 *
 * The database ships inside the app bundle and is opened read-only. No parsing
 * of the source text files ever happens at runtime, and no network call is
 * required to read the Quran.
 */

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

import { normaliseForSearch } from './parseTanzil';

/**
 * The on-device filename carries a schema version.
 *
 * The bundled database is copied to disk once and reused forever, so a rebuilt
 * asset with new columns would never reach a device that already ran the app —
 * queries would fail against the stale copy. Bumping this constant changes the
 * target filename, which forces a fresh copy.
 *
 * ⚠️ Increment this whenever `scripts/build-db.ts` changes the schema.
 */
const DB_SCHEMA_VERSION = 8;
const DB_NAME = `quran-v${DB_SCHEMA_VERSION}.db`;

export interface ZekrItem {
  id: number;
  category: string;
  zekr: string;
  description: string;
  count: number;
  reference: string;
  search: string;
}

export interface AzkarCategory {
  category: string;
  count: number;
}

export interface Surah {
  number: number;
  nameAr: string;
  nameTr: string;
  nameEn: string;
  revelation: 'Meccan' | 'Medinan';
  ayahCount: number;
  startIndex: number;
  revealOrder: number;
  rukuCount: number;
}

export interface Ayah {
  /** 1-based mushaf page, 1..604. */
  page: number;
  id: number;
  surah: number;
  ayah: number;
  text: string;
  translation: string;
  hasBasmalah: boolean;
  lineStart?: number;
  lineEnd?: number;
}

export interface SearchHit extends Ayah {
  surahNameAr: string;
  surahNameTr: string;
  snippet: string;
}

interface SurahRow {
  number: number;
  name_ar: string;
  name_tr: string;
  name_en: string;
  revelation: 'Meccan' | 'Medinan';
  ayah_count: number;
  start_index: number;
  reveal_order: number;
  ruku_count: number;
}

interface AyahRow {
  id: number;
  surah: number;
  ayah: number;
  text_display: string;
  text_warsh?: string | null;
  translation_en: string;
  has_basmalah: number;
  page: number;
  page_warsh?: number | null;
  line_start?: number | null;
  line_end?: number | null;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Copies the bundled database into the writable SQLite directory on first
 * launch, then opens it. expo-sqlite cannot open a database directly from the
 * asset bundle, so a one-time copy is unavoidable — it runs behind the splash
 * screen and is skipped on every subsequent launch.
 */
async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  // Typed `string | null`; interpolating a null would yield a "null/SQLite"
  // path and fail far from the real cause.
  const documentDirectory = FileSystem.documentDirectory;
  if (documentDirectory === null) {
    throw new Error('Document directory is unavailable on this platform');
  }

  const sqliteDir = `${documentDirectory}SQLite`;
  const target = `${sqliteDir}/${DB_NAME}`;

  const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
  }

  const existing = await FileSystem.getInfoAsync(target);
  if (!existing.exists) {
    // Remove copies from previous schema versions so they do not accumulate.
    const stale = await FileSystem.readDirectoryAsync(sqliteDir);
    await Promise.all(
      stale
        .filter((name) => name.startsWith('quran') && name !== DB_NAME)
        .map((name) =>
          FileSystem.deleteAsync(`${sqliteDir}/${name}`, { idempotent: true }).catch(() => {}),
        ),
    );

    const asset = Asset.fromModule(require('../../assets/data/quran.db'));
    await asset.downloadAsync();

    if (asset.localUri === null) {
      throw new Error('Quran database asset could not be resolved');
    }

    await FileSystem.copyAsync({ from: asset.localUri, to: target });
  }

  const db = await SQLite.openDatabaseAsync(DB_NAME);

  /*
   * Verify the on-disk schema matches what the queries expect, and self-heal if
   * it does not.
   */
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(ayahs)');
  const warshColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(ayahs_warsh)');
  const qasidaColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(qasida_verses)');
  if (
    !columns.some((c) => c.name === 'text_display') ||
    !warshColumns.some((c) => c.name === 'line_start') ||
    !qasidaColumns.some((c) => c.name === 'hemistich_a')
  ) {
    await db.closeAsync();
    await FileSystem.deleteAsync(target, { idempotent: true });

    const asset = Asset.fromModule(require('../../assets/data/quran.db'));
    await asset.downloadAsync();
    if (asset.localUri === null) {
      throw new Error('Quran database asset could not be resolved');
    }
    await FileSystem.copyAsync({ from: asset.localUri, to: target });

    return SQLite.openDatabaseAsync(DB_NAME);
  }

  return db;
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= openDatabase();
  return dbPromise;
}

const toSurah = (row: SurahRow): Surah => ({
  number: row.number,
  nameAr: row.name_ar,
  nameTr: row.name_tr,
  nameEn: row.name_en,
  revelation: row.revelation,
  ayahCount: row.ayah_count,
  startIndex: row.start_index,
  revealOrder: row.reveal_order,
  rukuCount: row.ruku_count,
});

const toAyah = (row: AyahRow, riwaya: 'hafs' | 'warsh' = 'hafs'): Ayah => ({
  id: row.id,
  surah: row.surah,
  ayah: row.ayah,
  text: riwaya === 'warsh' && row.text_warsh ? row.text_warsh : row.text_display,
  translation: row.translation_en,
  hasBasmalah: row.has_basmalah === 1,
  page: riwaya === 'warsh' && row.page_warsh ? row.page_warsh : row.page,
});

export async function getAllSurahs(): Promise<Surah[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SurahRow>('SELECT * FROM surahs ORDER BY number');
  return rows.map(toSurah);
}

export async function getSurah(number: number): Promise<Surah | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SurahRow>('SELECT * FROM surahs WHERE number = ?', [number]);
  return row === null ? null : toSurah(row);
}

/** All ayahs of one surah. Bounded by construction — the longest is 286 rows. */
export async function getAyahsForSurah(surah: number, riwaya: 'hafs' | 'warsh' = 'hafs'): Promise<Ayah[]> {
  const db = await getDatabase();
  if (riwaya === 'warsh') {
    const rows = await db.getAllAsync<{
      id: number;
      surah: number;
      ayah: number;
      text: string;
      translation_en: string;
      has_basmalah: number;
      page: number;
    }>('SELECT id, surah, ayah, text, translation_en, has_basmalah, page FROM ayahs_warsh WHERE surah = ? ORDER BY ayah', [surah]);
    return rows.map((r) => ({
      id: r.id,
      surah: r.surah,
      ayah: r.ayah,
      text: r.text,
      translation: r.translation_en,
      hasBasmalah: r.has_basmalah === 1,
      page: r.page,
    }));
  }

  const rows = await db.getAllAsync<AyahRow>(
    'SELECT id, surah, ayah, text_display, translation_en, has_basmalah, page FROM ayahs WHERE surah = ? ORDER BY ayah',
    [surah],
  );
  return rows.map((r) => toAyah(r, 'hafs'));
}

/**
 * An inclusive ayah range within one surah, in order.
 *
 * Used where a fixed passage must be quoted (wallpaper presets). Callers get
 * the same `text_display` string the reader renders, so a quoted passage can
 * never drift from scripture the way a hand-typed literal does.
 */
export async function getAyahRange(surah: number, from: number, to: number, riwaya: 'hafs' | 'warsh' = 'hafs'): Promise<Ayah[]> {
  const db = await getDatabase();
  const [lo, hi] = from <= to ? [from, to] : [to, from];
  if (riwaya === 'warsh') {
    const rows = await db.getAllAsync<{
      id: number;
      surah: number;
      ayah: number;
      text: string;
      translation_en: string;
      has_basmalah: number;
      page: number;
    }>(
      `SELECT id, surah, ayah, text, translation_en, has_basmalah, page
         FROM ayahs_warsh
        WHERE surah = ? AND ayah BETWEEN ? AND ?
        ORDER BY ayah`,
      [surah, lo, hi],
    );
    return rows.map((r) => ({
      id: r.id,
      surah: r.surah,
      ayah: r.ayah,
      text: r.text,
      translation: r.translation_en,
      hasBasmalah: r.has_basmalah === 1,
      page: r.page,
    }));
  }

  const rows = await db.getAllAsync<AyahRow>(
    `SELECT id, surah, ayah, text_display, translation_en, has_basmalah, page
       FROM ayahs
      WHERE surah = ? AND ayah BETWEEN ? AND ?
      ORDER BY ayah`,
    [surah, lo, hi],
  );
  return rows.map((r) => toAyah(r, 'hafs'));
}

/**
 * Full-text search across the normalised Arabic and the English translation.
 *
 * The query is normalised with the SAME function used to build the index —
 * otherwise a diacritised query would silently match nothing.
 */
export async function search(rawQuery: string, limit = 50): Promise<SearchHit[]> {
  const trimmed = rawQuery.trim();
  if (trimmed.length < 2) return [];

  const db = await getDatabase();

  // Prefix-match each token so results appear while the user is still typing.
  // Tokens are quoted to neutralise FTS5 operators in user input.
  const tokens = normaliseForSearch(trimmed)
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => `"${t.replace(/"/g, '""')}"*`);

  if (tokens.length === 0) return [];

  const rows = await db.getAllAsync<AyahRow & { name_ar: string; name_tr: string; snippet: string }>(
    `SELECT a.id, a.surah, a.ayah, a.text_display, a.translation_en, a.has_basmalah, a.page,
            s.name_ar, s.name_tr,
            snippet(ayahs_fts, 1, '[', ']', '…', 12) AS snippet
       FROM ayahs_fts
       JOIN ayahs a ON a.id = ayahs_fts.rowid
       JOIN surahs s ON s.number = a.surah
      WHERE ayahs_fts MATCH ?
      ORDER BY rank
      LIMIT ?`,
    [tokens.join(' '), limit],
  );

  return rows.map((row) => ({
    ...toAyah(row),
    surahNameAr: row.name_ar,
    surahNameTr: row.name_tr,
    snippet: row.snippet,
  }));
}

export interface PageAyah extends Ayah {
  /** Set when this ayah is the FIRST of its surah, so the page draws a header. */
  surahHeader: {
    nameAr: string;
    nameEn: string;
    revelation: 'Meccan' | 'Medinan';
    ayahCount: number;
  } | null;
}

/**
 * All ayahs on one mushaf page, in order.
 *
 * A page holds between 1 and 42 ayahs, so this is always a small query. Surah
 * metadata is joined in because a new surah can begin part-way down a page and
 * the reader must draw its illuminated header inline at that point.
 */
export async function getAyahsForPage(page: number, riwaya: 'hafs' | 'warsh' = 'hafs'): Promise<PageAyah[]> {
  const db = await getDatabase();
  const isWarsh = riwaya === 'warsh';

  if (isWarsh) {
    const rows = await db.getAllAsync<{
      id: number;
      surah: number;
      ayah: number;
      line_start: number;
      line_end: number;
      text: string;
      translation_en: string;
      has_basmalah: number;
      page: number;
      name_ar: string;
      name_en: string;
      revelation: 'Meccan' | 'Medinan';
      ayah_count: number;
    }>(
      `SELECT a.id, a.surah, a.ayah, a.line_start, a.line_end, a.text, a.translation_en, a.has_basmalah, a.page,
              s.name_ar, s.name_en, s.revelation, s.ayah_count
         FROM ayahs_warsh a
         JOIN surahs s ON s.number = a.surah
        WHERE a.page = ?
        ORDER BY a.id`,
      [page],
    );

    return rows.map((row) => ({
      id: row.id,
      surah: row.surah,
      ayah: row.ayah,
      lineStart: row.line_start,
      lineEnd: row.line_end,
      text: row.text,
      translation: row.translation_en,
      hasBasmalah: row.has_basmalah === 1,
      page: row.page,
      surahHeader:
        row.ayah === 1
          ? {
              nameAr: row.name_ar,
              nameEn: row.name_en,
              revelation: row.revelation,
              ayahCount: row.ayah_count,
            }
          : null,
    }));
  }

  const rows = await db.getAllAsync<
    AyahRow & { name_ar: string; name_en: string; revelation: 'Meccan' | 'Medinan'; ayah_count: number }
  >(
    `SELECT a.id, a.surah, a.ayah, a.text_display, a.translation_en, a.has_basmalah, a.page,
            s.name_ar, s.name_en, s.revelation, s.ayah_count
       FROM ayahs a
       JOIN surahs s ON s.number = a.surah
      WHERE a.page = ?
      ORDER BY a.id`,
    [page],
  );

  return rows.map((row) => ({
    ...toAyah(row, 'hafs'),
    surahHeader:
      row.ayah === 1
        ? {
            nameAr: row.name_ar,
            nameEn: row.name_en,
            revelation: row.revelation,
            ayahCount: row.ayah_count,
          }
        : null,
  }));
}

/**
 * The mushaf page a given ayah sits on — used to restore the reading position.
 *
 * Hafs and Warsh number ayahs differently, so an ayah number taken from the
 * other riwaya may not exist here; fall back to the closest earlier ayah of
 * the same surah rather than to page 1.
 */
export async function getPageForAyah(surah: number, ayah: number, riwaya: 'hafs' | 'warsh' = 'hafs'): Promise<number> {
  const db = await getDatabase();
  const table = riwaya === 'warsh' ? 'ayahs_warsh' : 'ayahs';
  const row = await db.getFirstAsync<{ page: number }>(
    `SELECT page FROM ${table} WHERE surah = ? AND ayah <= ? ORDER BY ayah DESC LIMIT 1`,
    [surah, Math.max(1, ayah)],
  );
  return row?.page ?? 1;
}

const pageIndexCache = new Map<'hafs' | 'warsh', Promise<Map<number, number[]>>>();

/**
 * Every ayah's page for one riwaya, as `surah → pages[ayah - 1]`. Lets list
 * screens show riwaya-correct page numbers synchronously once loaded.
 */
export function getPageIndex(riwaya: 'hafs' | 'warsh'): Promise<Map<number, number[]>> {
  let cached = pageIndexCache.get(riwaya);
  if (!cached) {
    cached = (async () => {
      const db = await getDatabase();
      const table = riwaya === 'warsh' ? 'ayahs_warsh' : 'ayahs';
      const rows = await db.getAllAsync<{ surah: number; ayah: number; page: number }>(
        `SELECT surah, ayah, page FROM ${table} ORDER BY surah, ayah`,
      );
      const index = new Map<number, number[]>();
      for (const row of rows) {
        const pages = index.get(row.surah) ?? [];
        pages[row.ayah - 1] = row.page;
        index.set(row.surah, pages);
      }
      return index;
    })();
    cached.catch(() => pageIndexCache.delete(riwaya));
    pageIndexCache.set(riwaya, cached);
  }
  return cached;
}

/** Single ayah lookup by surah and verse number. */
export async function getAyah(surah: number, ayah: number, riwaya: 'hafs' | 'warsh' = 'hafs'): Promise<Ayah | null> {
  const db = await getDatabase();
  if (riwaya === 'warsh') {
    const row = await db.getFirstAsync<{
      id: number;
      surah: number;
      ayah: number;
      text: string;
      translation_en: string;
      has_basmalah: number;
      page: number;
    }>('SELECT id, surah, ayah, text, translation_en, has_basmalah, page FROM ayahs_warsh WHERE surah = ? AND ayah = ?', [surah, ayah]);
    return row === null ? null : {
      id: row.id,
      surah: row.surah,
      ayah: row.ayah,
      text: row.text,
      translation: row.translation_en,
      hasBasmalah: row.has_basmalah === 1,
      page: row.page,
    };
  }

  const row = await db.getFirstAsync<AyahRow>(
    'SELECT id, surah, ayah, text_display, translation_en, has_basmalah, page FROM ayahs WHERE surah = ? AND ayah = ?',
    [surah, ayah],
  );
  return row === null ? null : toAyah(row, 'hafs');
}

/** The surah a page opens in — drives the reader's top-bar title. */
export async function getSurahForPage(page: number, riwaya: 'hafs' | 'warsh' = 'hafs'): Promise<number> {
  const db = await getDatabase();
  const table = riwaya === 'warsh' ? 'ayahs_warsh' : 'ayahs';
  const row = await db.getFirstAsync<{ surah: number }>(
    `SELECT surah FROM ${table} WHERE page = ? ORDER BY id LIMIT 1`,
    [page],
  );
  return row?.surah ?? 1;
}

/**
 * Returns all distinct Azkar categories with total count of adhkar in each.
 */
export async function getAzkarCategories(): Promise<AzkarCategory[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ category: string; count: number }>(
    'SELECT category, COUNT(*) as count FROM azkar GROUP BY category ORDER BY id ASC',
  );
  return rows;
}

/**
 * Returns all Adhkar for a specific category.
 */
export async function getAzkarByCategory(category: string): Promise<ZekrItem[]> {
  const db = await getDatabase();
  const trimmed = category.trim();
  let rows = await db.getAllAsync<ZekrItem>(
    'SELECT id, category, zekr, description, count, reference, search FROM azkar WHERE category = ? ORDER BY id ASC',
    [trimmed],
  );

  if (rows.length === 0) {
    const cleanTerm = trimmed.replace(/^(ال|أ|ا|إ)/, '');
    rows = await db.getAllAsync<ZekrItem>(
      'SELECT id, category, zekr, description, count, reference, search FROM azkar WHERE category LIKE ? OR category LIKE ? ORDER BY id ASC',
      [`%${trimmed}%`, `%${cleanTerm}%`],
    );
  }

  return rows;
}

/**
 * Searches across all Azkar text, description, category, and keywords using FTS5.
 */
export async function searchAzkar(query: string, limit = 50): Promise<ZekrItem[]> {
  const q = query.trim();
  if (q.length === 0) return [];

  const db = await getDatabase();
  const cleanQ = `*${q.replace(/["'*]/g, '')}*`;

  try {
    const rows = await db.getAllAsync<ZekrItem>(
      `SELECT a.id, a.category, a.zekr, a.description, a.count, a.reference, a.search
         FROM azkar_fts f
         JOIN azkar a ON a.id = f.rowid
        WHERE azkar_fts MATCH ?
        LIMIT ?`,
      [cleanQ, limit],
    );
    return rows;
  } catch {
    // Fallback to LIKE query if FTS syntax error
    const likePattern = `%${q}%`;
    const rows = await db.getAllAsync<ZekrItem>(
      `SELECT id, category, zekr, description, count, reference, search
         FROM azkar
        WHERE zekr LIKE ? OR description LIKE ? OR category LIKE ? OR search LIKE ?
        LIMIT ?`,
      [likePattern, likePattern, likePattern, likePattern, limit],
    );
    return rows;
  }
}

/* -------------------------------------------------------------------------- */
/*  Qasā'id al-madā'iḥ an-nabawiyya (al-Burda & al-Hamziyya)                  */
/* -------------------------------------------------------------------------- */

export interface Qasida {
  slug: string;
  name: string;
  fullName: string;
  author: string;
  meter: string;
  rhyme: string;
  hasDiacritics: boolean;
  note: string;
  verseCount: number;
  sectionCount: number;
}

export interface QasidaSection {
  index: number;
  title: string;
}

export interface QasidaVerse {
  id: number;
  /** 0 = prelude / refrain line, 1..N = a numbered section. */
  sectionIndex: number;
  /** 0 for prelude lines, otherwise the verse's 1-based number in the poem. */
  verseNumber: number;
  hemistichA: string;
  hemistichB: string;
}

interface QasidaRow {
  slug: string;
  name: string;
  full_name: string;
  author: string;
  meter: string;
  rhyme: string;
  has_diacritics: number;
  note: string;
  verse_count: number;
  section_count: number;
}

interface QasidaVerseRow {
  id: number;
  section_index: number;
  verse_number: number;
  hemistich_a: string;
  hemistich_b: string;
}

const toQasida = (row: QasidaRow): Qasida => ({
  slug: row.slug,
  name: row.name,
  fullName: row.full_name,
  author: row.author,
  meter: row.meter,
  rhyme: row.rhyme,
  hasDiacritics: row.has_diacritics === 1,
  note: row.note,
  verseCount: row.verse_count,
  sectionCount: row.section_count,
});

const toQasidaVerse = (row: QasidaVerseRow): QasidaVerse => ({
  id: row.id,
  sectionIndex: row.section_index,
  verseNumber: row.verse_number,
  hemistichA: row.hemistich_a,
  hemistichB: row.hemistich_b,
});

/** All qasā'id, in display order. Two rows today — bounded by construction. */
export async function getAllQasidas(): Promise<Qasida[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<QasidaRow>('SELECT * FROM qasidas ORDER BY sort_order');
  return rows.map(toQasida);
}

export async function getQasida(slug: string): Promise<Qasida | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<QasidaRow>('SELECT * FROM qasidas WHERE slug = ?', [slug]);
  return row === null ? null : toQasida(row);
}

/** The section headings of one qasida, in order. */
export async function getQasidaSections(slug: string): Promise<QasidaSection[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ section_index: number; title: string }>(
    'SELECT section_index, title FROM qasida_sections WHERE qasida_slug = ? ORDER BY section_index',
    [slug],
  );
  return rows.map((r) => ({ index: r.section_index, title: r.title }));
}

/**
 * Every verse of one qasida, in order — prelude lines first (sectionIndex 0),
 * then each section. The longest poem is 457 verses, so this is always a small,
 * one-shot query the reader can hold in memory.
 */
export async function getQasidaVerses(slug: string): Promise<QasidaVerse[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<QasidaVerseRow>(
    `SELECT id, section_index, verse_number, hemistich_a, hemistich_b
       FROM qasida_verses
      WHERE qasida_slug = ?
      ORDER BY section_index, verse_number, id`,
    [slug],
  );
  return rows.map(toQasidaVerse);
}

export interface QasidaSearchHit extends QasidaVerse {
  qasidaSlug: string;
  qasidaName: string;
}

/** Full-text search across both qasā'id (normalised, diacritic-insensitive). */
export async function searchQasidas(rawQuery: string, limit = 40): Promise<QasidaSearchHit[]> {
  const trimmed = rawQuery.trim();
  if (trimmed.length < 2) return [];

  const db = await getDatabase();
  const tokens = normaliseForSearch(trimmed)
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => `"${t.replace(/"/g, '""')}"*`);
  if (tokens.length === 0) return [];

  try {
    const rows = await db.getAllAsync<QasidaVerseRow & { qasida_slug: string; name: string }>(
      `SELECT v.id, v.section_index, v.verse_number, v.hemistich_a, v.hemistich_b,
              v.qasida_slug, q.name
         FROM qasida_verses_fts f
         JOIN qasida_verses v ON v.id = f.rowid
         JOIN qasidas q ON q.slug = v.qasida_slug
        WHERE qasida_verses_fts MATCH ?
        ORDER BY rank
        LIMIT ?`,
      [tokens.join(' '), limit],
    );
    return rows.map((row) => ({
      ...toQasidaVerse(row),
      qasidaSlug: row.qasida_slug,
      qasidaName: row.name,
    }));
  } catch {
    const like = `%${normaliseForSearch(trimmed)}%`;
    const rows = await db.getAllAsync<QasidaVerseRow & { qasida_slug: string; name: string }>(
      `SELECT v.id, v.section_index, v.verse_number, v.hemistich_a, v.hemistich_b,
              v.qasida_slug, q.name
         FROM qasida_verses v
         JOIN qasidas q ON q.slug = v.qasida_slug
        WHERE v.search LIKE ?
        LIMIT ?`,
      [like, limit],
    );
    return rows.map((row) => ({
      ...toQasidaVerse(row),
      qasidaSlug: row.qasida_slug,
      qasidaName: row.name,
    }));
  }
}

