/**
 * Gradient stops are derived from theme tokens, so a parsing slip would show
 * up as a visible seam between an image and the page background — exactly the
 * bug this helper was written to remove.
 */

import { hexToRgb, withAlpha } from '../color';

describe('hexToRgb', () => {
  it('parses the real theme background tokens', () => {
    expect(hexToRgb('#FFEED6')).toEqual([255, 238, 214]); // light
    expect(hexToRgb('#151310')).toEqual([21, 19, 16]); // dark
    expect(hexToRgb('#F7EAD7')).toEqual([247, 234, 215]); // sepia
  });

  it('accepts shorthand and a missing hash', () => {
    expect(hexToRgb('#abc')).toEqual([170, 187, 204]);
    expect(hexToRgb('FFEED6')).toEqual([255, 238, 214]);
  });

  it('is case-insensitive', () => {
    expect(hexToRgb('#ffeed6')).toEqual(hexToRgb('#FFEED6'));
  });

  it('falls back to black instead of throwing inside a render', () => {
    expect(hexToRgb('')).toEqual([0, 0, 0]);
    expect(hexToRgb('nonsense')).toEqual([0, 0, 0]);
    expect(hexToRgb('#GGGGGG')).toEqual([0, 0, 0]);
    expect(hexToRgb('#12345')).toEqual([0, 0, 0]);
  });
});

describe('withAlpha', () => {
  it('builds an rgba string from a token', () => {
    expect(withAlpha('#FFEED6', 0)).toBe('rgba(255, 238, 214, 0)');
    expect(withAlpha('#FFEED6', 0.5)).toBe('rgba(255, 238, 214, 0.5)');
  });

  it('ends fully opaque on the token itself — the stop that removes the seam', () => {
    expect(withAlpha('#FFEED6', 1)).toBe('rgba(255, 238, 214, 1)');
  });

  it('clamps out-of-range alpha', () => {
    expect(withAlpha('#000000', -1)).toBe('rgba(0, 0, 0, 0)');
    expect(withAlpha('#000000', 5)).toBe('rgba(0, 0, 0, 1)');
  });
});
