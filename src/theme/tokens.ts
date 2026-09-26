/**
 * Design tokens — the single source of truth for the visual system.
 *
 * Never hardcode a colour, radius or spacing value in a component. If a value
 * is missing here, add it here rather than inlining it (see CLAUDE.md).
 */

export const palette = {
  light: {
    bg: '#FFEED6', // warm cream paper
    surface: '#FFF9F0', // raised card parchment
    surfaceSunk: '#F5E3C7', // wells, search bar
    border: '#E4CFB2', // hairlines
    textPrimary: '#2D2619', // near-black, warm charcoal-brown
    textSecond: '#6E624E', // metadata
    textMuted: '#9C8F79', // ayah numbers, hints
    accent: '#827148', // earthy golden olive — primary action/state
    accentSoft: '#EDF1E2', // soft sage wash for selection
    gold: '#827148', // antique gold ornament
    goldSoft: '#DECFA9', // soft gold hairline
    sage: '#A5AF79', // herbaceous sage green
    sageSoft: '#EAF0DB', // soft sage badge
    terracotta: '#E8A07C', // warm terracotta highlight
    terracottaSoft: '#FDEEE7', // soft terracotta badge
    overlayScrim: 'rgba(30, 24, 16, 0.45)', // mosque image overlay
  },
  dark: {
    bg: '#151310', // warm near-black obsidian
    surface: '#211E18', // raised surface
    surfaceSunk: '#1A1713', // wells
    border: '#363025', // hairlines
    textPrimary: '#FFEED6', // warm cream text
    textSecond: '#C2B59F', // warm metadata
    textMuted: '#827763', // muted hints
    accent: '#A5AF79', // luminous sage green
    accentSoft: '#2C3320', // dark sage wash
    gold: '#D6B46F', // radiant antique gold
    goldSoft: '#3E3420', // dark gold outline
    sage: '#A5AF79',
    sageSoft: '#28301D',
    terracotta: '#E8A07C',
    terracottaSoft: '#3D251C',
    overlayScrim: 'rgba(0, 0, 0, 0.65)',
  },
  sepia: {
    bg: '#F7EAD7',
    surface: '#FCF4E8',
    surfaceSunk: '#EED8BE',
    border: '#DDC5A6',
    textPrimary: '#382C1B',
    textSecond: '#735E44',
    textMuted: '#9C876D',
    accent: '#827148',
    accentSoft: '#ECE0CA',
    gold: '#827148',
    goldSoft: '#DFCEAB',
    sage: '#A5AF79',
    sageSoft: '#E6ECCF',
    terracotta: '#E8A07C',
    terracottaSoft: '#FBEAE2',
    overlayScrim: 'rgba(30, 24, 16, 0.45)',
  },
} as const;

export type ThemeName = keyof typeof palette;
export type Colors = (typeof palette)[ThemeName];

/** 4pt base scale. No arbitrary spacing values anywhere in the app. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 999,
} as const;

/** Latin UI type scale. Arabic type is handled separately — see `arabic`. */
export const type = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

export const fonts = {
  /** Primary default font for normal UI text and Arabic typography */
  default: 'ThmanyahRegular',
  defaultMedium: 'ThmanyahMedium',
  defaultBold: 'ThmanyahBold',
  defaultLight: 'ThmanyahLight',
  /** Uthmani Quran font (Hafs). Ayah text ONLY. Never apply a fontWeight to it. */
  quran: 'Elgharib',
  /** Maghribi Quran font (Warsh). Ayah text ONLY. Never apply a fontWeight to it. */
  quranWarsh: 'WarshUthmanic',
  quranWarshAlmaghribi: 'AlmaghribiWarsh-Quran',
  /** Codepoints Almaghribi lacks (see features/reader/almaghribiRuns.ts). */
  quranWarshAlmaghribiFallback: 'KFGQPC_WARSH_Uthmanic_Script_H',
  /** Decorative surah names ONLY. Never for UI labels or body copy. */
  surahName: 'QurraanSora',
  /**
   * Dingbat-style font: feed it ONLY the ligature keys "1".."12" (see
   * `getHijriToday` in `utils/hijriDate.ts`) to render the illuminated Hijri
   * month name. Any other text renders nothing.
   */
  hijriMonth: 'ElgharibHijriMonths',
  /**
   * Dingbat-style font: feed it ONLY the ligature keys "1".."7" (1 = Sunday)
   * to render the illuminated weekday name. Any other text renders nothing.
   */
  hijriWeekday: 'ElgharibDaysOfWeek',
  /**
   * Calligraphic prayer names: ligature keys "3".."7" for Fajr, Dhuhr, Asr, Maghrib, Isha.
   */
  prayers: 'ElgharibPrayers',
} as const;

