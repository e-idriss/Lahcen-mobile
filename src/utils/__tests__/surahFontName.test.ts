import { surahFontName } from '../surahFontName';

describe('surahFontName', () => {
  it('maps Tanzil spellings to the font ligature spelling', () => {
    expect(surahFontName('ابراهيم')).toBe('إبراهيم');
    expect(surahFontName('سبإ')).toBe('سبأ');
    expect(surahFontName('الانسان')).toBe('الإنسان');
    expect(surahFontName('النبإ')).toBe('النبأ');
  });

  it('uses the numeric ligature key for single-letter names', () => {
    expect(surahFontName('ص')).toBe('038');
    expect(surahFontName('ق')).toBe('050');
  });

  it('leaves names the font already matches unchanged', () => {
    expect(surahFontName('البقرة')).toBe('البقرة');
  });
});
