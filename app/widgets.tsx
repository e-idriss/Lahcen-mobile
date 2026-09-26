/**
 * Widgets Customization & Preview Screen (`app/widgets.tsx`).
 *
 * Full RTL Arabic right-aligned screen allowing users to customize, preview,
 * sync, and save Home Screen Widgets for iOS and Android:
 * 1. Next Prayer & Countdown / Adhan Time
 * 2. Hijri Date & Calligraphy
 * 3. Continue Reading Quran
 * 4. Ayah of the Day & Reflection
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import {
  WidgetCard,
  type WidgetSize,
  type WidgetTheme,
  type WidgetType,
} from '../src/components/widgets/WidgetCards';
import { getPrayerTimes } from '../src/features/prayer/prayerService';
import { usePrayerStore } from '../src/features/prayer/prayerStore';
import { useMinuteTick } from '../src/features/prayer/useMinuteTick';
import { useSurahList } from '../src/features/reader/useQuranData';
import { useLastRead } from '../src/store/settings';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';
import { toArabicDigits } from '../src/utils/arabicDigits';
import { WEEKDAYS_AR, getHijriToday } from '../src/utils/hijriDate';
import { saveImageToGallery } from '../src/utils/saveToGallery';
import { syncWidgets } from '../src/features/widgets';
import {
  getTodayAyah,
  loadTodayAyahText,
  syncDailyAyahWidgetData,
  syncHijriWidgetData,
  syncLastReadWidgetData,
  syncNextPrayerWidgetData,
  type DailyAyahWidgetPayload,
  type HijriWidgetPayload,
  type LastReadWidgetPayload,
  type NextPrayerWidgetPayload,
} from '../src/utils/widgetSync';
import { getPrayerCalligraphyKey } from '../src/features/prayer/prayerCalligraphy';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WIDGET_CATEGORIES: Array<{
  id: WidgetType;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  {
    id: 'prayer',
    title: 'مواقيت الصلاة',
    subtitle: 'الصلاة القادمة والأذان',
    icon: 'clock',
  },
  {
    id: 'hijri',
    title: 'التاريخ الهجري',
    subtitle: 'اليوم والشهر بالخط العربي',
    icon: 'moon',
  },
  {
    id: 'lastRead',
    title: 'ورد القرآن',
    subtitle: 'متابعة آخر موضع قراءة',
    icon: 'book-open',
  },
  {
    id: 'dailyAyah',
    title: 'آية وتدبر',
    subtitle: 'آية يومية مع التأمل',
    icon: 'sun',
  },
];

const WIDGET_SIZES: Array<{ id: WidgetSize; label: string; desc: string }> = [
  { id: 'small', label: 'صغير', desc: 'مربع ٢×٢' },
  { id: 'medium', label: 'متوسط', desc: 'أفقي ٤×٢' },
  { id: 'large', label: 'كبير', desc: 'مربع ٤×٤' },
];

const WIDGET_THEMES: Array<{
  id: WidgetTheme;
  name: string;
  colorPreview: string;
  accentColor: string;
}> = [
  { id: 'mosque', name: 'ليلي فاخر', colorPreview: '#14110E', accentColor: '#D6B46F' },
  { id: 'emerald', name: 'زمردي', colorPreview: '#0A2018', accentColor: '#4CAF50' },
  { id: 'gold', name: 'ورقي ذهبي', colorPreview: '#FFF8EC', accentColor: '#9E7A2E' },
  { id: 'glass', name: 'زجاجي', colorPreview: '#25201B', accentColor: '#FFEED6' },
];


export default function WidgetsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const viewShotRef = useRef<ViewShotRef>(null);

  const [selectedType, setSelectedType] = useState<WidgetType>('prayer');
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('medium');
  const [selectedTheme, setSelectedTheme] = useState<WidgetTheme>('mosque');
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const syncToastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear the sync toast timer on unmount to prevent state update on unmounted component.
  useEffect(() => () => { clearTimeout(syncToastTimerRef.current); }, []);

  // Live App Data
  const { data: surahs } = useSurahList();
  const lastRead = useLastRead();
  const lat = usePrayerStore((s) => s.latitude);
  const lng = usePrayerStore((s) => s.longitude);
  const cityName = usePrayerStore((s) => s.cityName);
  const calculationMethod = usePrayerStore((s) => s.calculationMethod);
  const isHanafi = usePrayerStore((s) => s.isHanafi);
  const currentTime = useMinuteTick();

  const prayerResult = useMemo(() => {
    return getPrayerTimes(lat, lng, currentTime, calculationMethod, isHanafi);
  }, [lat, lng, currentTime, calculationMethod, isHanafi]);

  const prayerCalligraphyKey = prayerResult.nextPrayer?.key
    ? getPrayerCalligraphyKey(prayerResult.nextPrayer.key)
    : null;

  const today = useMemo(() => getHijriToday(), []);
  const todayAyah = useMemo(() => getTodayAyah(), []);

  // The verse text comes from the database, never from a literal in the code.
  const [todayAyahText, setTodayAyahText] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadTodayAyahText()
      .then((text) => {
        if (!cancelled) setTodayAyahText(text);
      })
      .catch(() => {
        // Leave it empty rather than showing hand-typed scripture.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lastReadSurah = useMemo(() => {
    if (!lastRead) return null;
    return surahs.find((s) => s.number === lastRead.surah) ?? null;
  }, [surahs, lastRead]);

  // Build Payload Objects for Widget Cards
  const prayerPayload: NextPrayerWidgetPayload = useMemo(
    () => ({
      nextPrayerKey: prayerResult.nextPrayer?.key || 'fajr',
      nextPrayerNameAr: prayerResult.nextPrayer?.nameAr || 'الفجر',
      nextPrayerCalligraphyKey: prayerCalligraphyKey,
      adhanTime: prayerResult.nextPrayer?.timeFormatted || '05:00',
      adhanTimeArabic: toArabicDigits(prayerResult.nextPrayer?.timeFormatted || '05:00'),
      timeRemainingFormatted: prayerResult.timeRemainingFormatted,
      timeRemainingSeconds: prayerResult.timeRemainingSeconds,
      cityName: cityName || 'موقعي الحالي',
      prayers: prayerResult.all.map((p) => ({
        key: p.key,
        nameAr: p.nameAr,
        timeFormatted: p.timeFormatted,
        isCurrent: p.isCurrent,
        isNext: p.isNext,
      })),
      updatedAt: new Date().toISOString(),
    }),
    [prayerResult, prayerCalligraphyKey, cityName],
  );

  const hijriPayload: HijriWidgetPayload = useMemo(() => {
    const now = new Date();
    return {
      day: today.dayOfMonth,
      dayArabic: toArabicDigits(today.dayOfMonth),
      weekdayName: WEEKDAYS_AR[today.weekday],
      weekdayLigature: today.weekdayLigature,
      monthNameAr: today.monthNameAr,
      monthLigature: today.monthLigature,
      year: today.year,
      yearArabic: toArabicDigits(today.year),
      yearWithSuffix: `${toArabicDigits(today.year)} هـ`,
      gregorianDateFormatted: now.toLocaleDateString('ar-SA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      updatedAt: new Date().toISOString(),
    };
  }, [today]);

  const lastReadPayload: LastReadWidgetPayload = useMemo(
    () => ({
      surahNumber: lastRead?.surah ?? 2,
      surahNameAr: lastReadSurah?.nameAr || 'البقرة',
      ayahNumber: lastRead?.ayah ?? 137,
      ayahArabic: toArabicDigits(lastRead?.ayah ?? 137),
      pageNumber: lastRead?.page ?? 21,
      pageArabic: toArabicDigits(lastRead?.page ?? 21),
      juzNumber: 1,
      juzArabic: '١',
      updatedAt: new Date().toISOString(),
    }),
    [lastRead, lastReadSurah],
  );

  const dailyAyahPayload: DailyAyahWidgetPayload = useMemo(
    () => ({
      surahNumber: todayAyah.surahNumber,
      surahNameAr: todayAyah.surahNameAr,
      ayahNumber: todayAyah.ayahNumber,
      ayahArabic: toArabicDigits(todayAyah.ayahNumber),
      pageNumber: todayAyah.pageNumber,
      text: todayAyahText,
      theme: todayAyah.theme,
      updatedAt: new Date().toISOString(),
    }),
    [todayAyah, todayAyahText],
  );

  // Sync data whenever screen opens or values change
  useEffect(() => {
    syncNextPrayerWidgetData(prayerPayload);
    syncHijriWidgetData();
    syncLastReadWidgetData(lastReadPayload);
    syncDailyAyahWidgetData();
  }, [prayerPayload, lastReadPayload]);

  const handleManualSync = async () => {
    setSyncStatus('جاري المزامنة...');
    await syncNextPrayerWidgetData(prayerPayload);
    await syncHijriWidgetData();
    await syncLastReadWidgetData(lastReadPayload);
    await syncDailyAyahWidgetData();
    // Push the fresh data into the real native home-screen widgets.
    await syncWidgets();
    setSyncStatus('تمت مزامنة بيانات الودجات بنجاح!');
    clearTimeout(syncToastTimerRef.current);
    syncToastTimerRef.current = setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleSaveWidgetImage = async () => {
    if (!viewShotRef.current) return;
    try {
      setIsSaving(true);

      const uri = await viewShotRef.current.capture?.();
      if (!uri) {
        Alert.alert('خطأ', 'تعذّر التقاط صورة الودجت. يرجى المحاولة مرة أخرى.');
        return;
      }
      const result = await saveImageToGallery(uri);
      if (result.status === 'permission-denied') {
        Alert.alert('إذن الوصول', 'يرجى منح إذن حفظ الصور لحفظ تصميم الودجت في المعرض.');
      } else if (result.status === 'failed') {
        Alert.alert('خطأ', 'تعذر حفظ صورة الودجت، يرجى المحاولة مرة أخرى.');
      } else {
        Alert.alert('تم الحفظ بنجاح', 'تم حفظ صورة الودجت في معرض الصور الخاص بك.');
      }
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ صورة الودجت، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + spacing.xs }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={HIT_SLOP}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
        >
          <Feather name="arrow-right" size={20} color={colors.textPrimary} />
        </Pressable>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          ودجات الشاشة الرئيسية
        </Text>

        <Pressable
          onPress={handleManualSync}
          hitSlop={HIT_SLOP}
          style={[styles.syncBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="مزامنة الودجات"
        >
          <Feather name="refresh-cw" size={17} color={colors.gold} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing['3xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Toast Notification */}
        {syncStatus && (
          <View style={[styles.toastBanner, { backgroundColor: colors.goldSoft }]}>
            <Feather name="check-circle" size={16} color={colors.gold} />
            <Text style={[styles.toastText, { color: colors.textPrimary }]}>{syncStatus}</Text>
          </View>
        )}

        {/* 1. Category Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecond }]}>
            اختر نوع الودجت
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {WIDGET_CATEGORIES.map((cat) => {
              const isSelected = selectedType === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedType(cat.id)}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.gold : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryIconCircle,
                      {
                        backgroundColor: isSelected ? colors.goldSoft : colors.surfaceSunk,
                      },
                    ]}
                  >
                    <Feather
                      name={cat.icon}
                      size={18}
                      color={isSelected ? colors.gold : colors.textPrimary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryTitle,
                      { color: isSelected ? colors.gold : colors.textPrimary },
                    ]}
                  >
                    {cat.title}
                  </Text>
                  <Text style={[styles.categorySubtitle, { color: colors.textMuted }]}>
                    {cat.subtitle}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 2. Interactive Widget Showcase Live Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textSecond }]}>
              معاينة الودجت المباشرة
            </Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveText, { color: colors.accent }]}>مباشر</Text>
            </View>
          </View>

          <View style={[styles.previewStage, { backgroundColor: colors.surfaceSunk, borderColor: colors.border }]}>
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1.0 }}
              style={styles.viewShotWrapper}
            >
              <WidgetCard
                type={selectedType}
                size={selectedSize}
                theme={selectedTheme}
                prayerData={prayerPayload}
                hijriData={hijriPayload}
                lastReadData={lastReadPayload}
                dailyAyahData={dailyAyahPayload}
              />
            </ViewShot>
          </View>

          {/* Quick Action Buttons Below Preview */}
          <View style={styles.previewActionRow}>
            <Pressable
              onPress={handleSaveWidgetImage}
              disabled={isSaving}
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.goldSoft }]}
            >
              <Feather name="download" size={16} color={colors.gold} />
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                {isSaving ? 'جاري الحفظ...' : 'حفظ كصورة'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleManualSync}
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.goldSoft }]}
            >
              <Feather name="refresh-cw" size={15} color={colors.accent} />
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                تحديث البيانات
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 3. Size Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecond }]}>
            حجم الودجت
          </Text>
          <View style={styles.sizeRow}>
            {WIDGET_SIZES.map((sz) => {
              const isSelected = selectedSize === sz.id;
              return (
                <Pressable
                  key={sz.id}
                  onPress={() => setSelectedSize(sz.id)}
                  style={[
                    styles.sizeCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.gold : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sizeLabel,
                      { color: isSelected ? colors.gold : colors.textPrimary },
                    ]}
                  >
                    {sz.label}
                  </Text>
                  <Text style={[styles.sizeDesc, { color: colors.textMuted }]}>
                    {sz.desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 4. Theme & Style Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecond }]}>
            طابع ومظهر الودجت
          </Text>
          <View style={styles.themeRow}>
            {WIDGET_THEMES.map((th) => {
              const isSelected = selectedTheme === th.id;
              return (
                <Pressable
                  key={th.id}
                  onPress={() => setSelectedTheme(th.id)}
                  style={[
                    styles.themeSelectorCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.gold : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.themeColorDot,
                      { backgroundColor: th.colorPreview, borderColor: th.accentColor },
                    ]}
                  />
                  <Text
                    style={[
                      styles.themeNameText,
                      { color: isSelected ? colors.gold : colors.textPrimary },
                    ]}
                  >
                    {th.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 5. How to add widgets step-by-step guide */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecond }]}>
            كيفية إضافة الودجت إلى شاشتك
          </Text>
          <View style={[styles.guideBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.guideStep}>
              <View style={[styles.stepNumberBadge, { backgroundColor: colors.goldSoft }]}>
                <Text style={[styles.stepNumberText, { color: colors.gold }]}>١</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>
                اضغط باستمرار على اي مساحة فارغة في الشاشة الرئيسية لهاتفك.
              </Text>
            </View>

            <View style={styles.guideStep}>
              <View style={[styles.stepNumberBadge, { backgroundColor: colors.goldSoft }]}>
                <Text style={[styles.stepNumberText, { color: colors.gold }]}>٢</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>
                اضغط على زر الإضافة (+) في أعلى الشاشة (iOS) أو قائمة الودجات (Android).
              </Text>
            </View>

            <View style={styles.guideStep}>
              <View style={[styles.stepNumberBadge, { backgroundColor: colors.goldSoft }]}>
                <Text style={[styles.stepNumberText, { color: colors.gold }]}>٣</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>
                ابحث عن تطبيق «القرآن الكريم» واختر نوع وحجم الودجت المفضل لديك.
              </Text>
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
  header: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  backBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  syncBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: {
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  toastBanner: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  toastText: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  liveIndicator: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 5,
  },
  liveDot: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  liveText: {
    fontFamily: fonts.defaultBold,
    fontSize: 11,
  },

  /* Category Cards */
  categoryRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingVertical: 4,
  },
  categoryCard: {
    alignItems: 'center',
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: 140,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIconCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 36,
    justifyContent: 'center',
    marginBottom: 4,
    width: 36,
  },
  categoryTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
    textAlign: 'center',
  },
  categorySubtitle: {
    fontFamily: fonts.defaultMedium,
    fontSize: 11,
    textAlign: 'center',
  },

  /* Live Preview Stage */
  viewShotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewStage: {
    alignItems: 'center',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 200,
    paddingVertical: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  previewActionRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1.2,
    flex: 1,
    flexDirection: 'row-reverse',
    gap: 6,
    height: 44,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
  },

  /* Size Selector */
  sizeRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  sizeCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  sizeLabel: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
  },
  sizeDesc: {
    fontFamily: fonts.defaultMedium,
    fontSize: 11,
    marginTop: 2,
  },

  /* Theme Selector */
  themeRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  themeSelectorCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  themeColorDot: {
    borderRadius: 8,
    borderWidth: 1.5,
    height: 22,
    width: 22,
  },
  themeNameText: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },

  /* Step-by-step Guide */
  guideBox: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: 12,
  },
  guideStep: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 10,
  },
  stepNumberBadge: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  stepNumberText: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.defaultMedium,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
});
