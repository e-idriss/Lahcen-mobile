/**
 * Spelling that `fonts.surahName` (QurraanSora) needs to draw a surah name as
 * its calligraphic ligature.
 *
 * The font only styles a name whose letters match its GSUB ligature exactly;
 * anything else falls back to plain letters. Tanzil spells a few names
 * differently from the font (e.g. ابراهيم vs إبراهيم), and ص / ق have no
 * Arabic ligature at all — only the numeric key ("038", "050").
 *
 * Use ONLY for text rendered in `fonts.surahName`. Search and plain-text UI
 * keep the database spelling.
 */
const FONT_SPELLING: Record<string, string> = {
  ابراهيم: 'إبراهيم',
  سبإ: 'سبأ',
  الانسان: 'الإنسان',
  النبإ: 'النبأ',
  ص: '038',
  ق: '050',
};

export function surahFontName(nameAr: string): string {
  return FONT_SPELLING[nameAr] ?? nameAr;
}
