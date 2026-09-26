/**
 * "Where did I stop?" sheet.
 *
 * Lists every ayah on the current mushaf page — in the numbering of the riwaya
 * being read — so the reader saves the EXACT ayah they stopped at, not just the
 * page. The saved position is stored per riwaya (see `lastReadByRiwaya`).
 */

import { Feather } from '@expo/vector-icons';
import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAyahsForPage, type PageAyah } from '../../data/database';
import { useLastRead, useSettings, type AyahPosition } from '../../store/settings';
import { useTheme } from '../../theme/ThemeProvider';
import { HIT_SLOP, MIN_TOUCH_TARGET, fonts, radius, spacing } from '../../theme/tokens';
import { toArabicDigits } from '../../utils/arabicDigits';

interface Props {
  visible: boolean;
  onClose: () => void;
  page: number;
  /** Surah number → Arabic name, for the row labels. */
  surahNames: Map<number, string>;
  onSave: (position: AyahPosition) => void;
}

const SNIPPET_WORDS = 7;

function snippet(text: string): string {
  const words = text.trim().split(/\s+/);
  return words.length > SNIPPET_WORDS ? `${words.slice(0, SNIPPET_WORDS).join(' ')} …` : words.join(' ');
}

function SaveAyahSheetComponent({ visible, onClose, page, surahNames, onSave }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const riwaya = useSettings((s) => s.riwaya);
  const lastRead = useLastRead();
  const clearLastRead = useSettings((s) => s.clearLastRead);

  const [ayahs, setAyahs] = useState<PageAyah[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true);
    getAyahsForPage(page, riwaya)
      .then((rows) => {
        if (active) setAyahs(rows);
      })
      .catch(() => {
        if (active) setAyahs([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [visible, page, riwaya]);

  const riwayaLabel = riwaya === 'warsh' ? 'رواية ورش' : 'رواية حفص';
  const quranFont = riwaya === 'warsh' ? fonts.quranWarsh : fonts.quran;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={HIT_SLOP}
              style={[styles.closeButton, { backgroundColor: colors.surfaceSunk }]}
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
            >
              <Feather name="x" size={16} color={colors.textSecond} />
            </Pressable>

            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>أين توقفت؟</Text>
              <Text style={[styles.subtitle, { color: colors.textSecond }]}>
                {`اختر الآية · ص ${toArabicDigits(page)} · ${riwayaLabel}`}
              </Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          {lastRead && (
            <View style={[styles.currentRow, { backgroundColor: colors.goldSoft }]}>
              <Text style={[styles.currentText, { color: colors.textPrimary }]} numberOfLines={1}>
                {`المحفوظ حالياً: سورة ${surahNames.get(lastRead.surah) ?? lastRead.surah} · الآية ${toArabicDigits(lastRead.ayah)} · ص ${toArabicDigits(lastRead.page)}`}
              </Text>
              <Pressable
                onPress={clearLastRead}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="حذف موضع التوقف"
              >
                <Feather name="trash-2" size={16} color={colors.textSecond} />
              </Pressable>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={colors.gold} style={styles.loader} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {ayahs.map((a) => {
                const isSaved = lastRead?.surah === a.surah && lastRead.ayah === a.ayah;
                return (
                  <Pressable
                    key={`${a.surah}:${a.ayah}`}
                    onPress={() => onSave({ surah: a.surah, ayah: a.ayah, page })}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        borderColor: isSaved ? colors.gold : colors.border,
                        backgroundColor: pressed ? colors.surfaceSunk : isSaved ? colors.goldSoft : colors.surface,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`حفظ التوقف عند سورة ${surahNames.get(a.surah) ?? a.surah}، الآية ${a.ayah}`}
                  >
                    <View style={[styles.ayahBadge, { borderColor: colors.gold }]}>
                      <Text style={[styles.ayahBadgeText, { color: colors.gold }]}>{toArabicDigits(a.ayah)}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowTitle, { color: colors.textSecond }]}>
                        {`سورة ${surahNames.get(a.surah) ?? a.surah} · الآية ${toArabicDigits(a.ayah)}`}
                      </Text>
                      <Text
                        style={[styles.rowSnippet, { color: colors.textPrimary, fontFamily: quranFont }]}
                        numberOfLines={1}
                        allowFontScaling={false}
                      >
                        {snippet(a.text)}
                      </Text>
                    </View>
                    <Feather
                      name={isSaved ? 'check-circle' : 'bookmark'}
                      size={18}
                      color={isSaved ? colors.gold : colors.textSecond}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export const SaveAyahSheet = memo(SaveAyahSheetComponent);

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
    maxHeight: '75%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerSpacer: {
    width: 32,
  },
  titleBlock: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontFamily: fonts.defaultBold,
    fontSize: 17,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  currentRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currentText: {
    flex: 1,
    fontFamily: fonts.defaultMedium,
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  loader: {
    marginVertical: spacing.xl,
  },
  row: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: spacing.md,
    marginBottom: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ayahBadge: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  ayahBadgeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.defaultMedium,
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowSnippet: {
    fontSize: 18,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