/**
 * Elgharib's own vertical metrics, read from the font:
 *   upem 2048, hhea/typo ascent 2500, descent −1400, lineGap 497
 *   → glyph span (2500 + 1400) / 2048 = 1.904 em
 *   → with lineGap                     = 2.147 em
 *
 * The line box must not be shorter than the glyphs it holds, or the bottom line
 * of a page is clipped mid-glyph — scripture cut off, a P0. 2.15 covers the
 * full span including the gap.
 *
 * ⚠️ Do NOT lower this to tighten the page. It was set to 1.95 to make the text
 * denser and immediately clipped the last line of every full page.
 */
export const ARABIC_LINE_HEIGHT_RATIO = 2.15;
export const SURAH_NAME_LINE_HEIGHT_RATIO = 1.4;

/**
 * Lines per mushaf page.
 *
 * Every printed mushaf in the Madani tradition sets exactly 15 lines per page,
 * which is why page breaks are identical across copies. The reader derives its
 * line height from the page height divided by this, then sizes the type to fit
 * — so pages fill completely, never scroll, and never clip.
 */
export const MUSHAF_LINES_PER_PAGE = 15;

/**
 * Estimator constant `k` in: charactersPerLine ≈ (columnWidth × k) / fontSize.
 *
 * Derived from the words-per-line constraint this file already documents for
 * `ARABIC_FONT_SIZE.default`: ~19pt on a ~360pt column fits 6–9 words/line,
 * and an average Arabic word (with diacritics and its trailing space) is
 * roughly 5.5 characters — so ~33–50 characters/line, giving k ≈ 1.74–2.61.
 * Set to 2.0, the middle of that range.
 *
 * This estimate replaces a live measure-and-shrink loop: measuring
 * `onTextLayout` on every mounted page and reacting to it caused FlashList to
 * remeasure each page's item box on every shrink pass, which compounded
 * across the several pages FlashList keeps mounted at once into a "Maximum
 * update depth exceeded" crash (each page's shrink triggered FlashList's own
 * re-layout, which re-rendered pages, which re-measured and shrank again). A
 * single arithmetic estimate has no such feedback loop.
 *
 * Justification stretches inter-word spaces, so real wrapping varies with
 * where breaks fall — this is an ESTIMATE, and `MushafPage`'s `minHeight`
 * (never a clip) is the safety net if it undershoots.
 *
 * Recalibrate if the font or column width changes: render the densest page
 * (552 characters), read its actual characters-per-line at its grid font
 * size, and solve for k.
 */
export const ARABIC_CHAR_WIDTH_RATIO = 2.0;


/**
 * User-adjustable reading size for ayah text.
 *
 * The default is deliberately modest: justification only looks like a printed
 * mushaf when enough words fit per line for the justifier to distribute slack.
 * At 28pt on a ~360pt text column only 3–4 words fit, which tears open ragged
 * gaps between words. At 19pt roughly 6–8 words fit, matching a real mushaf.
 */
export const ARABIC_FONT_SIZE = {
  min: 16,
  max: 40,
  default: 19,
  step: 1,
} as const;

export const arabicTextStyle = (fontSize: number, riwaya: 'hafs' | 'warsh' = 'hafs') => ({
  fontFamily: riwaya === 'warsh' ? fonts.quranWarsh : fonts.quran,
  fontSize,
  // Warsh (Almaghribi) requires a higher line height ratio (2.45) due to deeper descender dots (e.g. Yaa, Faa).
  lineHeight: Math.ceil(fontSize * (riwaya === 'warsh' ? 2.45 : ARABIC_LINE_HEIGHT_RATIO)),
  writingDirection: 'rtl' as const,
  textAlign: 'right' as const,
});

export const duration = {
  fast: 150,
  base: 220,
  slow: 300,
} as const;

/** Minimum touch target per the accessibility rules. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH_TARGET = 44;

/**
 * Explicit RTL styling for plain Arabic UI chrome (labels, badges, titles) —
 * anything that isn't ayah text (which goes through `arabicTextStyle`).
 * Relying on implicit Unicode bidi breaks as soon as a string mixes Arabic
 * with digits or punctuation (e.g. a page badge), so this is applied
 * explicitly rather than left to the OS.
 */
export const rtlText = {
  fontFamily: fonts.default,
  writingDirection: 'rtl' as const,
  textAlign: 'right' as const,
};

export const rtlTextCenter = {
  fontFamily: fonts.default,
  writingDirection: 'rtl' as const,
  textAlign: 'center' as const,
};
