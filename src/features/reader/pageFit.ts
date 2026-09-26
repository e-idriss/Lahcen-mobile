/**
 * Fits one mushaf page's text to the 15-line grid.
 *
 * A mushaf page is a filled block of text, top to bottom — never a short
 * paragraph floating in white space. So the derivation runs in the INVERSE of
 * the usual direction:
 *
 *   1. The line box comes from the PAGE:  lineHeight = usableHeight / 15
 *   2. The font size comes from the LINE BOX and this page's density.
 *
 * Sizing from a fixed user font size instead left sparse pages — Al-Fatiha
 * above all — with the bottom half blank, because a fixed size runs out of text
 * before it runs out of page. Density ranges from ~300 to ~1500 characters per
 * page, so the type MUST be sized per page for every page to fill its 15 lines.
 *
 * Pure on purpose: this is the part worth unit-testing, and it is covered by
 * `__tests__/pageFit.test.ts` against real page densities from the corpus.
 */

/** Every printed mushaf in the Madani tradition sets exactly 15 lines per page. */
export const MUSHAF_LINES = 15;

/**
 * Elgharib spans (2500 + 1400) / 2048 ≈ 1.9em, so the line box must be at least
 * that or the bottom line is clipped mid-glyph — scripture cut off, a P0.
 */
export const LINE_HEIGHT_RATIO = 2.0;

/**
 * Ceiling on leading when a sparse page's lines are stretched to fill the page.
 *
 * Without a cap, a very short page would space its handful of lines across the
 * whole height and read as disconnected floating words. 3.2× keeps even the
 * airiest page reading as a set block of text.
 */
export const MAX_LINE_HEIGHT_RATIO = 3.2;

/**
 * Below this fraction of the page filled, the block is centered vertically
 * rather than top-aligned — the leftover space is split above and below instead
 * of pooling at the bottom, which is what reads as an unfinished page.
 */
export const CENTER_BELOW_FILL_RATIO = 0.92;

/** A surah banner eats roughly two grid lines of vertical space. */
export const BANNER_LINE_COST = 2;

/** Ornament rows above/below the banner sit outside the 15-line text budget. */
export const BANNER_EXTRA_PX = 30;

/** The ayah medallion occupies about as much line width as three characters. */
export const AYAH_MARKER_CHAR_COST = 3;

/**
 * `k` in: charactersPerLine ≈ (columnWidth × k) / fontSize.
 *
 * Calibrated against the real corpus, not estimated: across all 604 pages the
 * MEDIAN page holds 1179 characters (counting the medallion cost), which over
 * the mandatory 15 lines is ~79 characters per line. Solving at a mushaf-like
 * 20pt on this app's ~361pt column:
 *
 *     k = 79 × 20 / 361 ≈ 4.3
 *
 * ⚠️ But 4.3 OVERPREDICTS how much text fits, because it is derived from a
 * corpus average rather than from measured glyphs. Calibrating instead against
 * a real render on device — Al-Fatiha at 24pt on a 361pt column fitting 57 and
 * 44 characters on its first two lines — gives k ≈ 2.9–3.8. Overpredicting
 * sizes the type too large, so the final line of a paragraph is left with a
 * few words stretched across the full width: the torn line CLAUDE.md rejects.
 *
 * 3.8 sits inside the measured range and balances the two failure modes: too
 * low and every page pins to the 15pt floor and reads tiny; too high and the
 * type grows until the final line tears. At 3.8 the median page sets ~17pt with
 * ~15 words per line, and Al-Fatiha ~24pt with ~10 — both clear of tearing.
 *
 * ⚠️ This was 2.0 originally, which is the bug that emptied the pages: at 2.0
 * the formula demanded ~12pt for an ordinary page, hit the size floor, and left
 * every page short of its 15 lines.
 *
 * Recalibrate against a REAL RENDER if the font or column width changes: screenshot
 * a page, count the characters on a full line, and solve k = chars × fontSize / column.
 */
export const ARABIC_CHAR_WIDTH_RATIO = 3.8;

/**
 * Bounds on the per-page type size. The floor keeps the densest pages legible;
 * the ceiling stops Al-Fatiha and the short mufassal surahs from ballooning to
 * absurd display sizes just because they have room.
 */
export const MIN_ARABIC_PT = 15;
export const MAX_ARABIC_PT = 30;

/** Mean length of an Arabic word with its diacritics and trailing space. */
export const AVG_ARABIC_WORD_CHARS = 5.5;

/**
 * Below this, justification tears the line open instead of tightening it.
 *
 * Measured against a real render, not guessed: Al-Fatiha justified at 24pt left
 * a line reading `نَسْتَعِينُ ٥ اهْدِنَا الصِّرَاطَ` — three words stretched across
 * the full column with gaps wide enough to break the line visually.
 *
 * The count must clear the threshold with margin because iOS justifies the
 * FINAL line of a paragraph too, and that line carries only the remainder after
 * wrapping — always the fewest words on the page, and always where tearing
 * shows first. 8 keeps even that remainder line tight.
 */
export const MIN_WORDS_PER_LINE_TO_JUSTIFY = 8;

