/**
 * Prayer Times Screen (`app/prayer-times.tsx`).
 *
 * Displays precise astronomical prayer times with a luxury mosque hero background,
 * live countdown to the next prayer, GPS auto-location, city selector, calculation methods,
 * and Madinah Adhan audio player.
 */

import { Feather } from '@expo/vector-icons';
import { ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CALCULATION_METHODS_META,
  CITY_PRESETS,
  getPrayerTimes,
} from '../src/features/prayer/prayerService';
import { PrayerTimeRow } from '../src/components/prayer/PrayerTimeRow';
import { formatRemainingAr } from '../src/features/prayer/formatRemaining';
import { usePrayerStore } from '../src/features/prayer/prayerStore';
import type { CityPreset, PrayerKey } from '../src/features/prayer/types';
import { useMinuteTick } from '../src/features/prayer/useMinuteTick';
import { useTheme } from '../src/theme/ThemeProvider';
import { BRAND_PRIMARY, HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';
import { WEEKDAYS_AR, getHijriToday } from '../src/utils/hijriDate';

/**
 * Icon names are typed against Feather's own glyph union rather than `string`,
 * so a typo fails the build instead of silently rendering nothing.
 */
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

// Text on the carpet photo: warm cream, soft shadow for legibility.
const HERO_TEXT = '#FFF4E2';
const HERO_TEXT_MUTED = '#F1E3C4';
const HERO_GOLD = '#FCE38A';
const HERO_SCRIM = ['rgba(38, 22, 10, 0.35)', 'rgba(38, 22, 10, 0.2)', 'rgba(38, 22, 10, 0.4)'] as const;
const heroTextShadow = {
  textShadowColor: 'rgba(30, 16, 6, 0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
} as const;

const PRAYER_ICONS: Record<PrayerKey, { icon: FeatherIconName; color: string }> = {
  fajr: { icon: 'sunrise', color: '#E8A07C' },
  sunrise: { icon: 'sun', color: '#D6B46F' },
  dhuhr: { icon: 'sun', color: BRAND_PRIMARY },
  asr: { icon: 'cloud', color: '#A5AF79' },
  maghrib: { icon: 'sunset', color: '#E8A07C' },
  isha: { icon: 'moon', color: BRAND_PRIMARY },
};

export default function PrayerTimesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const lat = usePrayerStore((s) => s.latitude);
  const lng = usePrayerStore((s) => s.longitude);
  const cityName = usePrayerStore((s) => s.cityName);
  const calculationMethod = usePrayerStore((s) => s.calculationMethod);
  const isHanafi = usePrayerStore((s) => s.isHanafi);
  const locationLoading = usePrayerStore((s) => s.locationLoading);

  const setLocation = usePrayerStore((s) => s.setLocation);
  const setCalculationMethod = usePrayerStore((s) => s.setCalculationMethod);
  const refreshGpsLocation = usePrayerStore((s) => s.refreshGpsLocation);

  // Modals state
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [methodModalOpen, setMethodModalOpen] = useState(false);

  // The countdown renders as HH:MM, so it only needs to advance once a minute.
  const currentTime = useMinuteTick();

  const prayerResult = useMemo(() => {
    return getPrayerTimes(lat, lng, currentTime, calculationMethod, isHanafi);
  }, [lat, lng, currentTime, calculationMethod, isHanafi]);

  const nextPrayer = prayerResult.nextPrayer;
  const remainingLabel = formatRemainingAr(prayerResult.timeRemainingSeconds);
  // Short form for the button ("أم القرى"); the full name stays in the picker.
  const methodName = (
    CALCULATION_METHODS_META.find((m) => m.key === calculationMethod)?.nameAr ?? 'طريقة الحساب'
  ).replace(/\s*\(.*\)\s*$/, '');

  const hijriLabel = useMemo(() => {
    const hijri = getHijriToday();
    return `${WEEKDAYS_AR[hijri.weekday]} ${hijri.dayOfMonth} ${hijri.monthNameAr} ${hijri.year} هـ`;
  }, [currentTime]);
  const gregorianLabel = useMemo(
    () => currentTime.toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' }),
    [currentTime],
  );

  const selectCity = useCallback(
    (city: CityPreset) => {
      setLocation(city.lat, city.lng, city.nameAr, false);
      setCityModalOpen(false);
    },
    [setLocation],
  );

  const handleGpsLocate = useCallback(async () => {
    const success = await refreshGpsLocation();
    if (success) {
      setCityModalOpen(false);
    }
  }, [refreshGpsLocation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
      >
        {/* Hero: next prayer */}
        <ImageBackground
          source={require('../assets/images/mosque.jpg')}
          style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}
          contentFit="cover"
        >
          <LinearGradient colors={HERO_SCRIM} style={StyleSheet.absoluteFill} />

          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={HIT_SLOP}
              style={styles.headerIconBtn}
              accessibilityRole="button"
              accessibilityLabel="رجوع"
            >
              <Feather name="arrow-right" size={20} color={HERO_TEXT} />
            </Pressable>
            <Text style={styles.headerTitle}>مواقيت الصلاة</Text>
            <Pressable
              onPress={() => router.push('/qibla')}
              hitSlop={HIT_SLOP}
              style={styles.headerIconBtn}
              accessibilityRole="button"
              accessibilityLabel="اتجاه القبلة"
            >
              <Feather name="compass" size={19} color={HERO_TEXT} />
            </Pressable>
          </View>

          <View style={styles.heroCenter}>
            <Text style={styles.heroEyebrow}>الصلاة القادمة</Text>
            <Text style={styles.heroPrayerName}>{nextPrayer?.nameAr ?? 'الفجر'}</Text>
            <Text style={styles.heroAdhanTime}>{nextPrayer?.timeFormatted ?? '--:--'}</Text>
            <View style={styles.heroCountdownPill}>
              <Feather name="clock" size={13} color={HERO_TEXT} />
              <Text style={styles.heroCountdownText}>{remainingLabel}</Text>
            </View>
          </View>
        </ImageBackground>

        {/* Sheet: today's times */}
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleCol}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>مواقيت اليوم</Text>
              <Text style={[styles.sectionDate, { color: colors.textSecond }]}>{hijriLabel}</Text>
              <Text style={[styles.sectionDate, { color: colors.textMuted }]}>{gregorianLabel}</Text>
            </View>

            {/* Location & calculation method */}
            <View style={styles.settingsCol}>
              <Pressable
                onPress={() => setCityModalOpen(true)}
                hitSlop={HIT_SLOP}
                style={({ pressed }) => [
                  styles.settingChip,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`المدينة: ${cityName}، تغيير`}
              >
                <Feather name="map-pin" size={13} color={colors.accent} />
                <Text style={[styles.settingChipText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {cityName}
                </Text>
                <Feather name="chevron-down" size={13} color={colors.textMuted} />
              </Pressable>

              <Pressable
                onPress={() => setMethodModalOpen(true)}
                hitSlop={HIT_SLOP}
                style={({ pressed }) => [
                  styles.settingChip,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`طريقة الحساب: ${methodName}، تغيير`}
              >
                <Feather name="sliders" size={13} color={colors.accent} />
                <Text style={[styles.settingChipText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {methodName}
                </Text>
                <Feather name="chevron-down" size={13} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {prayerResult.all.map((item, index) => (
              <PrayerTimeRow
                key={item.key}
                item={item}
                icon={PRAYER_ICONS[item.key].icon}
                iconColor={PRAYER_ICONS[item.key].color}
                showDivider={index < prayerResult.all.length - 1}
              />
            ))}
          </View>

        </View>
      </ScrollView>

      {/* City Selector Modal */}
      <Modal
        visible={cityModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCityModalOpen(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setCityModalOpen(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>اختر المدينة</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* GPS Auto Detect Button */}
          <Pressable
            onPress={handleGpsLocate}
            disabled={locationLoading}
            style={[styles.gpsButton, { backgroundColor: colors.surface, borderColor: colors.gold }]}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={colors.gold} />
            ) : (
              <>
                <Feather name="navigation" size={18} color={colors.gold} />
                <Text style={[styles.gpsButtonText, { color: colors.textPrimary }]}>
                  تحديد موقعي الحالي تلقائيا (GPS)
                </Text>
              </>
            )}
          </Pressable>

          <FlatList
            data={CITY_PRESETS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cityList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => selectCity(item)}
                style={({ pressed }) => [
                  styles.cityRow,
                  {
                    backgroundColor: cityName === item.nameAr ? colors.surfaceSunk : colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.cityInfo}>
                  <Text style={[styles.cityName, { color: colors.textPrimary }]}>{item.nameAr}</Text>
                  <Text style={[styles.countryName, { color: colors.textSecond }]}>{item.countryAr}</Text>
                </View>
                {cityName === item.nameAr && <Feather name="check" size={18} color={colors.gold} />}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Calculation Method Modal */}
      <Modal
        visible={methodModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMethodModalOpen(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setMethodModalOpen(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>طريقة الحساب الفلكي</Text>
            <View style={{ width: 36 }} />
          </View>

          <FlatList
            data={CALCULATION_METHODS_META}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.cityList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setCalculationMethod(item.key);
                  setMethodModalOpen(false);
                }}
                style={({ pressed }) => [
                  styles.cityRow,
                  {
                    backgroundColor: calculationMethod === item.key ? colors.surfaceSunk : colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.cityName, { color: colors.textPrimary }]}>{item.nameAr}</Text>
                {calculationMethod === item.key && <Feather name="check" size={18} color={colors.gold} />}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingBottom: spacing['4xl'] + spacing.base,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    ...heroTextShadow,
    color: HERO_TEXT,
    fontFamily: fonts.defaultBold,
    fontSize: 17,
  },
  heroCenter: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  heroEyebrow: {
    ...heroTextShadow,
    color: HERO_TEXT_MUTED,
    fontFamily: fonts.defaultMedium,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  heroPrayerName: {
    ...heroTextShadow,
    color: HERO_TEXT,
    fontFamily: fonts.defaultBold,
    fontSize: 32,
    lineHeight: 44,
    marginTop: spacing.xs,
  },
  heroAdhanTime: {
    ...heroTextShadow,
    color: HERO_GOLD,
    fontFamily: fonts.defaultBold,
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    lineHeight: 56,
  },
  heroCountdownPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  heroCountdownText: {
    color: HERO_TEXT,
    fontFamily: fonts.defaultBold,
    fontSize: 13,
    writingDirection: 'rtl',
  },
  sheet: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    marginTop: -spacing['2xl'],
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionTitleCol: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  settingsCol: {
    gap: spacing.sm,
    width: 132,
  },
  settingChip: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 6,
    height: 34,
    paddingHorizontal: spacing.md,
  },
  settingChipText: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.defaultBold,
    fontSize: 13,
    writingDirection: 'rtl',
  },
  sectionTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    textAlign: 'right',
  },
  sectionDate: {
    fontFamily: fonts.defaultMedium,
    fontSize: 13,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  listCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 17,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  gpsButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1.5,
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  gpsButtonText: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
  },
  cityList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  cityRow: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  cityInfo: {
    alignItems: 'flex-end',
  },
  cityName: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
  },
  countryName: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginTop: 2,
  },
});
