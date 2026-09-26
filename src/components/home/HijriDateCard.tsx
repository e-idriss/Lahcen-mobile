/**
 * Home screen hero: Full-width edge-to-edge Mosque backdrop card with today's Hijri date.
 *
 * Uses the dedicated calligraphic Islamic fonts:
 * - Weekday: `Elgharib-Days Of Week.ttf` (ligature key)
 * - Month: `Elgharib-AYB-Hijri Months.ttf` (with bottom Latin subtitle clipped to show pure Arabic calligraphy)
 * - Large, prominent, and legible day number and year.
 */

import { Feather } from '@expo/vector-icons';
import { ImageBackground } from 'expo-image';
import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../../theme/tokens';
import { getHijriToday } from '../../utils/hijriDate';

const HIJRI_YEAR_SUFFIX = 'هـ';

function HijriDateCardComponent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => getHijriToday(), []);

  const totalHeight = 190 + insets.top;

  return (
    <ImageBackground
      source={require('../../../assets/images/mosque.jpg')}
      style={[
        styles.card,
        {
          height: totalHeight,
          borderBottomColor: colors.goldSoft,
          paddingTop: insets.top + 6,
        },
      ]}
      imageStyle={styles.image}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`اليوم ${today.dayOfMonth} من ${today.monthNameAr}، ${today.year} هـ`}
    >
      {/* Translucent overlay for rich contrast and depth */}
      <View style={[styles.scrim, { backgroundColor: colors.overlayScrim }]} />

      <View style={styles.content}>
        {/* Top Tag & Settings Row */}
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            hitSlop={HIT_SLOP}
            style={[
              styles.settingsBtn,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                borderColor: colors.goldSoft,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="الإعدادات"
          >
            <Feather name="settings" size={15} color="#FFEED6" />
          </Pressable>

          <View
            style={[
              styles.tagBadge,
              {
                backgroundColor: 'rgba(130, 113, 72, 0.45)',
                borderColor: colors.gold,
              },
            ]}
          >
            <Text style={[styles.tagText, { color: '#FFEED6' }]}>
              التاريخ الهجري
            </Text>
          </View>
        </View>

        {/* Calligraphic Weekday Name */}
        <Text
          style={[styles.weekday, { color: '#FFEED6' }]}
          allowFontScaling={false}
          accessibilityElementsHidden
        >
          {String(today.weekdayLigature)}
        </Text>

        {/* Date Row: Large Day Number + Pure Calligraphic Month + Year */}
        <View style={styles.dateRow}>
          {/* Day Number in Gold */}
          <Text style={[styles.dayNumber, { color: colors.gold }]} allowFontScaling={false}>
            {today.dayOfMonth}
          </Text>

          {/* Month Calligraphy with bottom English text masked out */}
          <View style={styles.monthClipContainer}>
            <Text
              style={[styles.monthCalligraphy, { color: '#FFEED6' }]}
              allowFontScaling={false}
              accessibilityElementsHidden
            >
              {String(today.monthLigature)}
            </Text>
          </View>

          {/* Hijri Year */}
          <Text style={[styles.year, { color: '#DECFA9' }]}>
            {`${today.year} ${HIJRI_YEAR_SUFFIX}`}
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    width: '100%',
  },
  image: {},
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    zIndex: 2,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    width: '100%',
  },
  settingsBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  tagBadge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 2.5,
  },
  tagText: {
    fontFamily: fonts.defaultBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  weekday: {
    fontFamily: fonts.hijriWeekday,
    fontSize: 38,
    lineHeight: 46,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    width: '100%',
  },
  dayNumber: {
    fontFamily: fonts.defaultBold,
    fontSize: 34,
    lineHeight: 38,
  },
  monthClipContainer: {
    height: 34,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  monthCalligraphy: {
    fontFamily: fonts.hijriMonth,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  year: {
    fontFamily: fonts.defaultBold,
    fontSize: 16,
    lineHeight: 22,
  },
});

export const HijriDateCard = memo(HijriDateCardComponent);
