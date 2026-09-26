/**
 * Settings Screen (`app/(tabs)/settings.tsx`).
 *
 * Full RTL Arabic right-aligned layout with clean typography, theme selection,
 * Arabic reading size adjuster, translation toggle, and Adhan audio notifications.
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAdhanAudio } from '../../src/features/prayer/adhanAudio';
import { usePrayerStore } from '../../src/features/prayer/prayerStore';
import { useBasmalah } from '../../src/features/reader/useQuranData';
import { useSettings } from '../../src/store/settings';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  ARABIC_FONT_SIZE,
  arabicTextStyle,
  fonts,
  HIT_SLOP,
  radius,
  spacing,
  type ThemeName,
} from '../../src/theme/tokens';
import { toArabicDigits } from '../../src/utils/arabicDigits';

const THEMES: Array<{ key: ThemeName | 'system'; label: string; bg: string; border: string }> = [
  { key: 'light', label: 'ورقي', bg: '#FFEED6', border: '#827148' },
  { key: 'dark', label: 'ليلي', bg: '#151310', border: '#A5AF79' },
  { key: 'sepia', label: 'بني فاتح', bg: '#F7EAD7', border: '#827148' },
  { key: 'system', label: 'النظام', bg: '#EDEDED', border: '#9C8F79' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // The size preview shows real scripture, so it reads Al-Fatiha 1:1 from the
  // database like every other Basmalah in the app — never a literal.
  const basmalahText = useBasmalah();

  const themePreference = useSettings((s) => s.themePreference);
  const setThemePreference = useSettings((s) => s.setThemePreference);
  const arabicFontSize = useSettings((s) => s.arabicFontSize);
  const setArabicFontSize = useSettings((s) => s.setArabicFontSize);
  const showTranslation = useSettings((s) => s.showTranslation);
  const toggleTranslation = useSettings((s) => s.toggleTranslation);
  const riwaya = useSettings((s) => s.riwaya);
  const setRiwaya = useSettings((s) => s.setRiwaya);
  const warshFont = useSettings((s) => s.warshFont);
  const setWarshFont = useSettings((s) => s.setWarshFont);

  const adhanAudioEnabled = usePrayerStore((s) => s.adhanAudioEnabled);
  const setAdhanAudioEnabled = usePrayerStore((s) => s.setAdhanAudioEnabled);

  const isAdhanPlaying = useAdhanAudio((s) => s.isPlaying);
  const toggleAdhan = useAdhanAudio((s) => s.toggleAdhan);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + spacing.xs }]}>
      {/* Header with Back Button */}
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
          الإعدادات
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing['3xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecond }]}>
            نمط القراءة
          </Text>
          <View style={styles.themeGrid}>
            {THEMES.map((t) => {
              const isSelected = themePreference === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setThemePreference(t.key)}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: t.bg,
                      borderColor: isSelected ? colors.gold : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`نمط ${t.label}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={[
                      styles.themeCircle,
                      {
                        borderColor: t.border,
                        backgroundColor: isSelected ? colors.accent : 'transparent',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      {
                        color: t.key === 'dark' ? '#FFEED6' : '#2D2619',
                        fontFamily: isSelected ? fonts.defaultBold : fonts.defaultMedium,
                      },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>



        {/* Riwaya Picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecond }]}>
            رواية المصحف
          </Text>
          <View style={styles.riwayaRow}>
            <Pressable
              onPress={() => setRiwaya('hafs')}
              style={[
                styles.riwayaCard,
                {
                  backgroundColor: riwaya === 'hafs' ? colors.surface : colors.surfaceSunk,
                  borderColor: riwaya === 'hafs' ? colors.gold : colors.border,
                  borderWidth: riwaya === 'hafs' ? 2 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="رواية حفص عن عاصم"
            >
              <Text
                style={[
                  styles.riwayaTitle,
                  {
                    color: colors.textPrimary,
                    fontFamily: riwaya === 'hafs' ? fonts.defaultBold : fonts.defaultMedium,
                  },
                ]}
              >
                حفص عن عاصم
              </Text>
              <Text style={[styles.riwayaSubtitle, { color: colors.textMuted }]}>
                مصحف المدينة · خط QCF
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setRiwaya('warsh')}
              style={[
                styles.riwayaCard,
                {
                  backgroundColor: riwaya === 'warsh' ? colors.surface : colors.surfaceSunk,
                  borderColor: riwaya === 'warsh' ? colors.gold : colors.border,
                  borderWidth: riwaya === 'warsh' ? 2 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="رواية ورش عن نافع"
            >
              <Text
                style={[
                  styles.riwayaTitle,
                  {
                    color: colors.textPrimary,
                    fontFamily: riwaya === 'warsh' ? fonts.defaultBold : fonts.defaultMedium,
                  },
                ]}
              >
                ورش عن نافع
              </Text>
              <Text style={[styles.riwayaSubtitle, { color: colors.textMuted }]}>
                المصحف المغربي · خط مغربي
              </Text>
            </Pressable>
          </View>

          {/* Warsh Font Style Picker */}
          {riwaya === 'warsh' && (
            <View style={{ marginTop: spacing.sm, gap: 6 }}>
              <Text style={[styles.sectionTitle, { color: colors.textSecond, marginBottom: 4 }]}>
                خط رسم المصحف
              </Text>
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                <Pressable
                  onPress={() => setWarshFont('uthmani')}
                  style={[styles.riwayaCard, { flex: 1,
                    backgroundColor: warshFont === 'uthmani' ? colors.surface : colors.surfaceSunk,
                    borderColor: warshFont === 'uthmani' ? colors.gold : colors.border,
                    borderWidth: warshFont === 'uthmani' ? 2 : 1,
                  }]}
                >
                  <Text style={{ fontFamily: 'WarshUthmanic', fontSize: 19, color: colors.textPrimary, textAlign: 'center', lineHeight: 46 }}>
                    يَوْمِ الدِّينِ
                  </Text>
                  <Text style={[styles.riwayaTitle, { color: colors.textPrimary, fontFamily: warshFont === 'uthmani' ? fonts.defaultBold : fonts.defaultMedium }]}>عثماني</Text>
                  <Text style={[styles.riwayaSubtitle, { color: colors.textMuted }]}>Uthmani</Text>
                </Pressable>
                <Pressable
                  onPress={() => setWarshFont('almaghribi')}
                  style={[styles.riwayaCard, { flex: 1,
                    backgroundColor: warshFont === 'almaghribi' ? colors.surface : colors.surfaceSunk,
                    borderColor: warshFont === 'almaghribi' ? colors.gold : colors.border,
                    borderWidth: warshFont === 'almaghribi' ? 2 : 1,
                  }]}
                >
                  <Text style={{ fontFamily: fonts.quranWarshAlmaghribi, fontSize: 19, color: colors.textPrimary, textAlign: 'center', lineHeight: 46 }}>
                    ﻳﻮﻡ ﺍﻟﺪﻳﻦ
                  </Text>
                  <Text style={[styles.riwayaTitle, { color: colors.textPrimary, fontFamily: warshFont === 'almaghribi' ? fonts.defaultBold : fonts.defaultMedium }]}>مغربي</Text>
                  <Text style={[styles.riwayaSubtitle, { color: colors.textMuted }]}>Almaghribi</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Translation Toggle */}
        <View style={styles.section}>
          <Pressable
            onPress={toggleTranslation}
            style={[
              styles.toggleRow,
              { backgroundColor: colors.surfaceSunk, borderColor: colors.border },
            ]}
            accessibilityRole="switch"
            accessibilityState={{ checked: showTranslation }}
            accessibilityLabel="إظهار الترجمة الإنجليزية"
          >
            {/* Switch on the Left */}
            <View
              style={[
                styles.switchTrack,
                { backgroundColor: showTranslation ? colors.accent : colors.border },
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: showTranslation ? 18 : 2 }],
                  },
                ]}
              />
            </View>

            {/* Text on the Right */}
            <View style={styles.toggleTextGroup}>
              <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                الترجمة الإنجليزية
              </Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textMuted }]}>
                صحيح إنترناشونال، أسفل كل آية
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Adhan & Prayer Alerts Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecond }]}>
            الأذان ومواقيت الصلاة
          </Text>

          <Pressable
            onPress={() => setAdhanAudioEnabled(!adhanAudioEnabled)}
            style={[
              styles.toggleRow,
              { backgroundColor: colors.surfaceSunk, borderColor: colors.border },
            ]}
            accessibilityRole="switch"
            accessibilityState={{ checked: adhanAudioEnabled }}
            accessibilityLabel="تنبيهات صوت الأذان"
          >
            {/* Switch on the Left */}
            <View
              style={[
                styles.switchTrack,
                { backgroundColor: adhanAudioEnabled ? colors.accent : colors.border },
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: adhanAudioEnabled ? 18 : 2 }],
                  },
                ]}
              />
            </View>

            {/* Text on the Right */}
            <View style={styles.toggleTextGroup}>
              <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                تنبيه الأذان عند دخول وقت الصلاة
              </Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textMuted }]}>
                إشعار مجدول بصوت أذان الحرم النبوي في الأوقات الخمسة
              </Text>
            </View>
          </Pressable>

          {/* Test/Preview Adhan audio button */}
          <Pressable
            onPress={() => void toggleAdhan()}
            style={({ pressed }) => [
              styles.adhanPreviewBtn,
              {
                backgroundColor: isAdhanPlaying ? colors.gold : colors.surface,
                borderColor: colors.gold,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather
              name={isAdhanPlaying ? 'pause-circle' : 'volume-2'}
              size={18}
              color={isAdhanPlaying ? '#1A1713' : colors.gold}
            />
            <Text
              style={[
                styles.adhanPreviewText,
                { color: isAdhanPlaying ? '#1A1713' : colors.textPrimary },
              ]}
            >
              {isAdhanPlaying ? 'إيقاف الأذان التجريبي' : 'استماع تجريبي لأذان المدينة المنورة'}
            </Text>
          </Pressable>
        </View>

        {/* Footer Info */}
        <View style={[styles.footerInfo, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            لا تغادر أي بيانات جهازك · حفظ محلي آمن
          </Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  title: {
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
    marginBottom: spacing.xs,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sizeBadge: {
    borderRadius: radius.sm,
    fontFamily: fonts.defaultBold,
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  riwayaRow: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  riwayaCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  riwayaTitle: {
    fontSize: 15,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  riwayaSubtitle: {
    fontFamily: fonts.defaultMedium,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  themeGrid: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  themeCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  themeCircle: {
    borderRadius: radius.full,
    borderWidth: 1.5,
    height: 14,
    marginBottom: 6,
    width: 14,
  },
  themeLabel: {
    fontSize: 13,
  },
  stepperContainer: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
  },
  stepperButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  stepperIcon: {
    fontSize: 22,
    fontWeight: '600',
  },
  previewBox: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  previewText: {
    textAlign: 'center',
  },
  toggleRow: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  toggleTextGroup: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: spacing.md,
  },
  toggleTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  toggleSubtitle: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  switchTrack: {
    borderRadius: radius.full,
    height: 24,
    justifyContent: 'center',
    width: 42,
  },
  switchThumb: {
    borderRadius: radius.full,
    elevation: 2,
    height: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    width: 20,
  },
  adhanPreviewBtn: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  adhanPreviewText: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
  },
  footerInfo: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    paddingTop: spacing.base,
  },
  footerText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  navCard: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1.2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  navCardContent: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 12,
    flex: 1,
  },
  navCardTextGroup: {
    alignItems: 'flex-end',
    flex: 1,
  },
  navCardIconCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
