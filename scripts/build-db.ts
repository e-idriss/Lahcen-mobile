/**
 * Build-time generator: turns the Tanzil source files into a prebuilt SQLite
 * database shipped inside the app bundle.
 *
 * Run with `npm run build:db`. The output is committed as
 * `assets/data/quran.db` so the app never parses megabytes of text at runtime
 * (see the Performance section of CLAUDE.md).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  TOTAL_AYAHS,
  TOTAL_SURAHS,
  extractBasmalah,
  normaliseForSearch,
  parseSurahMetadata,
  parsePageMetadata,
  parseTanzilText,
  splitBasmalah,
  TOTAL_PAGES,
} from '../src/data/parseTanzil';

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'data-src');
const OUT_DIR = join(ROOT, 'assets', 'data');
const OUT_DB = join(OUT_DIR, 'quran.db');

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

interface WarshRecord {
  id: number;
  jozz: number;
  page: number;
  surah: number;
  ayah: number;
  lineStart: number;
  lineEnd: number;
  text: string;
}

function parseWarshXml(xml: string): WarshRecord[] {
  const records: WarshRecord[] = [];
  const rowRegex = /<ROW>([\s\S]*?)<\/ROW>/g;
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(xml)) !== null) {
    const row = match[1];
    const idMatch = /<id>(\d+)<\/id>/.exec(row);
    const jozzMatch = /<jozz>(\d+)<\/jozz>/.exec(row);
    const suraMatch = /<sura_no>(\d+)<\/sura_no>/.exec(row);
    const ayaMatch = /<aya_no>(\d+)<\/aya_no>/.exec(row);
    const lineStartMatch = /<line_start>(\d+)<\/line_start>/.exec(row);
    const lineEndMatch = /<line_end>(\d+)<\/line_end>/.exec(row);
    const pageMatch = /<page>([\d-]+)<\/page>/.exec(row);
    const textMatch = /<aya_text>([\s\S]*?)<\/aya_text>/.exec(row);

    if (suraMatch && ayaMatch && pageMatch && textMatch) {
      const id = idMatch ? parseInt(idMatch[1], 10) : records.length + 1;
      const jozz = jozzMatch ? parseInt(jozzMatch[1], 10) : 1;
      const surah = parseInt(suraMatch[1], 10);
      const ayah = parseInt(ayaMatch[1], 10);
      const lineStart = lineStartMatch ? parseInt(lineStartMatch[1], 10) : 1;
      const lineEnd = lineEndMatch ? parseInt(lineEndMatch[1], 10) : lineStart;
      // Handles page ranges like "85-86" by taking starting page 85
      const page = parseInt(pageMatch[1].split('-')[0], 10);
      const text = textMatch[1]
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s*[٠-٩]+\s*$/, '')
        .trim();

      records.push({ id, jozz, page, surah, ayah, lineStart, lineEnd, text });
    }
  }

  return records;
}

function main(): void {
  console.log('Reading Tanzil source files…');
  const simple = parseTanzilText(readFileSync(join(SRC, 'quran-simple.txt'), 'utf8'));
  const english = parseTanzilText(readFileSync(join(SRC, 'en.sahih.txt'), 'utf8'));
  const metadataXml = readFileSync(join(SRC, 'quran-data.xml'), 'utf8');
  const surahs = parseSurahMetadata(metadataXml);
  const pageStarts = parsePageMetadata(metadataXml);

  // Fail loudly rather than shipping a corrupt mushaf.
  assert(simple.length === TOTAL_AYAHS, `simple: expected ${TOTAL_AYAHS}, got ${simple.length}`);
  assert(english.length === TOTAL_AYAHS, `english: expected ${TOTAL_AYAHS}, got ${english.length}`);
  assert(surahs.length === TOTAL_SURAHS, `surahs: expected ${TOTAL_SURAHS}, got ${surahs.length}`);
  assert(pageStarts.length === TOTAL_PAGES, `pages: expected ${TOTAL_PAGES}, got ${pageStarts.length}`);

  const englishByKey = new Map(english.map((a) => [`${a.surah}:${a.ayah}`, a.text]));

  const basmalahSimple = extractBasmalah(simple);
  assert(basmalahSimple !== undefined, 'could not extract Basmalah from simple text');

  console.log('Reading Warsh XML file…');
  const warshXmlPath = join(ROOT, 'warshData_v10.xml');
  const warshRecords = existsSync(warshXmlPath)
    ? parseWarshXml(readFileSync(warshXmlPath, 'utf8'))
    : [];
  console.log(`Parsed ${warshRecords.length} Warsh ayahs from warshData_v10.xml`);

  console.log('Building SQL…');
  const statements: string[] = [
    'PRAGMA journal_mode = DELETE;',
    'BEGIN TRANSACTION;',
    `CREATE TABLE surahs (
       number INTEGER PRIMARY KEY,
       name_ar TEXT NOT NULL,
       name_tr TEXT NOT NULL,
       name_en TEXT NOT NULL,
       revelation TEXT NOT NULL,
       ayah_count INTEGER NOT NULL,
       start_index INTEGER NOT NULL,
       reveal_order INTEGER NOT NULL,
       ruku_count INTEGER NOT NULL
     );`,
    `CREATE TABLE ayahs (
       id INTEGER PRIMARY KEY,          -- 1-based global ayahId, matches quran-meta
       surah INTEGER NOT NULL,
       ayah INTEGER NOT NULL,
       text_display TEXT NOT NULL,      -- Hafs display text, Basmalah prefix removed
       text_search TEXT NOT NULL,       -- same text, diacritics stripped; search only
       translation_en TEXT NOT NULL,
       has_basmalah INTEGER NOT NULL,   -- 1 = render a standalone Basmalah header
       page INTEGER NOT NULL            -- 1-based Hafs mushaf page, 1..604
     );`,
    'CREATE INDEX idx_ayahs_surah_ayah ON ayahs (surah, ayah);',
    'CREATE INDEX idx_ayahs_page ON ayahs (page);',
    `CREATE TABLE ayahs_warsh (
       id INTEGER PRIMARY KEY,
       jozz INTEGER NOT NULL,
       page INTEGER NOT NULL,
       surah INTEGER NOT NULL,
       ayah INTEGER NOT NULL,
       line_start INTEGER NOT NULL DEFAULT 1,
       line_end INTEGER NOT NULL DEFAULT 1,
       text TEXT NOT NULL,
       translation_en TEXT NOT NULL,
       has_basmalah INTEGER NOT NULL
     );`,
    'CREATE INDEX idx_ayahs_warsh_page ON ayahs_warsh (page);',
    'CREATE INDEX idx_ayahs_warsh_surah_ayah ON ayahs_warsh (surah, ayah);',
  ];

  for (const s of surahs) {
    statements.push(
      `INSERT INTO surahs VALUES (${s.index}, ${sqlString(s.name)}, ${sqlString(s.tname)}, ` +
        `${sqlString(s.ename)}, ${sqlString(s.type)}, ${s.ayas}, ${s.start}, ${s.order}, ${s.rukus});`,
    );
  }

  /*
   * Page assignment. `pageStarts` marks where each page BEGINS, so an ayah
   * belongs to the last page whose start is at or before it. Walking both lists
   * in order keeps this O(n) rather than a lookup per ayah.
   */
  const pageStartKeys = new Set(pageStarts.map((p) => `${p.surah}:${p.ayah}`));
  let currentPage = 0;

  let basmalahCount = 0;

  simple.forEach((record, i) => {
    const key = `${record.surah}:${record.ayah}`;
    const translation = englishByKey.get(key);

    assert(translation !== undefined, `missing translation for ${key}`);

    if (pageStartKeys.has(key)) currentPage += 1;
    assert(currentPage >= 1, `ayah ${key} precedes the first page start`);

    const display = splitBasmalah(record.surah, record.ayah, record.text, basmalahSimple);
    if (display.hasBasmalah) basmalahCount += 1;

    assert(
      !/^\p{Mn}/u.test(display.body),
      `ayah ${key} starts with an orphaned diacritic: ${JSON.stringify(display.body.slice(0, 20))}`,
    );
    assert(display.body.length > 0, `ayah ${key} became empty after Basmalah split`);

    statements.push(
      `INSERT INTO ayahs VALUES (${i + 1}, ${record.surah}, ${record.ayah}, ` +
        `${sqlString(display.body)}, ${sqlString(normaliseForSearch(display.body))}, ` +
        `${sqlString(translation)}, ${display.hasBasmalah ? 1 : 0}, ${currentPage});`,
    );
  });

  // Populate Warsh table
  for (const w of warshRecords) {
    const translation = englishByKey.get(`${w.surah}:${w.ayah}`) || '';
    const hasBasmalah = w.surah !== 1 && w.surah !== 9 && w.ayah === 1 ? 1 : 0;
    statements.push(
      `INSERT INTO ayahs_warsh VALUES (${w.id}, ${w.jozz}, ${w.page}, ${w.surah}, ${w.ayah}, ` +
        `${w.lineStart}, ${w.lineEnd}, ${sqlString(w.text)}, ${sqlString(translation)}, ${hasBasmalah});`,
    );
  }

  // 112 surahs carry a prefixed Basmalah: all but Al-Fatiha (where it is ayah 1)
  // and At-Tawba (which has none).
  assert(basmalahCount === 112, `expected 112 prefixed Basmalahs, got ${basmalahCount}`);
  assert(currentPage === TOTAL_PAGES, `expected to end on page ${TOTAL_PAGES}, got ${currentPage}`);

  // FTS5 over the normalised Arabic and the English translation. `content=` makes
  // this an external-content table so the text is not duplicated on disk.
  statements.push(
    `CREATE VIRTUAL TABLE ayahs_fts USING fts5(
       text_search, translation_en,
       content='ayahs', content_rowid='id', tokenize='unicode61'
     );`,
    `INSERT INTO ayahs_fts (rowid, text_search, translation_en)
       SELECT id, text_search, translation_en FROM ayahs;`,
  );

  // Azkar & Adiyah table from Hisn Al-Muslim dataset
  console.log('Reading Azkar source file…');
  const azkarJsonRaw = JSON.parse(readFileSync(join(SRC, 'azkar.json'), 'utf8'));
  const azkarRows: any[][] = azkarJsonRaw.rows || [];

  statements.push(
    `CREATE TABLE azkar (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       category TEXT NOT NULL,
       zekr TEXT NOT NULL,
       description TEXT,
       count INTEGER NOT NULL DEFAULT 1,
       reference TEXT,
       search TEXT
     );`,
    'CREATE INDEX idx_azkar_category ON azkar (category);',
  );

  for (const row of azkarRows) {
    const category = row[0] || '';
    const zekr = row[1] || '';
    const description = row[2] || '';
    const count = typeof row[3] === 'number' ? row[3] : 1;
    const reference = row[4] || '';
    const search = row[5] || '';

    statements.push(
      `INSERT INTO azkar (category, zekr, description, count, reference, search) VALUES (` +
        `${sqlString(category)}, ${sqlString(zekr)}, ${sqlString(description)}, ` +
        `${count}, ${sqlString(reference)}, ${sqlString(search)});`,
    );
  }

  statements.push(
    `CREATE VIRTUAL TABLE azkar_fts USING fts5(
       zekr, description, category, search,
       content='azkar', content_rowid='id', tokenize='unicode61'
     );`,
    `INSERT INTO azkar_fts (rowid, zekr, description, category, search)
       SELECT id, zekr, description, category, search FROM azkar;`,
  );

  // Qasā'id al-madā'iḥ an-nabawiyya (al-Burda & al-Hamziyya). Devotional poems,
  // not scripture — kept in their own tables, shown on their own screen.
  console.log('Reading Qasā’id source file…');
  const qasaidRaw = JSON.parse(readFileSync(join(SRC, 'qasidas.json'), 'utf8')) as {
    qasidas: {
      slug: string;
      name: string;
      full_name: string;
      author: string;
      meter: string;
      rhyme: string;
      has_diacritics: boolean;
      note: string;
      prelude: { a: string; b: string }[];
      sections: { index: number; title: string; verses: { n: number; a: string; b: string }[] }[];
    }[];
  };

  statements.push(
    `CREATE TABLE qasidas (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       slug TEXT NOT NULL UNIQUE,
       name TEXT NOT NULL,
       full_name TEXT NOT NULL,
       author TEXT NOT NULL,
       meter TEXT NOT NULL,
       rhyme TEXT NOT NULL,
       has_diacritics INTEGER NOT NULL,
       note TEXT NOT NULL,
       verse_count INTEGER NOT NULL,
       section_count INTEGER NOT NULL,
       sort_order INTEGER NOT NULL
     );`,
    `CREATE TABLE qasida_sections (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       qasida_slug TEXT NOT NULL,
       section_index INTEGER NOT NULL,
       title TEXT NOT NULL
     );`,
    'CREATE INDEX idx_qasida_sections_slug ON qasida_sections (qasida_slug, section_index);',
    `CREATE TABLE qasida_verses (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       qasida_slug TEXT NOT NULL,
       section_index INTEGER NOT NULL,   -- 0 = prelude / refrain, 1..N = sections
       verse_number INTEGER NOT NULL,    -- 0 for prelude lines, else 1-based within the poem
       hemistich_a TEXT NOT NULL,        -- صدر
       hemistich_b TEXT NOT NULL,        -- عجز
       search TEXT NOT NULL              -- both hemistichs, diacritics stripped
     );`,
    'CREATE INDEX idx_qasida_verses_slug ON qasida_verses (qasida_slug, section_index, verse_number);',
  );

  qasaidRaw.qasidas.forEach((q, qi) => {
    const verseCount = q.sections.reduce((sum, s) => sum + s.verses.length, 0);
    statements.push(
      `INSERT INTO qasidas (slug, name, full_name, author, meter, rhyme, has_diacritics, note, verse_count, section_count, sort_order) VALUES (` +
        `${sqlString(q.slug)}, ${sqlString(q.name)}, ${sqlString(q.full_name)}, ${sqlString(q.author)}, ` +
        `${sqlString(q.meter)}, ${sqlString(q.rhyme)}, ${q.has_diacritics ? 1 : 0}, ${sqlString(q.note)}, ` +
        `${verseCount}, ${q.sections.length}, ${qi});`,
    );

    q.prelude.forEach((line) => {
      statements.push(
        `INSERT INTO qasida_verses (qasida_slug, section_index, verse_number, hemistich_a, hemistich_b, search) VALUES (` +
          `${sqlString(q.slug)}, 0, 0, ${sqlString(line.a)}, ${sqlString(line.b)}, ` +
          `${sqlString(normaliseForSearch(`${line.a} ${line.b}`))});`,
      );
    });

    for (const section of q.sections) {
      statements.push(
        `INSERT INTO qasida_sections (qasida_slug, section_index, title) VALUES (` +
          `${sqlString(q.slug)}, ${section.index}, ${sqlString(section.title)});`,
      );
      for (const v of section.verses) {
        statements.push(
          `INSERT INTO qasida_verses (qasida_slug, section_index, verse_number, hemistich_a, hemistich_b, search) VALUES (` +
            `${sqlString(q.slug)}, ${section.index}, ${v.n}, ${sqlString(v.a)}, ${sqlString(v.b)}, ` +
            `${sqlString(normaliseForSearch(`${v.a} ${v.b}`))});`,
        );
      }
    }
  });

  statements.push(
    `CREATE VIRTUAL TABLE qasida_verses_fts USING fts5(
       search,
       content='qasida_verses', content_rowid='id', tokenize='unicode61'
     );`,
    `INSERT INTO qasida_verses_fts (rowid, search)
       SELECT id, search FROM qasida_verses;`,
    'COMMIT;',
    'VACUUM;',
  );

  console.log('Writing database…');
  mkdirSync(OUT_DIR, { recursive: true });
  rmSync(OUT_DB, { force: true });

  const sqlFile = join(OUT_DIR, '.build.sql');
  writeFileSync(sqlFile, statements.join('\n'), 'utf8');

  try {
    execFileSync('sqlite3', [OUT_DB], { stdio: ['pipe', 'inherit', 'inherit'], input: readFileSync(sqlFile) });
  } finally {
    rmSync(sqlFile, { force: true });
  }

  assert(existsSync(OUT_DB), 'database was not created');

  const rows = execFileSync('sqlite3', [OUT_DB, 'SELECT COUNT(*) FROM ayahs;'], { encoding: 'utf8' }).trim();
  assert(Number(rows) === TOTAL_AYAHS, `db row count ${rows} !== ${TOTAL_AYAHS}`);

  const burdaVerses = execFileSync(
    'sqlite3',
    [OUT_DB, "SELECT COUNT(*) FROM qasida_verses WHERE qasida_slug = 'burda' AND verse_number > 0;"],
    { encoding: 'utf8' },
  ).trim();
  assert(Number(burdaVerses) === 160, `al-Burda verse count ${burdaVerses} !== 160`);

  const hamziyyaVerses = execFileSync(
    'sqlite3',
    [OUT_DB, "SELECT COUNT(*) FROM qasida_verses WHERE qasida_slug = 'hamziyya' AND verse_number > 0;"],
    { encoding: 'utf8' },
  ).trim();
  assert(Number(hamziyyaVerses) === 457, `al-Hamziyya verse count ${hamziyyaVerses} !== 457`);

  const sizeMb = (readFileSync(OUT_DB).byteLength / 1048576).toFixed(2);
  console.log(`✓ ${OUT_DB} — ${rows} ayahs, ${burdaVerses}+${hamziyyaVerses} qasida verses, ${sizeMb} MB`);
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
}

main();
