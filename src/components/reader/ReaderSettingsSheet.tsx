/**
 * Reader Settings Sheet.
 *
 * Provides instant customization for:
 * - Theme selection (Paper, Night, Sepia, System)
 * - Arabic font size adjuster with live preview
 * - Translation toggle (Sahih International)
 * - Navigation quick jump (Page / Juz)
 *
 * Fully RTL Arabic right-aligned with Thmanyah UI typography.
 */

import { Feather } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBasmalah } from '../../features/reader/useQuranData';
import { useSettings } from '../../store/settings';
import { useTheme } from '../../theme/ThemeProvider';
import {
  ARABIC_FONT_SIZE,
  HIT_SLOP,
  MIN_TOUCH_TARGET,
  arabicTextStyle,
  fonts,
  palette,
  radius,
  spacing,
  type ThemeName,
} from '../../theme/tokens';
import { toArabicDigits } from '../../utils/arabicDigits';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentPage: number;
}

function ReaderSettingsSheetComponent({ visible, onClose, currentPage }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // The size preview shows real scripture, so it reads Al-Fatiha 1:1 from the
  // database like every other Basmalah in the app — never a literal.
  const basmalahText = useBasmalah();

  const themePreference = useSettings((s) => s.themePreference);
  const setThemePreference = useSettings((s) => s.setThemePreference);
  const showTranslation = useSettings((s) => s.showTranslation);
  const toggleTranslation = useSettings((s) => s.toggleTranslation);
  const riwaya = useSettings((s) => s.riwaya);
  const setRiwaya = useSettings((s) => s.setRiwaya);
  const warshFont = useSettings((s) => s.warshFont);
  const setWarshFont = useSettings((s) => s.setWarshFont);

  const themes: Array<{ key: ThemeName | 'system'; label: string; bg: string; border: string }> = [
    { key: 'light', label: 'ورقي', bg: palette.light.bg, border: palette.light.accent },
    { key: 'dark', label: 'ليلي', bg: palette.dark.bg, border: palette.dark.accent },
    { key: 'sepia', label: 'بني فاتح', bg: palette.sepia.bg, border: palette.sepia.accent },
    { key: 'system', label: 'النظام', bg: colors.surfaceSunk, border: colors.border },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          {/* Header Bar (RTL) */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={HIT_SLOP}
              style={[styles.closeButton, { backgroundColor: colors.surfaceSunk }]}
              accessibilityRole="button"
              accessibilityLabel="إغلاق الإعدادات"
            >
              <Feather name="x" size={16} color={colors.textSecond} />
            </Pressable>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              إعدادات القراءة
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Theme Picker */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecond }]}>
                نمط القراءة
              </Text>
              <View style={styles.themeGrid}>
                {themes.map((t) => {
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
                            color:
                              t.key === 'dark'
                                ? '#FFEED6'
                                : t.key === 'light'
                                ? '#2D2619'
                                : colors.textPrimary,
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
                      <Text style={{ fontFamily: 'WarshUthmanic', fontSize: 17, color: colors.textPrimary, textAlign: 'center', lineHeight: 42 }}>
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
                      <Text style={{ fontFamily: fonts.quranWarshAlmaghribi, fontSize: 17, color: colors.textPrimary, textAlign: 'center', lineHeight: 42 }}>
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
                  {
                    backgroundColor: colors.surfaceSunk,
                    borderColor: colors.border,
                  },
                ]}
                accessibilityRole="switch"
                accessibilityState={{ checked: showTranslation }}
                accessibilityLabel="إظهار الترجمة الإنجليزية"
              >
                <View style={styles.toggleTextGroup}>
                  <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                    الترجمة الإنجليزية
                  </Text>
                  <Text style={[styles.toggleSubtitle, { color: colors.textMuted }]}>
                    صحيح إنترناشونال، أسفل كل آية
                  </Text>
                </View>

                <View
                  style={[
                    styles.switchTrack,
                    {
                      backgroundColor: showTranslation ? colors.accent : colors.border,
                    },
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
              </Pressable>
            </View>

            {/* Reading Info Footer */}
            <View style={[styles.footerInfo, { borderTopColor: colors.border }]}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                {`صفحة المصحف الحالية ص ${toArabicDigits(currentPage)} (${toArabicDigits(currentPage)} / 604)`}
              </Text>
              <Text style={[styles.footerSubText, { color: colors.textMuted }]}>
                {riwaya === 'warsh'
                  ? 'رواية ورش عن نافع · 15 سطرًا · الرسم العثماني المغربي'
                  : 'رواية حفص عن عاصم · 15 سطرًا · خط مجمع الملك فهد QCF'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    maxHeight: '80%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  headerSpacer: {
    width: MIN_TOUCH_TARGET,
  },
  title: {
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  content: {
    paddingVertical: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
    letterSpacing: 0.4,
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
    marginTop: spacing.sm,
  },
  riwayaCard: {
    alignItems: 'center',
    borderRadius: radius.md,
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
    marginTop: spacing.sm,
  },
  themeCard: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  themeCircle: {
    borderRadius: 999,
    borderWidth: 1.5,
    height: 14,
    marginBottom: 6,
    width: 14,
  },
  themeLabel: {
    fontSize: 14,
  },
  stepperContainer: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: spacing.xs,
  },
  stepperButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 48,
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
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  toggleTextGroup: {
    flex: 1,
    alignItems: 'flex-start',
  },
  toggleTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  toggleSubtitle: {
    fontFamily: fonts.default,
    fontSize: 13,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  switchTrack: {
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 42,
  },
  switchThumb: {
    borderRadius: 999,
    elevation: 2,
    height: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    width: 20,
  },
  footerInfo: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.base,
  },
  footerText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  footerSubText: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginTop: 3,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

export const ReaderSettingsSheet = memo(ReaderSettingsSheetComponent);
