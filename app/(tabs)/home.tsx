/**
 * Home tab — a dashboard: edge-to-edge Hijri date mosque hero, last-read resume card, and quick links.
 *
 * Fully RTL Arabic right-aligned with Thmanyah UI typography.
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeImageCard } from '../../src/components/home/HomeImageCard';
import { NextPrayerHero } from '../../src/components/home/NextPrayerHero';
import { QuickLinkTile } from '../../src/components/home/QuickLinkTile';
import { IslamicEmblem } from '../../src/components/ui/IslamicEmblem';
import { getPrayerTimes } from '../../src/features/prayer/prayerService';
import { usePrayerStore } from '../../src/features/prayer/prayerStore';
import { useMinuteTick } from '../../src/features/prayer/useMinuteTick';
import { useSurahList } from '../../src/features/reader/useQuranData';
import { useLastRead } from '../../src/store/settings';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts, radius, rtlText, spacing } from '../../src/theme/tokens';
import { toArabicDigits } from '../../src/utils/arabicDigits';
import { getHijriToday } from '../../src/utils/hijriDate';
import { surahFontName } from '../../src/utils/surahFontName';
import { getPrayerCalligraphyKey } from '../../src/features/prayer/prayerCalligraphy';

const HIJRI_YEAR_SUFFIX = 'هـ';

// Light cream calligraphy on the photo cards; the soft shadow keeps it legible
// now that the scrim is lighter.
const CARD_TEXT = '#FFF4E2';
const CARD_TEXT_GOLD = '#FCE38A';
const CARD_TEXT_MUTED = '#F1E3C4';
const cardTextShadow = {
  textShadowColor: 'rgba(30, 16, 6, 0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
} as const;

interface QuickLink {
  key: string;
  label: string;
  accessibilityLabel: string;
  chipColor: string;
  icon: ReactNode;
  onPress: () => void;
}


export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: surahs } = useSurahList();

  const lastRead = useLastRead();

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

  const quickLinkRows = useMemo<QuickLink[][]>(() => {
    const links: QuickLink[] = [
      {
        key: 'mushaf',
        label: 'المصحف',
        accessibilityLabel: 'افتح المصحف',
        chipColor: 'rgba(46, 125, 50, 0.12)',
        icon: <IslamicEmblem size={20} color="#2E7D32" fillColor="rgba(46, 125, 50, 0.2)" />,
        onPress: () => router.push('/(tabs)/quran'),
      },
      {
        key: 'surahs',
        label: 'السور',
        accessibilityLabel: 'فهرس السور',
        chipColor: 'rgba(214, 180, 111, 0.18)',
        icon: <IslamicEmblem size={20} color={colors.gold} fillColor="rgba(214, 180, 111, 0.3)" />,
        onPress: () => router.push('/surahs'),
      },
      {
        key: 'prayer',
        label: 'الصلاة',
        accessibilityLabel: 'مواقيت الصلاة',
        chipColor: 'rgba(230, 140, 40, 0.14)',
        icon: <Feather name="clock" size={18} color="#E68A00" />,
        onPress: () => router.push('/prayer-times'),
      },
      {
        key: 'qibla',
        label: 'القبلة',
        accessibilityLabel: 'اتجاه القبلة',
        chipColor: 'rgba(0, 137, 123, 0.12)',
        icon: <Feather name="compass" size={18} color="#00897B" />,
        onPress: () => router.push('/qibla'),
      },
      {
        key: 'audio',
        label: 'التلاوات',
        accessibilityLabel: 'التلاوات القرآنية',
        chipColor: 'rgba(103, 58, 183, 0.12)',
        icon: <Feather name="headphones" size={18} color="#673AB7" />,
        onPress: () => router.push('/audio'),
      },
      {
        key: 'azkar',
        label: 'الأذكار',
        accessibilityLabel: 'الأذكار والأدعية',
        chipColor: 'rgba(216, 67, 21, 0.12)',
        icon: <Feather name="book-open" size={18} color="#D84315" />,
        onPress: () => router.push('/azkar'),
      },
      {
        key: 'wallpapers',
        label: 'الخلفيات',
        accessibilityLabel: 'خلفيات الشاشة',
        chipColor: 'rgba(230, 110, 80, 0.14)',
        icon: <Feather name="image" size={18} color={colors.terracotta} />,
        onPress: () => router.push('/wallpapers'),
      },
      {
        key: 'widgets',
        label: 'الودجات',
        accessibilityLabel: 'ودجات الشاشة الرئيسية',
        chipColor: 'rgba(63, 110, 160, 0.13)',
        icon: <Feather name="grid" size={18} color="#3F6EA0" />,
        onPress: () => router.push('/widgets'),
      },
      {
        key: 'search',
        label: 'البحث',
        accessibilityLabel: 'البحث في القرآن',
        chipColor: 'rgba(180, 140, 60, 0.14)',
        icon: <Feather name="search" size={18} color={colors.gold} />,
        onPress: () => router.push('/search'),
      },
      {
        key: 'qasidas',
        label: 'المدائح النبوية',
        accessibilityLabel: 'قصائد المدائح النبوية',
        chipColor: 'rgba(130, 113, 72, 0.14)',
        icon: <Feather name="feather" size={18} color={colors.gold} />,
        onPress: () => router.push('/qasidas'),
      },
    ];
    const rows: QuickLink[][] = [];
    for (let i = 0; i < links.length; i += 2) rows.push(links.slice(i, i + 2));
    return rows;
  }, [colors.gold, colors.terracotta]);

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
          {/* Hijri date */}
          <HomeImageCard source={require('../../assets/images/mosque.jpg')} style={styles.cardSpacing}>
            <View style={styles.cardInner}>
              <Text style={styles.cardPreTitle}>التاريخ الهجري</Text>

              {/* Calligraphic weekday name */}
              <Text style={styles.hijriWeekdayCalligraphy} allowFontScaling={false} accessibilityElementsHidden>
                {String(today.weekdayLigature)}
              </Text>

              {/* Day number + month calligraphy + year */}
              <View style={styles.hijriDateRow}>
                <Text style={styles.hijriDayNumber} allowFontScaling={false}>
                  {today.dayOfMonth}
                </Text>
                <View style={styles.hijriMonthClip}>
                  <Text style={styles.hijriMonthCalligraphy} allowFontScaling={false} accessibilityElementsHidden>
                    {String(today.monthLigature)}
                  </Text>
                </View>
                <Text style={styles.hijriYearText}>{`${today.year} ${HIJRI_YEAR_SUFFIX}`}</Text>
              </View>
            </View>
          </HomeImageCard>

          {/* Resume reading */}
          <Pressable
            onPress={() =>
              router.push(
                lastRead
                  ? { pathname: '/(tabs)/quran', params: { page: String(lastRead.page), t: String(Date.now()) } }
                  : '/(tabs)/quran',
              )
            }
            style={({ pressed }) => [styles.cardSpacing, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            accessibilityRole="button"
            accessibilityLabel={lastReadSurah ? `متابعة القراءة، سورة ${lastReadSurah.nameAr}` : 'بدء القراءة'}
          >
            <HomeImageCard source={require('../../assets/images/mosque.jpg')}>
              <View style={styles.cardInner}>
                <Text style={styles.cardPreTitle}>{lastReadSurah ? 'متابعة الورد القرآني' : 'بدء التلاوة'}</Text>
                <Text style={styles.resumeArabicName}>
                  {lastReadSurah ? `سورة ${surahFontName(lastReadSurah.nameAr)}` : 'سورة الفاتحة'}
                </Text>
                <Text style={[styles.resumeSurahMeta, rtlText]}>
                  {lastReadSurah && lastRead
                    ? `الآية ${toArabicDigits(lastRead.ayah)} · ص ${toArabicDigits(lastRead.page)}`
                    : 'افتح المصحف'}
                </Text>
              </View>
            </HomeImageCard>
          </Pressable>

          {/* Quick links, two per row */}
          <View style={styles.grid}>
            {quickLinkRows.map((row) => (
              <View key={row[0].key} style={styles.gridRow}>
                {row.map((link) => (
                  <QuickLinkTile
                    key={link.key}
                    label={link.label}
                    accessibilityLabel={link.accessibilityLabel}
                    icon={link.icon}
                    chipColor={link.chipColor}
                    onPress={link.onPress}
                  />
                ))}
              </View>
            ))}
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
  cardSpacing: {
    marginBottom: 12,
  },
  cardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  cardPreTitle: {
    ...cardTextShadow,
    fontFamily: fonts.defaultBold,
    fontSize: 12,
    color: CARD_TEXT_MUTED,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  hijriWeekdayCalligraphy: {
    ...cardTextShadow,
    fontFamily: fonts.hijriWeekday,
    fontSize: 42,
    lineHeight: 48,
    color: CARD_TEXT,
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
    ...cardTextShadow,
    fontFamily: fonts.defaultBold,
    fontSize: 26,
    lineHeight: 30,
    color: CARD_TEXT_GOLD,
  },
  hijriMonthClip: {
    height: 30,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  hijriMonthCalligraphy: {
    ...cardTextShadow,
    fontFamily: fonts.hijriMonth,
    fontSize: 28,
    lineHeight: 30,
    marginTop: -2,
    color: CARD_TEXT,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  hijriYearText: {
    ...cardTextShadow,
    fontFamily: fonts.defaultBold,
    fontSize: 15,
    lineHeight: 20,
    color: CARD_TEXT_MUTED,
  },
  resumeArabicName: {
    ...cardTextShadow,
    fontFamily: fonts.surahName,
    fontSize: 44,
    lineHeight: 50,
    color: CARD_TEXT,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  resumeSurahMeta: {
    ...cardTextShadow,
    fontFamily: fonts.defaultBold,
    fontSize: 16,
    lineHeight: 20,
    marginTop: 3,
    textAlign: 'center',
    writingDirection: 'rtl',
    color: CARD_TEXT_GOLD,
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
});
