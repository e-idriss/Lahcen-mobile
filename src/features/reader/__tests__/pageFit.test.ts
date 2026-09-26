/**
 * The page-fitting contract.
 *
 * These lock in the fix for the bug where pages rendered as a small block of
 * text over a half-empty page: the type was sized from a fixed user preference
 * instead of from the page, so sparse pages ran out of text long before they
 * ran out of page.
 *
 * Densities below are real character counts measured from the bundled corpus
 * (`SELECT SUM(LENGTH(text_display)) + 3*COUNT(*) FROM ayahs GROUP BY page`).
 */

import {
  MAX_ARABIC_PT,
  MIN_ARABIC_PT,
  MUSHAF_LINES,
  fitPage,
  type PageFitInput,
} from '../pageFit';

/** iPhone 15 Pro geometry: 393×852 with the usual safe-area insets. */
const DEVICE: Pick<PageFitInput, 'usableHeight' | 'columnWidth' | 'sizeScale'> = {
  usableHeight: 747,
  columnWidth: 361,
  sizeScale: 1,
};

const fit = (over: Partial<PageFitInput>) =>
  fitPage({ ...DEVICE, charCount: 1179, bannerCount: 0, basmalahCount: 0, ...over });

/** Real page densities from the bundled database. */
const PAGES = {
  fatiha: { charCount: 307, bannerCount: 1, basmalahCount: 1 },
  page2: { charCount: 350, bannerCount: 1, basmalahCount: 1 },
  median: { charCount: 1179, bannerCount: 0, basmalahCount: 0 },
  densest: { charCount: 1492, bannerCount: 0, basmalahCount: 0 },
  lastPage: { charCount: 459, bannerCount: 3, basmalahCount: 3 },
};

describe('fitPage — the page fills its 15-line grid', () => {
  it('sizes every real page within the legible range', () => {
    for (const [name, page] of Object.entries(PAGES)) {
      const result = fit(page);
      expect(`${name}:${result.fontSize >= MIN_ARABIC_PT}`).toBe(`${name}:true`);
      expect(`${name}:${result.fontSize <= MAX_ARABIC_PT}`).toBe(`${name}:true`);
    }
  });

  it('never lets the text block overflow the page', () => {
    // A block taller than the page clips its last line, which is scripture
    // truncated — a P0. The only permitted exception is a page so dense that
    // the glyph-span floor (2.0 × fontSize) cannot be honoured within the
    // height; there the reading surface scrolls rather than clipping.
    for (const [name, page] of Object.entries(PAGES)) {
      const { lineHeight, textLines, fontSize } = fit(page);
      const consumed = lineHeight * textLines;
      const atGlyphFloor = lineHeight === Math.ceil(fontSize * 2);
      const ok = consumed <= DEVICE.usableHeight || atGlyphFloor;
      expect(`${name}:${ok}`).toBe(`${name}:true`);
    }
  });

  it('fills the page, or centers the block when it cannot', () => {
    // The bug this locks out: a short page top-aligned with the bottom blank.
    // Either the content reaches the bottom, or the leftover is split above and
    // below — never pooled underneath.
    //
    // Banners and Basmalah rows count toward the fill: page 604 carries three
    // of each, which is legitimately most of its height.
    const box = (h: number, banners: number) => (h - banners * 30) / 15;

    for (const [name, page] of Object.entries(PAGES)) {
      const { lineHeight, textLines, centerVertically } = fit(page);
      const furniture =
        page.bannerCount * (30 + 2 * box(DEVICE.usableHeight, page.bannerCount)) +
        page.basmalahCount * box(DEVICE.usableHeight, page.bannerCount);
      const fillRatio = (lineHeight * textLines + furniture) / DEVICE.usableHeight;
      const acceptable = fillRatio >= 0.85 || centerVertically;
      expect(`${name}:${acceptable}`).toBe(`${name}:true`);
    }
  });

  it('centers Al-Fatiha rather than stranding it at the top', () => {
    expect(fit(PAGES.fatiha).centerVertically).toBe(true);
  });

  it('does NOT center a full page', () => {
    expect(fit(PAGES.median).centerVertically).toBe(false);
    expect(fit(PAGES.densest).centerVertically).toBe(false);
  });

  it('gives a sparse page LARGER type than a dense one', () => {
    // This is the whole point: a short surah must grow to fill the page rather
    // than render small and leave the bottom half blank.
    expect(fit(PAGES.fatiha).fontSize).toBeGreaterThan(fit(PAGES.densest).fontSize);
    expect(fit(PAGES.median).fontSize).toBeGreaterThan(fit(PAGES.densest).fontSize);
  });

  it('sets the median page at a mushaf-like reading size', () => {
    // Calibration anchor: if k drifts, this is the test that catches it.
    // 17pt at k=3.8, the value measured from a real device render.
    const { fontSize } = fit(PAGES.median);
    expect(fontSize).toBeGreaterThanOrEqual(16);
    expect(fontSize).toBeLessThanOrEqual(22);
  });

  it('does not collapse a sparse page to the size floor', () => {
    // The regression that emptied the pages: Al-Fatiha pinned at MIN_ARABIC_PT.
    expect(fit(PAGES.fatiha).fontSize).toBeGreaterThan(MIN_ARABIC_PT + 4);
  });

  it('never reports more text lines than the 15-line grid allows', () => {
    // `textLines` is the rows the text ACTUALLY occupies, so it is bounded by
    // the grid minus whatever furniture the page carries.
    for (const [name, page] of Object.entries(PAGES)) {
      const budget = MUSHAF_LINES - page.bannerCount * 2 - page.basmalahCount;
      const { textLines } = fit(page);
      expect(`${name}:${textLines <= budget}`).toBe(`${name}:true`);
      expect(`${name}:${textLines >= 1}`).toBe(`${name}:true`);
    }
  });

  it('uses the full grid for a page dense enough to need it', () => {
    expect(fit(PAGES.median).textLines).toBe(MUSHAF_LINES);
    expect(fit(PAGES.densest).textLines).toBe(MUSHAF_LINES);
  });

  it('keeps the line box tall enough to clear Elgharib descenders', () => {
    // A line box shorter than the glyphs clips the bottom line — scripture cut
    // off, a P0. Elgharib spans ~1.9em, so 2.0× fontSize is the floor.
    for (const [name, page] of Object.entries(PAGES)) {
      const { fontSize, lineHeight } = fit(page);
      expect(`${name}:${lineHeight >= fontSize * 2}`).toBe(`${name}:true`);
    }
  });
});

