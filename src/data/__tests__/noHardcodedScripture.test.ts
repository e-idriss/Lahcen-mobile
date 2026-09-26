/**
 * Guard: application code must never contain hand-typed Quranic text.
 *
 * Every Arabic ayah shown on screen has to come from `text_display` in the
 * bundled database. Retyping scripture in a component is how this app once
 * shipped truncated verses, a concatenation of two ayahs joined by a literal
 * end-of-ayah marker, and Basmalah literals in Uthmani orthography — none of
 * which any existing test could see, because none of it passed through the
 * parser those tests cover.
 *
 * This test reads the source tree itself, so it fails on the *next* literal
 * someone adds rather than on its downstream symptoms.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');

/**
 * Files allowed to contain these codepoints:
 *  - the parser documents and normalises them,
 *  - its tests assert on that normalisation.
 */
const ALLOWED = [join('src', 'data', 'parseTanzil.ts'), join('src', 'data', '__tests__')];

/** Codepoints that must never appear in a source literal. */
const FORBIDDEN = [
  { char: 'ٱ', name: 'U+0671 ALEF WASLA (Uthmani-only orthography)' },
  { char: '۝', name: 'U+06DD END OF AYAH (font draws the medallion itself)' },
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      out.push(...sourceFiles(full));
    } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

describe('no hardcoded scripture in application code', () => {
  const files = [...sourceFiles(join(ROOT, 'app')), ...sourceFiles(join(ROOT, 'src'))].filter(
    (f) => !ALLOWED.some((a) => relative(ROOT, f).startsWith(a)),
  );

  it('scans a non-trivial number of source files', () => {
    // Guards against the walker silently matching nothing and passing vacuously.
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(FORBIDDEN)('contains no $name', ({ char }) => {
    const offenders: string[] = [];

    for (const file of files) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (line.includes(char)) offenders.push(`${relative(ROOT, file)}:${i + 1}`);
        });
    }

    expect(offenders).toEqual([]);
  });

  /**
   * Catches quoted scripture by SHAPE rather than by codepoint.
   *
   * The forbidden-codepoint checks above miss the most common failure: an ayah
   * retyped in simple orthography and silently truncated mid-verse. Every such
   * literal found so far was a long run of *vocalised* Arabic — ordinary UI
   * copy in this app is written without harakat — so that is what is flagged.
   */
  it('contains no long vocalised Arabic literals (retyped scripture)', () => {
    const ARABIC_RUN = /[ء-ْٰۖ-ۭ ]{40,}/;
    const HARAKAT = /[ً-ْٰ]/g;

    /**
     * Ordinary Arabic UI copy in this app is unvocalised; the odd harakat
     * appears in a word like "تلقائياً". Fully vocalised text — every word
     * carrying marks — is scripture or hadith being quoted. Measuring the
     * DENSITY of harakat separates the two reliably.
     */
    const VOCALISED_RATIO = 0.15;

    const offenders: string[] = [];

    for (const file of files) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const match = line.match(ARABIC_RUN);
          if (match === null) return;

          const run = match[0];
          const marks = run.match(HARAKAT)?.length ?? 0;
          if (marks / run.length >= VOCALISED_RATIO) {
            offenders.push(`${relative(ROOT, file)}:${i + 1} → ${run.trim().slice(0, 40)}`);
          }
        });
    }

    expect(offenders).toEqual([]);
  });
});
