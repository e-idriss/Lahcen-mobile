/**
 * Checks the Warsh text (warshData_v10.xml, KFGQPC) against a Quran font through
 * CoreText, the iOS text engine:
 *   1. lists every character of the 6214 ayahs that has no glyph in the font;
 *   2. renders sample ayahs to PNG, before and after splitAlmaghribiRuns()
 *      (missing codepoints drawn with the KFGQPC Warsh fallback font).
 *
 * Usage (macOS): npx tsx scripts/almaghribi-preview/preview.ts [--font <path>] [surah:ayah ...]
 * Output: scripts/almaghribi-preview/out/preview.png
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { splitAlmaghribiRuns } from '../../src/features/reader/almaghribiRuns';

const ROOT = join(__dirname, '..', '..');
const OUT_DIR = join(__dirname, 'out');
const FALLBACK_FONT = join(ROOT, 'assets/fonts/KFGQPC_Warsh.ttf');

// One ayah per problem codepoint: ۖ waqf, ۪ imala, ۥ ۦ silah, ے yeh barree,
// ۟ wasl, ٞ open tanween, ۩ sajda, ۨ small noon.
const DEFAULT_AYAHS = ['1:3', '1:5', '2:5', '2:9', '2:20', '2:21', '7:206', '21:87'];

const args = process.argv.slice(2);
const fontIndex = args.indexOf('--font');
const font = fontIndex >= 0 ? args.splice(fontIndex, 2)[1] : join(ROOT, 'assets/fonts/Almaghribi Warsh-Quran.otf');
const keys = args.length > 0 ? args : DEFAULT_AYAHS;

const xml = readFileSync(join(ROOT, 'warshData_v10.xml'), 'utf8');
const ayahs = new Map<string, string>();
for (const [, row] of xml.matchAll(/<ROW>([\s\S]*?)<\/ROW>/g)) {
  const surah = /<sura_no>(\d+)<\/sura_no>/.exec(row)?.[1];
  const ayah = /<aya_no>(\d+)<\/aya_no>/.exec(row)?.[1];
  const text = /<aya_text>([\s\S]*?)<\/aya_text>/.exec(row)?.[1];
  if (surah && ayah && text) ayahs.set(`${surah}:${ayah}`, text.replace(/\s*[٠-٩]+\s*$/, '').trim());
}

const samples = keys.map((key) => {
  const text = ayahs.get(key);
  if (!text) throw new Error(`Ayah introuvable : ${key}`);
  // First 8 words, so each line fits the image.
  const excerpt = text.split(' ').slice(0, 8).join(' ');
  return { label: key, text: excerpt, runs: splitAlmaghribiRuns(excerpt) };
});
const chars = [...new Set([...ayahs.values()].join('').replace(/\s/g, ''))].join('');

mkdirSync(OUT_DIR, { recursive: true });
const input = join(OUT_DIR, 'input.json');
const output = join(OUT_DIR, 'preview.png');
writeFileSync(input, JSON.stringify({ samples, chars }));
console.log(`Police : ${font} — ${ayahs.size} ayahs`);
execFileSync('swift', [join(__dirname, 'render.swift'), font, FALLBACK_FONT, input, output], { stdio: 'inherit' });
console.log(`Aperçu : ${output}`);
