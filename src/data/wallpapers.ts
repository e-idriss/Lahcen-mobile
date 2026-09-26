/**
 * Wallpapers & presets configuration.
 *
 * Users can choose from default wallpapers, pick an image from their gallery,
 * and overlay any Quranic verse or Islamic phrase.
 */

import type { ImageSourcePropType } from 'react-native';

import { getAyahRange } from './database';

export interface WallpaperItem {
  id: string;
  titleAr: string;
  source: ImageSourcePropType;
  category: 'mosque' | 'nature' | 'minimal' | 'custom';
}

/**
 * A preset is a *reference* to scripture, never a copy of it.
 *
 * The Arabic text is loaded from `text_display` in the bundled database at
 * runtime (see `getPresetVerseText`). Retyping an ayah here would silently
 * produce a string that diverges from the one the reader shows — that is how
 * this file previously shipped truncated verses and Uthmani-only codepoints.
 *
 * A preset may span a range (`ayahEnd`), e.g. Ash-Sharh 5-6, which is joined
 * from the individual DB rows rather than concatenated by hand.
 */
export interface PresetVerse {
  id: string;
  surahNameAr: string;
  /** First ayah of the preset. */
  ayahNumber: number;
  /** Last ayah, when the preset spans more than one. Defaults to `ayahNumber`. */
  ayahEnd?: number;
  surahNumber: number;
}

export const DEFAULT_WALLPAPERS: WallpaperItem[] = [
  {
    id: 'wallpaper_1',
    titleAr: 'عمارة إسلامية',
    source: require('../../assets/images/wallpapers/wallpaper_1.jpg'),
    category: 'mosque',
  },
  {
    id: 'wallpaper_2',
    titleAr: 'سكينة المسجد',
    source: require('../../assets/images/wallpapers/wallpaper_2.jpg'),
    category: 'mosque',
  },
  {
    id: 'wallpaper_3',
    titleAr: 'أنوار إيمانية',
    source: require('../../assets/images/wallpapers/wallpaper_3.jpg'),
    category: 'mosque',
  },
  {
    id: 'wallpaper_4',
    titleAr: 'هلال ومئذنة',
    source: require('../../assets/images/wallpapers/wallpaper_4.jpg'),
    category: 'mosque',
  },
  {
    id: 'mosque_default',
    titleAr: 'جامع ومحراب',
    source: require('../../assets/images/mosque.jpg'),
    category: 'mosque',
  },
];

export const PRESET_VERSES: PresetVerse[] = [
  { id: 'ayat_kursi', surahNameAr: 'البقرة', ayahNumber: 255, surahNumber: 2 },
  { id: 'inshirah', surahNameAr: 'الشرح', ayahNumber: 5, ayahEnd: 6, surahNumber: 94 },
  { id: 'taha', surahNameAr: 'طه', ayahNumber: 114, surahNumber: 20 },
  { id: 'duha', surahNameAr: 'الضحى', ayahNumber: 5, surahNumber: 93 },
  { id: 'rad', surahNameAr: 'الرعد', ayahNumber: 28, surahNumber: 13 },
  { id: 'baqarah_end', surahNameAr: 'البقرة', ayahNumber: 286, surahNumber: 2 },
];

/** The ayah label for a preset: `255` for a single ayah, `5-6` for a range. */
export function presetAyahLabel(preset: PresetVerse): string {
  const end = preset.ayahEnd ?? preset.ayahNumber;
  return end === preset.ayahNumber ? `${preset.ayahNumber}` : `${preset.ayahNumber}-${end}`;
}

/**
 * Loads a preset's Arabic text from the bundled database.
 *
 * Multi-ayah presets are joined with a single space — the same separator the
 * reader uses between ayahs. No end-of-ayah marker (U+06DD) is inserted: that
 * glyph is a standalone medallion in the bundled font, and emitting it here
 * would render an empty circle mid-passage.
 */
export async function getPresetVerseText(preset: PresetVerse): Promise<string> {
  const ayahs = await getAyahRange(
    preset.surahNumber,
    preset.ayahNumber,
    preset.ayahEnd ?? preset.ayahNumber,
  );
  return ayahs.map((a) => a.text).join(' ');
}
