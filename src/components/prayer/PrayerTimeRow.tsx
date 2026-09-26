/**
 * One row of the daily prayer-times list (RTL):
 *   [icon] name ·········· [القادمة] time
 * The next prayer gets a brand wash; passed prayers recede.
 */

import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getPrayerCalligraphyKey } from '../../features/prayer/prayerCalligraphy';
import type { PrayerTimeItem } from '../../features/prayer/types';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, radius, spacing } from '../../theme/tokens';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

interface Props {
  item: PrayerTimeItem;
  icon: FeatherIconName;
  iconColor: string;
  showDivider: boolean;
}

export function PrayerTimeRow({ item, icon, iconColor, showDivider }: Props) {
  const { colors } = useTheme();
  const { isNext, isPassed } = item;
  const textColor = isNext ? colors.accent : isPassed ? colors.textMuted : colors.textPrimary;
  // Same calligraphy as the home hero; Shuruq has no glyph and stays plain text.
  const calligraphyKey = getPrayerCalligraphyKey(item.key);

  return (
    <View
      style={[
        styles.row,
        isNext && { backgroundColor: colors.accentSoft },
        showDivider && !isNext && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
      accessibilityLabel={`${item.nameAr} ${item.timeFormatted}${isNext ? '، الصلاة القادمة' : ''}`}
    >
      <View style={[styles.iconChip, { backgroundColor: isNext ? colors.accent : colors.surfaceSunk }]}>
        <Feather name={icon} size={16} color={isNext ? colors.onAccent : isPassed ? colors.textMuted : iconColor} />
      </View>

      {calligraphyKey ? (
        <View style={styles.nameSlot}>
          <Text
            style={[styles.nameCalligraphy, { color: textColor }]}
            allowFontScaling={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {calligraphyKey}
          </Text>
        </View>
      ) : (
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {item.nameAr}
        </Text>
      )}

      {isNext && (
        <View style={[styles.pill, { backgroundColor: colors.accent }]}>
          <Text style={[styles.pillText, { color: colors.onAccent }]}>القادمة</Text>
        </View>
      )}

      <Text style={[styles.time, { color: textColor }]}>{item.timeFormatted}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.base,
  },
  iconChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  name: {
    flex: 1,
    fontFamily: fonts.defaultBold,
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  nameSlot: {
    alignItems: 'flex-end',
    flex: 1,
  },
  nameCalligraphy: {
    fontFamily: fonts.prayers,
    fontSize: 34,
    lineHeight: 44,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: {
    fontFamily: fonts.defaultBold,
    fontSize: 11,
  },
  time: {
    fontFamily: fonts.defaultBold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    textAlign: 'left',
  },
});
