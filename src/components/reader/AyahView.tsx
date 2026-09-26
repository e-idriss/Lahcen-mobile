/**
 * A single ayah: Arabic text with its end-of-ayah medallion, and the optional
 * English translation beneath.
 */

import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../../store/settings';
import { useTheme } from '../../theme/ThemeProvider';
import { arabicTextStyle, fonts } from '../../theme/tokens';
import { toArabicDigits } from '../../utils/arabicDigits';

interface Props {
  surah: number;
  ayah: number;
  text: string;
  translation: string;
  fontSize: number;
  showTranslation: boolean;
  isSelected: boolean;
  isBookmarked: boolean;
  onPress: (position: { surah: number; ayah: number }) => void;
}

/**
 * The end-of-ayah medallion.
 *
 * This font composes the medallion from the Arabic-Indic DIGITS alone, via its
 * `rlig` feature: uni0661.rlig..uni0669.rlig are the one-digit medallions and
 * there are two- and three-digit ligatures too, covering every ayah number.
 *
 * So the number is simply written into the text in Arabic-Indic digits and the
 * font does the rest. U+06DD must NOT be included — it is a separate standalone
 * glyph here and would render as a second, empty circle beside the number.
 */
function AyahViewComponent({
  surah,
  ayah,
  text,
  translation,
  fontSize,
  showTranslation,
  isSelected,
  isBookmarked,
  onPress,
}: Props) {
  const { colors, spacing, radius } = useTheme();
  const riwaya = useSettings((s) => s.riwaya);

  return (
    <Pressable
      onPress={() => onPress({ surah, ayah })}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isSelected ? colors.accentSoft : 'transparent',
          borderRadius: radius.md,
          marginBottom: spacing.base,
          opacity: pressed && !isSelected ? 0.7 : 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`الآية ${ayah}${isBookmarked ? '، محفوظة كإشارة مرجعية' : ''}`}
      accessibilityHint="اضغط مرتين لتحديد هذه الآية"
    >
      <Text
        style={[arabicTextStyle(fontSize, riwaya), styles.arabic, { color: colors.textPrimary }]}
        accessibilityLanguage="ar"
        allowFontScaling={false}
      >
        {text}
        <Text style={{ fontFamily: fonts.quran, color: colors.gold }}> {toArabicDigits(ayah)}</Text>
      </Text>

      {showTranslation && (
        <View
          style={[
            styles.translationBlock,
            { borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.md },
          ]}
        >
          <Text style={[styles.translation, { color: colors.textSecond }]}>{translation}</Text>
        </View>
      )}

      {isBookmarked && (
        <View
          style={[styles.bookmarkDot, { backgroundColor: colors.accent }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  arabic: {
    textAlign: 'right',
  },
  translationBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  translation: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'left',
  },
  bookmarkDot: {
    borderRadius: 999,
    height: 6,
    left: 4,
    position: 'absolute',
    top: 16,
    width: 6,
  },
});

/**
 * Memoised so that scrolling a 286-ayah surah does not re-render every row.
 * Only the props that actually affect the output are compared.
 */
export const AyahView = memo(AyahViewComponent, (prev, next) => {
  return (
    prev.surah === next.surah &&
    prev.ayah === next.ayah &&
    prev.text === next.text &&
    prev.fontSize === next.fontSize &&
    prev.showTranslation === next.showTranslation &&
    prev.isSelected === next.isSelected &&
    prev.isBookmarked === next.isBookmarked &&
    prev.onPress === next.onPress
  );
});
