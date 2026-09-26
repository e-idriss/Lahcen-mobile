/**
 * Prayer Times Screen (`app/prayer-times.tsx`).
 *
 * Displays precise astronomical prayer times with a luxury mosque hero background,
 * live countdown to the next prayer, GPS auto-location, city selector, calculation methods,
 * and Madinah Adhan audio player.
 */

import { Feather } from '@expo/vector-icons';
import { Image, ImageBackground } from 'expo-image';
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
import { usePrayerStore } from '../src/features/prayer/prayerStore';
import type { CityPreset, PrayerKey } from '../src/features/prayer/types';
import { useMinuteTick } from '../src/features/prayer/useMinuteTick';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';

/**
 * Icon names are typed against Feather's own glyph union rather than `string`,
 * so a typo fails the build instead of silently rendering nothing.
 */
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const PRAYER_ICONS: Record<PrayerKey, { icon: FeatherIconName; color: string }> = {
  fajr: { icon: 'sunrise', color: '#E8A07C' },
  sunrise: { icon: 'sun', color: '#D6B46F' },
  dhuhr: { icon: 'sun', color: '#827148' },
  asr: { icon: 'cloud', color: '#A5AF79' },
  maghrib: { icon: 'sunset', color: '#E8A07C' },
  isha: { icon: 'moon', color: '#827148' },
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
      >
        {/* Top Hero: Full-Width Mosque Backdrop (0 Margin Top / Left / Right) */}
        <ImageBackground
          source={require('../assets/images/mosque.jpg')}
          style={[
            styles.heroBackdrop,
            {
              borderBottomColor: colors.goldSoft,
              paddingTop: insets.top + 8,
            },
          ]}
          imageStyle={styles.heroImage}
        >
          {/* Scrim overlay for rich contrast */}
          <View style={[styles.scrim, { backgroundColor: colors.overlayScrim }]} />

          <View style={styles.heroInnerContent}>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={HIT_SLOP}
                style={[styles.headerBtn, { backgroundColor: 'rgba(0, 0, 0, 0.55)', borderColor: 'rgba(255, 255, 255, 0.3)' }]}
                accessibilityRole="button"
                accessibilityLabel="رجوع"
              >
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </Pressable>

              <Text style={[styles.headerTitleText, { color: '#FFFFFF' }]}>
                مواقيت الصلاة
              </Text>

              <Pressable
                onPress={() => router.push('/qibla')}
                hitSlop={HIT_SLOP}
                style={[styles.qiblaHeaderBtn, { backgroundColor: 'rgba(0, 0, 0, 0.55)', borderColor: '#F5D77F' }]}
                accessibilityRole="button"
                accessibilityLabel="اتجاه القبلة"
              >
                <Feather name="compass" size={16} color="#F5D77F" />
                <Text style={[styles.qiblaHeaderBtnText, { color: '#F5D77F' }]}>القبلة</Text>
              </Pressable>
            </View>

            {/* Hero Countdown Info */}
            <View style={styles.heroCountdownSection}>
              <View style={[styles.nextBadge, { backgroundColor: 'rgba(232, 160, 124, 0.4)', borderColor: '#E8A07C' }]}>
                <Text style={[styles.nextBadgeText, { color: '#FFFFFF' }]}>الصلاة القادمة</Text>
              </View>

              <Text style={[styles.heroPrayerName, { color: '#FFFFFF' }]}>
                صلاة {prayerResult.nextPrayer?.nameAr || 'الفجر'}
              </Text>

              <Text style={[styles.heroTimeRemaining, { color: '#FCE38A' }]}>
                {prayerResult.timeRemainingFormatted}
              </Text>

              <Text style={[styles.heroTargetTime, { color: '#FFFFFF' }]}>
                موعد الأذان: {prayerResult.nextPrayer?.timeFormatted || '--:--'}
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* All Prayers List Section (Rounded Top overlapping image) */}
        <View
          style={[
            styles.prayersSection,
            {
              backgroundColor: colors.bg,
              borderTopColor: colors.goldSoft,
            },
          ]}
        >
          {/* City & Calculation Method Selector Row */}
          <View style={styles.bottomSelectorRow}>
            <Pressable
              onPress={() => setCityModalOpen(true)}
              style={[
                styles.selectorChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="map-pin" size={14} color={colors.gold} />
              <Text style={[styles.selectorChipText, { color: colors.textPrimary }]}>
                {cityName}
              </Text>
              <Feather name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => setMethodModalOpen(true)}
              style={[
                styles.selectorChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="settings" size={14} color={colors.textSecond} />
              <Text style={[styles.selectorChipText, { color: colors.textSecond }]}>
                طريقة الحساب
              </Text>
              <Feather name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            مواقيت اليوم
          </Text>

          <View style={styles.prayersGrid}>
            {prayerResult.all.map((item) => {
              const isNext = item.isNext;
              const iconConfig = PRAYER_ICONS[item.key] || { icon: 'sun', color: colors.gold };

              return (
                <View
                  key={item.key}
                  style={[
                    styles.prayerCard,
                    {
                      backgroundColor: isNext ? colors.surfaceSunk : colors.surface,
                      borderColor: isNext ? colors.gold : colors.border,
                      borderWidth: isNext ? 1.5 : 1,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    {isNext ? (
                      <View style={[styles.activePill, { backgroundColor: colors.gold }]}>
                        <Text style={styles.activePillText}>القادمة</Text>
                      </View>
                    ) : (
                      <View style={{ width: 1 }} />
                    )}

                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: isNext ? colors.gold : colors.surfaceSunk },
                      ]}
                    >
                      <Feather
                        name={iconConfig.icon}
                        size={17}
                        color={isNext ? '#1A1713' : iconConfig.color}
                      />
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.prayerNameText,
                      { color: isNext ? colors.gold : colors.textPrimary, fontFamily: fonts.defaultBold },
                    ]}
                  >
                    {item.nameAr}
                  </Text>

                  <Text
                    style={[
                      styles.prayerTimeText,
                      { color: isNext ? colors.gold : colors.textPrimary },
                    ]}
                  >
                    {item.timeFormatted}
                  </Text>
                </View>
              );
            })}
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
  scrollContent: {
    paddingBottom: spacing['4xl'],
  },
  heroBackdrop: {
    overflow: 'hidden',
    paddingBottom: spacing['4xl'],
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  heroImage: {},
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  heroInnerContent: {
    zIndex: 2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleText: {
    fontFamily: fonts.defaultBold,
    fontSize: 18,
  },
  headerBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  qiblaHeaderBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  qiblaHeaderBtnText: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
  },
  bottomSelectorRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  selectorChip: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  selectorChipText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 12,
  },
  heroCountdownSection: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  nextBadge: {
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  nextBadgeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  heroPrayerName: {
    fontFamily: fonts.defaultBold,
    fontSize: 28,
    marginBottom: 2,
  },
  heroTimeRemaining: {
    fontFamily: fonts.defaultBold,
    fontSize: 34,
    letterSpacing: 2,
    marginVertical: 4,
  },
  heroTargetTime: {
    fontFamily: fonts.defaultMedium,
    fontSize: 14,
    marginTop: 2,
  },
  prayersSection: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.5,
    marginTop: -26,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 17,
    marginBottom: spacing.md,
    textAlign: 'right',
  },
  prayersGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm + 2,
  },
  prayerCard: {
    width: '48%',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  prayerNameText: {
    fontSize: 16,
    textAlign: 'right',
    marginTop: 2,
  },
  prayerTimeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    textAlign: 'right',
    marginTop: 4,
  },
  activePill: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: {
    color: '#1A1713',
    fontFamily: fonts.defaultBold,
    fontSize: 10,
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
