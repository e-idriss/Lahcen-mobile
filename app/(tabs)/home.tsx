/**
 * Home tab — a dashboard: edge-to-edge Hijri date mosque hero, last-read resume card, and quick links.
 *
 * Fully RTL Arabic right-aligned with Thmanyah UI typography.
 */

import { Feather } from '@expo/vector-icons';
import { Image, ImageBackground } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HijriDateCard } from '../../src/components/home/HijriDateCard';
import { NextPrayerHero } from '../../src/components/home/NextPrayerHero';
import { IslamicEmblem } from '../../src/components/ui/IslamicEmblem';
import { getPrayerTimes } from '../../src/features/prayer/prayerService';
import { usePrayerStore } from '../../src/features/prayer/prayerStore';
import { useMinuteTick } from '../../src/features/prayer/useMinuteTick';
import { useSurahList } from '../../src/features/reader/useQuranData';
import { useSettings } from '../../src/store/settings';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts, radius, rtlText, spacing } from '../../src/theme/tokens';
import { getHijriToday } from '../../src/utils/hijriDate';

const HIJRI_YEAR_SUFFIX = 'هـ';

function getPrayerCalligraphyKey(key?: string): string | null {
  switch (key) {
    case 'fajr':
      return '3';
    case 'dhuhr':
      return '4';
    case 'asr':
      return '5';
    case 'maghrib':
      return '6';
    case 'isha':
      return '7';
    default:
      return null;
  }
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: surahs } = useSurahList();

  const lastRead = useSettings((s) => s.lastRead);

  const lastReadSurah = useMemo(() => {
    if (!lastRead) return null;
    return surahs.find((s) => s.number === lastRead.surah) ?? null;
  }, [surahs, lastRead]);

  // Prayer times
  const lat = usePrayerStore((s) => s.latitude);
  const lng = usePrayerStore((s) => s.longitude);
  const cityName = usePrayerStore((s) => s.cityName);
  const calculationMethod = usePrayerStore((s) => s.calculationMethod);
  const isHanafi = usePrayerStore((s) => s.isHanafi);

  // `new Date()` inside the memo was captured once at mount and never
  // recomputed, so the countdown froze at the time the screen first rendered.
  const currentTime = useMinuteTick();

  const prayerResult = useMemo(() => {
    return getPrayerTimes(lat, lng, currentTime, calculationMethod, isHanafi);
  }, [lat, lng, currentTime, calculationMethod, isHanafi]);

  const prayerCalligraphyKey = prayerResult.nextPrayer?.key
    ? getPrayerCalligraphyKey(prayerResult.nextPrayer.key)
    : null;

  const today = useMemo(() => getHijriToday(), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Hero: Full-Width Mosque Backdrop with Next Prayer */}
        <NextPrayerHero
          prayerResult={prayerResult}
          prayerCalligraphyKey={prayerCalligraphyKey}
        />

        {/* Home Screen Body Content (Rounded Top overlay over mosque image) */}
        <View
          style={[
            styles.body,
            {
              backgroundColor: colors.bg,
              borderTopColor: colors.goldSoft,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          {/* Hijri Date Banner (In Body Sheet, Centered & Big Calligraphy) */}
          <View style={styles.hijriCardWrapper}>
            <ImageBackground
              source={require('../../assets/images/mosque.jpg')}
              style={styles.cardImageBg}
              imageStyle={styles.cardImageInner}
            >
              {/* Scrim Overlay for clear text contrast */}
              <View style={styles.cardScrim} />

              <View style={styles.hijriCardInner}>
                <Text style={styles.hijriPreTitle}>التاريخ الهجري</Text>

                {/* Calligraphic Weekday Name */}
                <Text
                  style={[styles.hijriWeekdayCalligraphy, { color: '#FFEED6' }]}
                  allowFontScaling={false}
                  accessibilityElementsHidden
                >
                  {String(today.weekdayLigature)}
                </Text>

                {/* Date Row: Day Number + Month Calligraphy + Year */}
                <View style={styles.hijriDateRow}>
                  <Text style={[styles.hijriDayNumber, { color: '#FCE38A' }]} allowFontScaling={false}>
                    {today.dayOfMonth}
                  </Text>

                  <View style={styles.hijriMonthClip}>
                    <Text
                      style={[styles.hijriMonthCalligraphy, { color: '#FFEED6' }]}
                      allowFontScaling={false}
                      accessibilityElementsHidden
                    >
                      {String(today.monthLigature)}
                    </Text>
                  </View>

                  <Text style={[styles.hijriYearText, { color: '#DECFA9' }]}>
                    {`${today.year} ${HIJRI_YEAR_SUFFIX}`}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Resume Reading Card (Directly Below Next Prayer, Centered & Big Calligraphy) */}
          <Pressable
            onPress={() => router.push('/(tabs)/quran')}
            style={({ pressed }) => [
              styles.resumeWrapper,
              { opacity: pressed ? 0.88 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              lastReadSurah
                ? `متابعة القراءة، سورة ${lastReadSurah.nameAr}`
                : 'بدء القراءة'
            }
          >
            <ImageBackground
              source={require('../../assets/images/mosque.jpg')}
              style={styles.cardImageBg}
              imageStyle={styles.cardImageInner}
            >
              {/* Scrim Overlay for clear text contrast */}
              <View style={styles.cardScrim} />

              <View style={styles.resumeCardInner}>
                <Text style={styles.resumePreTitle}>
                  {lastReadSurah ? 'متابعة الورد القرآني' : 'بدء التلاوة'}
                </Text>

                {/* Big Centered Surah Name */}
                <Text style={[styles.resumeArabicName, { color: '#FFEED6' }]}>
                  {lastReadSurah ? `سورة ${lastReadSurah.nameAr}` : 'سورة الفاتحة'}
                </Text>

                {/* Centered Ayah Indicator */}
                <Text style={[styles.resumeSurahMeta, rtlText, { color: '#FCE38A' }]}>
                  {lastReadSurah ? `الآية ${lastRead?.ayah ?? 1}` : 'افتح المصحف'}
                </Text>
              </View>
            </ImageBackground>
          </Pressable>

          {/* Quick Links Grid: Modern Premium Elevated Tiles */}
          <View style={styles.grid}>
            {/* Row 1: Mushaf & Surahs */}
            <View style={styles.gridRow}>
              <Pressable
                onPress={() => router.push('/(tabs)/quran')}
                style={({ pressed }) => [
                  styles.modernTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.goldSoft,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="افتح المصحف"
              >
                <View style={styles.tileContent}>
                  <View style={[styles.tileIconChip, { backgroundColor: 'rgba(46, 125, 50, 0.12)' }]}>
                    <IslamicEmblem size={20} color="#2E7D32" fillColor="rgba(46, 125, 50, 0.2)" />
                  </View>
                  <View style={styles.tileTextCol}>
                    <Text style={[styles.tileMainLabel, { color: colors.textPrimary }]}>المصحف</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={14} color={colors.textMuted} />
              </Pressable>

              <Pressable
                onPress={() => router.push('/surahs')}
                style={({ pressed }) => [
                  styles.modernTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.goldSoft,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="فهرس السور"
              >
                <View style={styles.tileContent}>
                  <View style={[styles.tileIconChip, { backgroundColor: 'rgba(214, 180, 111, 0.18)' }]}>
                    <IslamicEmblem size={20} color={colors.gold} fillColor="rgba(214, 180, 111, 0.3)" />
                  </View>
                  <View style={styles.tileTextCol}>
                    <Text style={[styles.tileMainLabel, { color: colors.textPrimary }]}>السور</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={14} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Row 2: Prayer Times & Qibla */}
            <View style={styles.gridRow}>
              <Pressable
                onPress={() => router.push('/prayer-times')}
                style={({ pressed }) => [
                  styles.modernTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.goldSoft,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="مواقيت الصلاة"
              >
                <View style={styles.tileContent}>
                  <View style={[styles.tileIconChip, { backgroundColor: 'rgba(230, 140, 40, 0.14)' }]}>
                    <Feather name="clock" size={18} color="#E68A00" />
                  </View>
                  <View style={styles.tileTextCol}>
                    <Text style={[styles.tileMainLabel, { color: colors.textPrimary }]}>الصلاة</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={14} color={colors.textMuted} />
              </Pressable>

              <Pressable
                onPress={() => router.push('/qibla')}
                style={({ pressed }) => [
                  styles.modernTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.goldSoft,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="اتجاه القبلة"
              >
                <View style={styles.tileContent}>
                  <View style={[styles.tileIconChip, { backgroundColor: 'rgba(0, 137, 123, 0.12)' }]}>
                    <Feather name="compass" size={18} color="#00897B" />
                  </View>
                  <View style={styles.tileTextCol}>
                    <Text style={[styles.tileMainLabel, { color: colors.textPrimary }]}>القبلة</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={14} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Row 3: Recitations & Azkar */}
            <View style={styles.gridRow}>
              <Pressable
                onPress={() => router.push('/audio')}
                style={({ pressed }) => [
                  styles.modernTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.goldSoft,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="التلاوات القرآنية"
              >
                <View style={styles.tileContent}>
                  <View style={[styles.tileIconChip, { backgroundColor: 'rgba(103, 58, 183, 0.12)' }]}>
                    <Feather name="headphones" size={18} color="#673AB7" />
                  </View>
                  <View style={styles.tileTextCol}>
                    <Text style={[styles.tileMainLabel, { color: colors.textPrimary }]}>التلاوات</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={14} color={colors.textMuted} />
              </Pressable>

              <Pressable
                onPress={() => router.push('/azkar')}
                style={({ pressed }) => [
                  styles.modernTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.goldSoft,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="الأذكار والأدعية"
              >
                <View style={styles.tileContent}>
                  <View style={[styles.tileIconChip, { backgroundColor: 'rgba(216, 67, 21, 0.12)' }]}>
                    <Feather name="book-open" size={18} color="#D84315" />
                  </View>
                  <View style={styles.tileTextCol}>
                    <Text style={[styles.tileMainLabel, { color: colors.textPrimary }]}>الأذكار</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={14} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Row 4: Wallpapers & Search */}
            <View style={styles.gridRow}>
              <Pressable
                onPress={() => router.push('/wallpapers')}
                style={({ pressed }) => [
                  styles.modernTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.goldSoft,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="خلفيات إسلامية"
              >
                <View style={styles.tileContent}>
                  <View style={[styles.tileIconChip, { backgroundColor: 'rgba(230, 110, 80, 0.14)' }]}>
                    <Feather name="image" size={18} color={colors.terracotta} />
                  </View>
                  <View style={styles.tileTextCol}>
                    <Text style={[styles.tileMainLabel, { color: colors.textPrimary }]}>الخلفيات</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={14} color={colors.textMuted} />
              </Pressable>

              <Pressable
                onPress={() => router.push('/search')}
                style={({ pressed }) => [
                  styles.modernTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.goldSoft,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="البحث في القرآن"
              >
                <View style={styles.tileContent}>
                  <View style={[styles.tileIconChip, { backgroundColor: 'rgba(180, 140, 60, 0.14)' }]}>
                    <Feather name="search" size={18} color={colors.gold} />
                  </View>
                  <View style={styles.tileTextCol}>
                    <Text style={[styles.tileMainLabel, { color: colors.textPrimary }]}>البحث</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={14} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Row 5: Prophetic praise poems */}
            <View style={styles.gridRow}>
              <Pressable
                onPress={() => router.push('/qasidas')}
                style={({ pressed }) => [
                  styles.modernTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.goldSoft,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="قصائد المدائح النبوية"
              >
                <View style={styles.tileContent}>
                  <View style={[styles.tileIconChip, { backgroundColor: 'rgba(130, 113, 72, 0.14)' }]}>
                    <Feather name="feather" size={18} color={colors.gold} />
                  </View>
                  <View style={styles.tileTextCol}>
                    <Text style={[styles.tileMainLabel, { color: colors.textPrimary }]}>المدائح النبوية</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  body: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.5,
    marginTop: -26,
    overflow: 'hidden',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  hijriCardWrapper: {
    borderRadius: radius.lg,
    borderWidth: 0,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  hijriCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    zIndex: 2,
  },
  hijriPreTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
    color: '#DECFA9',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  hijriWeekdayCalligraphy: {
    fontFamily: fonts.hijriWeekday,
    fontSize: 42,
    lineHeight: 48,
    color: '#FFEED6',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  hijriDateRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  hijriDayNumber: {
    fontFamily: fonts.defaultBold,
    fontSize: 26,
    lineHeight: 30,
    color: '#FCE38A',
  },
  hijriMonthClip: {
    height: 30,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  hijriMonthCalligraphy: {
    fontFamily: fonts.hijriMonth,
    fontSize: 28,
    lineHeight: 30,
    marginTop: -2,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  hijriYearText: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
    lineHeight: 20,
    color: '#DECFA9',
  },
  cardImageBg: {
    width: '100%',
    overflow: 'hidden',
  },
  cardImageInner: {
    borderRadius: radius.lg,
  },
  cardScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18, 14, 10, 0.65)',
  },
  resumeWrapper: {
    borderRadius: radius.lg,
    borderWidth: 0,
    marginTop: 4,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  resumeCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    zIndex: 2,
  },
  resumePreTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
    color: '#DECFA9',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resumeArabicName: {
    fontFamily: fonts.surahName,
    fontSize: 44,
    lineHeight: 48,
    color: '#FFEED6',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  resumeSurahMeta: {
    fontFamily: fonts.defaultBold,
    fontSize: 16,
    lineHeight: 20,
    marginTop: 3,
    textAlign: 'center',
    writingDirection: 'rtl',
    color: '#FCE38A',
  },
  grid: {
    width: '100%',
    marginTop: 4,
  },
  gridRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
    width: '100%',
  },
  modernTile: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1.2,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tileContent: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 10,
  },
  tileIconChip: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  tileTextCol: {
    justifyContent: 'center',
  },
  tileMainLabel: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
