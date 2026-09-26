/**
 * Home screen hero: Full-width edge-to-edge Mosque backdrop banner with Next Prayer countdown.
 *
 * Uses the dedicated calligraphic Islamic prayer font:
 * - Prayer Name: `Elgharib-Omar_5.Prayers.ttf` (ligature key: 3=Fajr, 4=Dhuhr, 5=Asr, 6=Maghrib, 7=Isha)
 * - Large, prominent, and legible digital countdown timer.
 */

import { Feather } from '@expo/vector-icons';
import { ImageBackground } from 'expo-image';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PrayerTimesResult } from '../../features/prayer/types';
import { useTheme } from '../../theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../../theme/tokens';

interface NextPrayerHeroProps {
  prayerResult: PrayerTimesResult;
  prayerCalligraphyKey: string | null;
}

function NextPrayerHeroComponent({
  prayerResult,
  prayerCalligraphyKey,
}: NextPrayerHeroProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const totalHeight = 225 + insets.top;

  return (
    <Pressable
      onPress={() => router.push('/prayer-times')}
      style={styles.heroPressable}
      accessibilityRole="button"
      accessibilityLabel={`الصلاة القادمة ${prayerResult.nextPrayer?.nameAr || 'الفجر'} الساعة ${prayerResult.nextPrayer?.timeFormatted || ''}`}
    >
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
                الصلاة القادمة
              </Text>
            </View>
          </View>

          {/* Big Centered Calligraphic Prayer Name */}
          <View style={styles.prayerCenterContainer}>
            {prayerCalligraphyKey ? (
              <Text
                style={[styles.prayerCalligraphy, { color: '#FFEED6' }]}
                allowFontScaling={false}
                accessibilityElementsHidden
              >
                {prayerCalligraphyKey}
              </Text>
            ) : (
              <Text style={[styles.prayerNextLabel, { color: '#FFEED6' }]}>
                {prayerResult.nextPrayer?.nameAr || 'الفجر'}
              </Text>
            )}

            {/* Centered Adhan Time (Heure de l'Adhan) */}
            <Text style={[styles.prayerCountdown, { color: '#FCE38A' }]}>
              {prayerResult.nextPrayer?.timeFormatted || '00:00'}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroPressable: {
    width: '100%',
  },
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
    justifyContent: 'space-between',
    paddingBottom: 58,
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
  prayerCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  prayerCalligraphy: {
    fontFamily: fonts.prayers,
    fontSize: 50,
    lineHeight: 54,
    color: '#FFEED6',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  prayerNextLabel: {
    fontFamily: fonts.defaultBold,
    fontSize: 26,
    lineHeight: 32,
    color: '#FFEED6',
    textAlign: 'center',
  },
  prayerCountdown: {
    fontFamily: fonts.defaultBold,
    fontSize: 26,
    lineHeight: 30,
    marginTop: 2,
    letterSpacing: 1.5,
    textAlign: 'center',
    color: '#FCE38A',
  },
});

export const NextPrayerHero = memo(NextPrayerHeroComponent);