export interface PageFitInput {
  /** Total characters of ayah text on the page, medallion cost included. */
  charCount: number;
  /** Surah banners rendered on this page. */
  bannerCount: number;
  /** Standalone centered Basmalah rows on this page. */
  basmalahCount: number;
  /** Page height minus safe-area padding. */
  usableHeight: number;
  /** Text column width, i.e. page width minus horizontal padding. */
  columnWidth: number;
  /** Reader's size preference as a multiplier on the grid-derived size. */
  sizeScale: number;
}

export interface PageFit {
  fontSize: number;
  lineHeight: number;
  /** False when the page is too sparse to justify without tearing. */
  justify: boolean;
  /** Grid rows the text actually occupies at `fontSize`. */
  textLines: number;
  /**
   * True when the block still cannot reach the bottom even with stretched
   * leading, so it should be centered vertically rather than top-aligned.
   *
   * This is what a printed mushaf does with Al-Fatiha: the short opening page
   * is set as a centered block, not pushed to the top with the remainder left
   * blank underneath. Top-aligning it is what makes the page look unfinished.
   */
  centerVertically: boolean;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function fitPage({
  charCount,
  bannerCount,
  basmalahCount,
  usableHeight,
  columnWidth,
  sizeScale,
}: PageFitInput): PageFit {
  // Banners and standalone Basmalah rows consume grid lines too, so they come
  // out of the same 15 before the text is fitted.
  const bannerLines = bannerCount * BANNER_LINE_COST;
  const textLines = Math.max(MUSHAF_LINES - bannerLines - basmalahCount, 1);

  // 1. Line box from the page.
  const box = (usableHeight - bannerCount * BANNER_EXTRA_PX) / MUSHAF_LINES;

  // 2. Font size that makes this page's characters fill exactly `textLines`.
  //    charsPerLine ≈ (columnWidth × k) / fontSize  →  solve for fontSize.
  const charsPerLine = Math.max(charCount / textLines, 1);
  const densityFontSize = (columnWidth * ARABIC_CHAR_WIDTH_RATIO) / charsPerLine;

  // The line box is the ceiling: type may never grow taller than its grid row,
  // or the page overflows. Sparse pages cap here instead of ballooning.
  const boxFontSize = box / LINE_HEIGHT_RATIO;

  const raw = Math.min(densityFontSize, boxFontSize) * sizeScale;
  const fontSize = Math.round(clamp(raw, MIN_ARABIC_PT, MAX_ARABIC_PT));

  /**
   * How many lines the text ACTUALLY occupies at the size we settled on.
   *
   * This is not always `textLines`: when the size ceiling binds — a short surah
   * like Al-Fatiha, which would need absurd display type to fill 12 rows — the
   * text wraps into fewer lines than the grid offers. Assuming it filled the
   * grid is what left the bottom of the page blank.
   */
  const actualCharsPerLine = (columnWidth * ARABIC_CHAR_WIDTH_RATIO) / fontSize;
  const usedLines = clamp(Math.ceil(charCount / actualCharsPerLine), 1, textLines);

  /**
   * Spread the leftover height across the lines the text actually uses, so the
   * block reaches the bottom of the page instead of pooling empty space there.
   *
   * A printed mushaf never leaves half a page blank: sparse pages are set with
   * open, airy leading, not a short paragraph stranded under a banner. Capped
   * so the leading stays typographic rather than becoming double-spacing.
   */
  const availableForText =
    usableHeight -
    bannerCount * (BANNER_EXTRA_PX + BANNER_LINE_COST * box) -
    basmalahCount * box;
  const stretched = availableForText / usedLines;
  const minLineHeight = Math.ceil(fontSize * LINE_HEIGHT_RATIO);

  /**
   * FLOOR, never round: `lineHeight × usedLines` must not exceed the space the
   * text has. Rounding up overflows the page by a few points, and on a full
   * 15-line page that clips the final line — scripture truncated, a P0.
   *
   * The `minLineHeight` floor still wins if flooring would put the line box
   * under the glyph span; in that case the page is genuinely too dense for the
   * device and the reading surface scrolls as the safety valve.
   */
  const lineHeight = Math.max(
    Math.floor(clamp(stretched, minLineHeight, fontSize * MAX_LINE_HEIGHT_RATIO)),
    minLineHeight,
  );

  /**
   * Justify only when the line holds enough words to spread the slack.
   *
   * iOS justifies by stretching inter-word spaces only — printed mushafs use
   * kashida, which RN's `Text` cannot reach. Total slack per line is fixed, so
   * the fewer the words, the wider each gap opens. Below ~5 words the line
   * visibly tears, which looks far worse than a ragged edge. Short surahs
   * legitimately fall under that, so they set ragged-right instead.
   */
  const wordsPerLine = actualCharsPerLine / AVG_ARABIC_WORD_CHARS;

  // If even stretched leading leaves a visible gap, center the block instead of
  // stranding it at the top of the page.
  const filledHeight =
    lineHeight * usedLines +
    bannerCount * (BANNER_EXTRA_PX + BANNER_LINE_COST * box) +
    basmalahCount * box;

  return {
    fontSize,
    lineHeight,
    justify: wordsPerLine >= MIN_WORDS_PER_LINE_TO_JUSTIFY,
    textLines: usedLines,
    centerVertically: filledHeight < usableHeight * CENTER_BELOW_FILL_RATIO,
  };
}
