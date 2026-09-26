/**
 * Mushaf Page Component.
 *
 * Fixed Grid Mushaf Page renderer supporting:
 * - Pages 1 & 2: Authentic 8-line illuminated oval/elliptical medallion layout (Al-Fatihah & Al-Baqarah 1-5)
 * - Pages 3 to 604: Authentic 15-line grid with 100% UNIFORM font size across all lines & true margin-to-margin justification
 * - Zero empty left gaps (space-between edge-to-edge word distribution)
 * - Hafs (QCF v2 / Elgharib) and Warsh (Official King Fahd Complex WarshUthmanic)
 */

import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PageAyah } from '../../data/database';
import { splitAlmaghribiRuns } from '../../features/reader/almaghribiRuns';
import type { QcfPageLayout } from '../../features/reader/qcfDataService';
import { getArabicBaseGlyphCount, type WarshPageLayout } from '../../features/reader/warshDataService';
import { useSettings } from '../../store/settings';
import { useTheme } from '../../theme/ThemeProvider';
import { ARABIC_FONT_SIZE, fonts, radius } from '../../theme/tokens';
import { toArabicDigits } from '../../utils/arabicDigits';
import { MushafFrame } from './MushafFrame';
import { surahFontName } from '../../utils/surahFontName';

interface Props {
  page: number;
  width: number;
  height: number;
  riwaya: 'hafs' | 'warsh';
  juzNumber: number;
  hizbNumber: number;
  surahNameAr: string;
  qcfFontFamily: string;
  isQcfFontLoaded: boolean;
  qcfLayout: QcfPageLayout | null;
  warshLayout: WarshPageLayout | null;
  rawAyahs: PageAyah[];
  basmalahText: string;
  onSelectAyah: (position: { surah: number; ayah: number; page: number }) => void;
  onToggleHeader: () => void;
  isBookmarked?: boolean;
  /** Ayah the reader just tapped on this page (null when it is on another page). */
  selectedAyah?: { surah: number; ayah: number } | null;
  /** Saved stopping point, when it falls on this page. */
  savedAyah?: { surah: number; ayah: number } | null;
}

const isAyah = (pos: { surah: number; ayah: number } | null | undefined, surah: number, ayah: number) =>
  pos != null && pos.surah === surah && pos.ayah === ayah;

const MIN_SIZE_SCALE = 0.8;
const MAX_SIZE_SCALE = 1.25;

