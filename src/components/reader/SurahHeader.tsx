/**
 * The illuminated surah header — the app's visual signature.
 *
 * Renders the surah name in the decorative Ejazah-style font inside an illuminated
 * gold and sage hairline frame, with revelation place and ayah count badges.
 */

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { SURAH_NAME_LINE_HEIGHT_RATIO, fonts, radius, rtlText, spacing } from '../../theme/tokens';
import { toArabicDigits } from '../../utils/arabicDigits';
import { surahFontName } from '../../utils/surahFontName';

interface Props {
  nameAr: string;
  revelation: 'Meccan' | 'Medinan';
  ayahCount: number;
}

const SURAH_NAME_SIZE = 40;

function SurahHeaderComponent({ nameAr, revelation, ayahCount }: Props) {
  const { colors } = useTheme();
  const revelationAr = revelation === 'Meccan' ? 'مكية' : 'مدنية';

  return (
    <View
      style={[styles.container, { paddingVertical: spacing['2xl'] }]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`سورة ${nameAr}، ${revelationAr}، ${ayahCount} آية`}
    >
      <View
        style={[
          styles.frame,
          {
            borderColor: colors.gold,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {/* Inner Gold Border Ring */}
        <View style={[styles.innerFrame, { borderColor: colors.goldSoft }]}>
          <Ornament color={colors.gold} />

          <Text
            style={[styles.name, { color: colors.textPrimary }]}
            accessibilityLanguage="ar"
            allowFontScaling={false}
          >
            {surahFontName(nameAr)}
          </Text>

          <Ornament color={colors.gold} flip />
        </View>
      </View>

      {/* Metadata Badges */}
      <View style={[styles.meta, { marginTop: spacing.md, gap: spacing.sm }]}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.sageSoft,
              borderColor: colors.sage,
            },
          ]}
        >
          <Text style={[styles.badgeText, rtlText, { color: colors.accent }]}>
            {revelationAr}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: colors.surfaceSunk, borderColor: colors.border }]}>
          <Text style={[styles.metaText, rtlText, { color: colors.textSecond }]}>
            {toArabicDigits(ayahCount)} آية
          </Text>
        </View>
      </View>
    </View>
  );
}

/** A tapering gold rule with center diamond — decorative only. */
function Ornament({ color, flip = false }: { color: string; flip?: boolean }) {
  return (
    <View
      style={[styles.ornament, flip && styles.ornamentFlipped]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.ornamentLine, { backgroundColor: color }]} />
      <View style={[styles.ornamentDiamond, { backgroundColor: color }]} />
      <View style={[styles.ornamentLine, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  frame: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: 4,
  },
  innerFrame: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  name: {
    fontFamily: fonts.surahName,
    fontSize: SURAH_NAME_SIZE,
    lineHeight: Math.round(SURAH_NAME_SIZE * SURAH_NAME_LINE_HEIGHT_RATIO),
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  ornament: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    opacity: 0.85,
    paddingVertical: 6,
    width: '64%',
  },
  ornamentFlipped: {
    transform: [{ scaleY: -1 }],
  },
  ornamentLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
  },
  ornamentDiamond: {
    height: 6,
    transform: [{ rotate: '45deg' }],
    width: 6,
  },
});

export const SurahHeader = memo(SurahHeaderComponent);