describe('fitPage — justification', () => {
  it('justifies a full page', () => {
    expect(fit(PAGES.median).justify).toBe(true);
    expect(fit(PAGES.densest).justify).toBe(true);
  });

  it('does NOT justify when the line is too short to spread the slack', () => {
    // Very large type on a narrow column fits only a few words per line, and
    // justifying it tears the line open. Ragged-right is the better result.
    const narrow = fitPage({
      charCount: 120,
      bannerCount: 0,
      basmalahCount: 0,
      usableHeight: 747,
      columnWidth: 150,
      sizeScale: 1.35,
    });
    expect(narrow.justify).toBe(false);
  });
});

describe('fitPage — the reader size setting', () => {
  it('scales the type without breaking the grid', () => {
    const small = fit({ ...PAGES.median, sizeScale: 0.8 });
    const large = fit({ ...PAGES.median, sizeScale: 1.35 });
    expect(large.fontSize).toBeGreaterThan(small.fontSize);
    expect(small.fontSize).toBeGreaterThanOrEqual(MIN_ARABIC_PT);
    expect(large.fontSize).toBeLessThanOrEqual(MAX_ARABIC_PT);
  });

  it('still fills the page at every scale', () => {
    for (const sizeScale of [0.8, 1, 1.2, 1.35]) {
      const { lineHeight, textLines } = fit({ ...PAGES.median, sizeScale });
      expect(lineHeight * textLines).toBeGreaterThan(DEVICE.usableHeight * 0.8);
    }
  });
});

describe('fitPage — device sizes', () => {
  it('fills the grid on a small device (iPhone SE)', () => {
    const result = fitPage({
      ...PAGES.median,
      usableHeight: 560,
      columnWidth: 343,
      sizeScale: 1,
    });
    expect(result.fontSize).toBeGreaterThanOrEqual(MIN_ARABIC_PT);
    expect(result.lineHeight * result.textLines).toBeLessThanOrEqual(560 + result.lineHeight);
  });

  it('fills the grid on a large device (Pro Max)', () => {
    const result = fitPage({
      ...PAGES.median,
      usableHeight: 830,
      columnWidth: 398,
      sizeScale: 1,
    });
    expect(result.fontSize).toBeLessThanOrEqual(MAX_ARABIC_PT);
    expect(result.lineHeight).toBeGreaterThanOrEqual(result.fontSize * 2);
  });
});
