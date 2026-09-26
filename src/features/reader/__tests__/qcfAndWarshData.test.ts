import { buildQcfPageLayout, type SurahMetaHeader } from '../qcfDataService';
import { getQcfFontFamily, getQcfFontUrl } from '../qcfFontLoader';
import { buildWarshPageLayout } from '../warshDataService';
import type { PageAyah } from '../../../data/database';

describe('QCF Font and Data Services', () => {
  describe('getQcfFontFamily and getQcfFontUrl', () => {
    it('formats font family name to match PostScript name QCF2001..QCF2604', () => {
      expect(getQcfFontFamily(1)).toBe('QCF2001');
      expect(getQcfFontFamily(45)).toBe('QCF2045');
      expect(getQcfFontFamily(604)).toBe('QCF2604');
    });

    it('generates valid v2 CDN url', () => {
      expect(getQcfFontUrl(1)).toContain('/v2/');
      expect(getQcfFontUrl(604)).toContain('/v2/');
    });
  });

  describe('buildQcfPageLayout', () => {
    it('creates 8 lines for opening page 1 & 2', () => {
      const metaMap = new Map<number, SurahMetaHeader>([
        [
          1,
          {
            surahNumber: 1,
            nameAr: 'الفاتحة',
            nameEn: 'Al-Fatihah',
            revelation: 'Meccan',
            ayahCount: 7,
          },
        ],
      ]);

      const mockVerses = [
        {
          verse_key: '1:1',
          words: [
            { id: 1, line_number: 2, text_uthmani: 'بسم الله', code_v2: 'ﱁ', position: 1 },
          ],
        },
      ];

      const layout = buildQcfPageLayout(1, mockVerses, metaMap);

      expect(layout.lines).toHaveLength(8);
      expect(layout.lines[0].type).toBe('surah_header');
    });

    it('creates exactly 15 lines for standard page layout', () => {
      const metaMap = new Map<number, SurahMetaHeader>([
        [
          2,
          {
            surahNumber: 2,
            nameAr: 'البقرة',
            nameEn: 'Al-Baqarah',
            revelation: 'Medinan',
            ayahCount: 286,
          },
        ],
      ]);

      const mockVerses = [
        {
          verse_key: '2:6',
          words: [
            { id: 1, line_number: 1, text_uthmani: 'إِنَّ', code_v2: 'ﱁ', position: 1 },
          ],
        },
      ];

      const layout = buildQcfPageLayout(3, mockVerses, metaMap);

      expect(layout.lines).toHaveLength(15);
      expect(layout.lines[0].type).toBe('text');
    });
  });

  describe('buildWarshPageLayout', () => {
    it('creates 8 lines for opening pages and 15 lines for standard pages', () => {
      const mockAyahs: PageAyah[] = [
        {
          id: 1,
          surah: 1,
          ayah: 1,
          page: 1,
          lineStart: 3,
          lineEnd: 3,
          text: 'الحمد لله رب العالمين',
          translation: 'Praise be to Allah',
          hasBasmalah: false,
          surahHeader: {
            nameAr: 'الفاتحة',
            nameEn: 'Al-Fatihah',
            revelation: 'Meccan',
            ayahCount: 7,
          },
        },
      ];

      const layoutP1 = buildWarshPageLayout(1, mockAyahs);
      expect(layoutP1.lines).toHaveLength(8);
      expect(layoutP1.lines[0].type).toBe('surah_header');

      const layoutP3 = buildWarshPageLayout(3, mockAyahs);
      expect(layoutP3.lines).toHaveLength(15);
    });
  });
});