function MushafPageComponent({
  page,
  width,
  height,
  riwaya,
  qcfFontFamily,
  isQcfFontLoaded,
  qcfLayout,
  warshLayout,
  rawAyahs,
  basmalahText,
  onSelectAyah,
  onToggleHeader,
  isBookmarked = false,
  selectedAyah = null,
  savedAyah = null,
}: Props) {
  const { colors } = useTheme();

  const highlightFor = (surah: number, ayah: number) =>
    isAyah(selectedAyah, surah, ayah)
      ? colors.accentSoft
      : isAyah(savedAyah, surah, ayah)
        ? colors.goldSoft
        : undefined;

  const userFontSize = useSettings((s) => s.arabicFontSize);
  const warshFont = useSettings((s) => s.warshFont);
  const sizeScale = Math.min(
    Math.max(userFontSize / ARABIC_FONT_SIZE.default, MIN_SIZE_SCALE),
    MAX_SIZE_SCALE,
  );

  const isOpeningPage = page === 1 || page === 2;
  const isWarsh = riwaya === 'warsh';

  // Exact 15-line grid common to all standard pages (8 lines for opening pages)
  const lineCount = isOpeningPage ? 8 : 15;
  const frameVerticalSpacing = isOpeningPage ? Math.round(height * 0.40) : 24;
  const availableContentHeight = Math.max(280, height - frameVerticalSpacing);
  const lineBoxHeight = Math.floor(availableContentHeight / lineCount);

  // 100% UNIFORM, COMMON, IDENTICAL FONT SIZE ACROSS ALL 604 PAGES (Safe & Border-Guaranteed)
  const uniformPageFontSize = isOpeningPage
    ? Math.floor(lineBoxHeight * 0.50)
    : Math.floor(lineBoxHeight * 0.44);

  return (
    <Pressable onPress={onToggleHeader} style={{ width, height, backgroundColor: colors.bg }}>
      <MushafFrame width={width} height={height} page={page} isBookmarked={isBookmarked}>
        {/* Render Mode 1: Warsh Grid (100% UNIFORM font size across all lines, zero left gaps) */}
        {isWarsh && warshLayout ? (
          <View style={[styles.gridContainer, isOpeningPage && styles.openingGridContainer]}>
            {warshLayout.lines.map((line, idx) => {
              // Calculate elliptical width factor for opening pages (arch at top/bottom, widest in center)
              const normY = isOpeningPage ? (idx - 3.5) / 3.5 : 0;
              const ellipseFactor = isOpeningPage
                ? Math.sqrt(Math.max(0.3, 1 - Math.pow(normY * 0.68, 2)))
                : 1;

              if (line.type === 'surah_header') {
                return (
                  <View
                    key={`line-${idx}`}
                    style={[
                      styles.lineBox,
                      {
                        height: lineBoxHeight,
                        width: isOpeningPage ? `${Math.round(ellipseFactor * 82)}%` : '100%',
                        alignSelf: 'center',
                      },
                    ]}
                  >
                    <SurahBanner
                      nameAr={line.surah.nameAr}
                      ayahCount={line.surah.ayahCount}
                      revelation={line.surah.revelation}
                      gold={colors.gold}
                      textColor={colors.textPrimary}
                      fillColor={isOpeningPage ? 'transparent' : colors.surfaceSunk}
                      bannerHeight={lineBoxHeight}
                    />
                  </View>
                );
              }

              if (line.type === 'basmalah') {
                return (
                  <View
                    key={`line-${idx}`}
                    style={[
                      styles.lineBox,
                      styles.centeredLine,
                      {
                        height: lineBoxHeight,
                        width: isOpeningPage ? `${Math.round(ellipseFactor * 90)}%` : '100%',
                        alignSelf: 'center',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.basmalahText,
                        {
                          fontFamily: warshFont === 'almaghribi' ? fonts.quranWarshAlmaghribi : fonts.quranWarsh,
                          fontSize: Math.round(uniformPageFontSize * (isOpeningPage ? 1.05 : 0.95)),
                          color: colors.gold,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      allowFontScaling={false}
                    >
                      {basmalahText || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'}
                    </Text>
                  </View>
                );
              }

              // Warsh Text Line: 100% Margin-to-margin edge justification with uniform padding across all pages
              const nextWarshLine = warshLayout.lines[idx + 1];
              const isEndOfWarshSurah = !nextWarshLine || nextWarshLine.type === 'surah_header';
              const isWarshCentered =
                isOpeningPage ||
                (isEndOfWarshSurah && line.words.length <= 5) ||
                line.words.length <= 3;

              return (
                <View
                  key={`line-${idx}`}
                  style={[
                    styles.lineBox,
                    {
                      height: lineBoxHeight,
                      width: isOpeningPage ? `${Math.round(ellipseFactor * 100)}%` : '100%',
                      alignSelf: 'center',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.wordsRow,
                      {
                        justifyContent: isWarshCentered ? 'center' : 'space-between',
                        gap: isWarshCentered ? 6 : 0,
                      },
                    ]}
                  >
                    {line.words.map((item) => {
                      const isHizbMark = item.text === '۞' || item.text.startsWith('۞');
                      return (
                        <Text
                          key={item.id}
                          onPress={() => onSelectAyah({ surah: item.surahNumber, ayah: item.ayahNumber, page })}
                          style={[
                            styles.wordText,
                            {
                              backgroundColor: highlightFor(item.surahNumber, item.ayahNumber),
                              fontFamily: warshFont === 'almaghribi' ? fonts.quranWarshAlmaghribi : fonts.quranWarsh,
                              fontSize: isHizbMark
                                ? Math.round(uniformPageFontSize * 1.1)
                                : item.isEnd
                                  ? Math.round(uniformPageFontSize * 0.88)
                                  : uniformPageFontSize,
                              color: isHizbMark || item.isEnd ? colors.gold : colors.textPrimary,
                            },
                          ]}
                          allowFontScaling={false}
                        >
                          {warshFont === 'almaghribi'
                            ? splitAlmaghribiRuns(item.text).map((run, runIdx) =>
                                run.fallback ? (
                                  <Text key={runIdx} style={styles.almaghribiFallback}>
                                    {run.text}
                                  </Text>
                                ) : (
                                  run.text
                                ),
                              )
                            : item.text}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        ) : qcfLayout && qcfLayout.lines && isQcfFontLoaded ? (
          /* Render Mode 2: Hafs QCF Grid (100% UNIFORM font size across all lines, zero left gaps) */
          <View style={[styles.gridContainer, isOpeningPage && styles.openingGridContainer]}>
            {qcfLayout.lines.map((line, idx) => {
              const normY = isOpeningPage ? (idx - 3.5) / 3.5 : 0;
              const ellipseFactor = isOpeningPage
                ? Math.sqrt(Math.max(0.3, 1 - Math.pow(normY * 0.68, 2)))
                : 1;

              if (line.type === 'surah_header') {
                return (
                  <View
                    key={`line-${idx}`}
                    style={[
                      styles.lineBox,
                      {
                        height: lineBoxHeight,
                        width: isOpeningPage ? `${Math.round(ellipseFactor * 82)}%` : '100%',
                        alignSelf: 'center',
                      },
                    ]}
                  >
                    <SurahBanner
                      nameAr={line.surah.nameAr}
                      ayahCount={line.surah.ayahCount}
                      revelation={line.surah.revelation}
                      gold={colors.gold}
                      textColor={colors.textPrimary}
                      fillColor={isOpeningPage ? 'transparent' : colors.surfaceSunk}
                      bannerHeight={lineBoxHeight}
                    />
                  </View>
                );
              }

              if (line.type === 'basmalah') {
                return (
                  <View
                    key={`line-${idx}`}
                    style={[
                      styles.lineBox,
                      styles.centeredLine,
                      {
                        height: lineBoxHeight,
                        width: isOpeningPage ? `${Math.round(ellipseFactor * 90)}%` : '100%',
                        alignSelf: 'center',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.basmalahText,
                        {
                          fontFamily: fonts.quran,
                          fontSize: Math.round(uniformPageFontSize * (isOpeningPage ? 1.05 : 0.95)),
                          color: colors.gold,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      allowFontScaling={false}
                    >
                      {basmalahText || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'}
                    </Text>
                  </View>
                );
              }

              const nextQcfLine = qcfLayout.lines[idx + 1];
              const isEndOfQcfSurah = !nextQcfLine || nextQcfLine.type === 'surah_header';
              const isCentered =
                isOpeningPage ||
                (isEndOfQcfSurah && line.words.length <= 5) ||
                line.words.length <= 3;

              return (
                <View
                  key={`line-${idx}`}
                  style={[
                    styles.lineBox,
                    {
                      height: lineBoxHeight,
                      width: isOpeningPage ? `${Math.round(ellipseFactor * 100)}%` : '100%',
                      alignSelf: 'center',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.wordsRow,
                      {
                        justifyContent: isCentered ? 'center' : 'space-between',
                        gap: isCentered ? 6 : 0,
                      },
                    ]}
                  >
                    {line.words.map((word) => (
                      <Text
                        key={word.id}
                        onPress={() => onSelectAyah({ surah: word.surahNumber, ayah: word.ayahNumber, page })}
                        style={[
                          styles.wordText,
                          {
                            backgroundColor: highlightFor(word.surahNumber, word.ayahNumber),
                            fontFamily: qcfFontFamily,
                            fontSize: uniformPageFontSize,
                            color: word.charTypeName === 'end' ? colors.gold : colors.textPrimary,
                          },
                        ]}
                        allowFontScaling={false}
                      >
                        {word.codeV2 || (word.charTypeName === 'end' ? toArabicDigits(word.ayahNumber) : word.text)}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* Render Mode 3: Loading Skeleton */
          <View style={styles.gridContainer}>
            {Array.from({ length: 15 }, (_, i) => (
              <View
                key={`skeleton-${i}`}
                style={[
                  styles.lineBox,
                  {
                    height: lineBoxHeight,
                    opacity: 0.12,
                    backgroundColor: colors.textPrimary,
                    width: i === 14 ? '45%' : i % 4 === 0 ? '80%' : '95%',
                    borderRadius: 3,
                    alignSelf: i === 14 ? 'center' : 'stretch',
                    marginVertical: 1,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </MushafFrame>
    </Pressable>
  );
}

/** Surah header banner with top and bottom SVG ornaments */
function SurahBanner({
  nameAr,
  ayahCount,
  revelation,
  gold,
  textColor,
  fillColor,
  bannerHeight,
}: {
  nameAr: string;
  ayahCount: number;
  revelation: 'Meccan' | 'Medinan';
  gold: string;
  textColor: string;
  fillColor: string;
  bannerHeight: number;
}) {
  const ornamentHeight = Math.max(5, Math.min(8, Math.floor(bannerHeight * 0.2)));
  const titleFontSize = Math.max(12, Math.min(15, Math.floor(bannerHeight * 0.40)));

  return (
    <View style={[styles.bannerContainer, { backgroundColor: fillColor }]}>
      <Image
        source={require('../../../assets/images/surah-header.svg')}
        style={[styles.headerOrnament, { height: ornamentHeight }]}
        contentFit="contain"
        tintColor={gold}
      />
      <View style={styles.bannerContentRow}>
        <View style={styles.bannerMetaSide}>
          <Text style={[styles.bannerMetaText, { color: gold }]}>
            {revelation === 'Meccan' ? 'مَكِّيَّة' : 'مَدَنِيَّة'}
          </Text>
        </View>
        <Text
          style={[styles.bannerText, { color: textColor, fontSize: titleFontSize, lineHeight: titleFontSize + 4 }]}
          allowFontScaling={false}
          accessibilityLanguage="ar"
        >
          سورة {surahFontName(nameAr)}
        </Text>
        <View style={styles.bannerMetaSide}>
          <Text style={[styles.bannerMetaText, { color: gold }]}>
            {`آيَاتُهَا ${toArabicDigits(ayahCount)}`}
          </Text>
        </View>
      </View>
      <Image
        source={require('../../../assets/images/surah-header.svg')}
        style={[styles.headerOrnament, styles.ornamentFlipped, { height: ornamentHeight }]}
        contentFit="contain"
        tintColor={gold}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  openingGridContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineBox: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    width: '100%',
  },
  wordsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    paddingHorizontal: 4,
  },
  wordText: {
    textAlign: 'center',
    includeFontPadding: false,
    writingDirection: 'rtl',
  },
  almaghribiFallback: {
    fontFamily: fonts.quranWarshAlmaghribiFallback,
  },
  centeredLine: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  basmalahText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    alignSelf: 'stretch',
    includeFontPadding: false,
  },
  bannerContainer: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
    width: '100%',
  },
  headerOrnament: {
    height: 8,
    width: '100%',
  },
  ornamentFlipped: {
    transform: [{ scaleY: -1 }],
  },
  bannerContentRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    width: '100%',
  },
  bannerMetaSide: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  bannerText: {
    fontFamily: fonts.surahName,
    fontSize: 15,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  bannerMetaText: {
    fontFamily: fonts.defaultBold,
    fontSize: 8.5,
    letterSpacing: 0.1,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

export const MushafPage = memo(MushafPageComponent);
