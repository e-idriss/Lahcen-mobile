/**
 * Splits Warsh text into font runs for the Almaghribi font.
 *
 * The KFGQPC Warsh text uses a few codepoints that "Almaghribi Warsh-Quran.otf"
 * has no glyph for (e.g. the waqf mark ۖ U+06D6). On iOS, CoreText then draws
 * the WHOLE grapheme cluster with a system fallback font, not just the missing
 * mark: in اِ۬لدِّينِۖ the ن + kasra + ۖ go to Geeza Pro, so the ن turns naskh
 * and the ي before it loses its connection (and its dots). HarfBuzz-based tools
 * (Inkscape, browsers) only replace the mark, which is why they look fine.
 *
 * Putting each missing codepoint in its own run (a nested <Text> with the KFGQPC
 * Warsh font, which covers it) keeps the base letters in Almaghribi. The text
 * itself is never changed: joining the runs gives back the original string.
 *
 * Keep ALMAGHRIBI_MISSING in sync with the font:
 *   npx tsx scripts/almaghribi-preview/preview.ts   (lists the missing codepoints)
 */

/** Codepoints used by warshData_v10 that Almaghribi Warsh-Quran.otf has no glyph for. */
export const ALMAGHRIBI_MISSING = /[ےۖ۞۟ۥۦۨ۩۪]/;

export interface FontRun {
  text: string;
  /** true → render with the fallback font (KFGQPC Warsh) instead of Almaghribi. */
  fallback: boolean;
}

export function splitAlmaghribiRuns(text: string): FontRun[] {
  const runs: FontRun[] = [];
  for (const char of text) {
    const fallback = ALMAGHRIBI_MISSING.test(char);
    const last = runs[runs.length - 1];
    if (last && last.fallback === fallback) last.text += char;
    else runs.push({ text: char, fallback });
  }
  return runs;
}
