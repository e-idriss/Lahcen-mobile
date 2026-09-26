/**
 * Qasida Reader Screen (`app/qasida.tsx`).
 *
 * Renders one devotional poem verse-by-verse: two hemistichs per line with the
 * verse number between them, grouped under its section headings. A prelude /
 * refrain block (al-Burda's «مَوْلَايَ صَلِّ») is drawn once at the top.
 *
 * The Arabic uses the Elgharib face (`fonts.quran`) with a generous line height,
 * matching the reader's typography rules. This is not scripture, so it lives on
 * its own screen and never touches the mushaf pager.
 */

import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IslamicEmblem } from '../src/components/ui/IslamicEmblem';
import {
  getQasida,
  getQasidaSections,
  getQasidaVerses,
  type Qasida,
  type QasidaVerse,
} from '../src/data/database';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';
import { toArabicDigits } from '../src/utils/arabicDigits';

type Row =
  | { kind: 'prelude'; verses: QasidaVerse[] }
  | { kind: 'section'; index: number; title: string }
  | { kind: 'verse'; verse: QasidaVerse };

export default function QasidaScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [qasida, setQasida] = useState<Qasida | null>(null);
  const [verses, setVerses] = useState<QasidaVerse[]>([]);
  const [sectionTitles, setSectionTitles] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!slug) return;
    Promise.all([getQasida(slug), getQasidaVerses(slug), getQasidaSections(slug)])
      .then(([q, vs, sections]) => {
        if (!active) return;
        setQasida(q);
        setVerses(vs);
        setSectionTitles(new Map(sections.map((s) => [s.index, s.title])));
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const prelude = verses.filter((v) => v.sectionIndex === 0);
    if (prelude.length > 0) out.push({ kind: 'prelude', verses: prelude });

    let currentSection = -1;
    for (const verse of verses) {
      if (verse.sectionIndex === 0) continue;
      if (verse.sectionIndex !== currentSection) {
        currentSection = verse.sectionIndex;
        out.push({
          kind: 'section',
          index: currentSection,
          title: sectionTitles.get(currentSection) ?? '',
        });
      }
      out.push({ kind: 'verse', verse });
    }
    return out;
  }, [verses, sectionTitles]);

  const handleShare = async () => {
    if (!qasida) return;
    const body = verses
      .filter((v) => v.sectionIndex > 0)
      .map((v) => `${v.hemistichA}  ...  ${v.hemistichB}`)
      .join('\n');
    try {
      await Share.share({ message: `${qasida.name}\n${qasida.fullName}\n\n${body}` });
    } catch {
      // cancelled
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, paddingTop: insets.top > 0 ? 0 : spacing.sm },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={HIT_SLOP}
          style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
        >
          <Feather name="arrow-right" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {qasida?.name ?? 'قصيدة'}
        </Text>
        <Pressable
          onPress={() => void handleShare()}
          hitSlop={HIT_SLOP}
          style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="مشاركة القصيدة"
        >
          <Feather name="share-2" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(row, i) =>
            row.kind === 'verse'
              ? `v${row.verse.id}`
              : row.kind === 'section'
                ? `s${row.index}`
                : `p${i}`
          }
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.base,
            paddingBottom: insets.bottom + spacing['3xl'],
          }}
          ListHeaderComponent={
            qasida ? (
              <View style={styles.titleBlock}>
                <IslamicEmblem size={30} color={colors.gold} fillColor={colors.bg} />
                <Text style={[styles.fullName, { color: colors.gold }]}>{qasida.fullName}</Text>
                <Text style={[styles.author, { color: colors.textSecond }]}>{qasida.author}</Text>
                {qasida.note ? (
                  <Text style={[styles.note, { color: colors.textMuted }]}>{qasida.note}</Text>
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.kind === 'prelude') {
              return (
                <View style={[styles.preludeBox, { backgroundColor: colors.surfaceSunk }]}>
                  {item.verses.map((v) => (
                    <Text
                      key={v.id}
                      style={[styles.preludeText, { color: colors.gold }]}
                      allowFontScaling={false}
                      accessibilityLanguage="ar"
                    >
                      {v.hemistichA}
                      {'\n'}
                      {v.hemistichB}
                    </Text>
                  ))}
                </View>
              );
            }

            if (item.kind === 'section') {
              return (
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionRule, { backgroundColor: colors.goldSoft }]} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {item.title}
                  </Text>
                  <View style={[styles.sectionRule, { backgroundColor: colors.goldSoft }]} />
                </View>
              );
            }

            const { verse } = item;
            return (
              <View style={[styles.verseRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.verseNumber, { backgroundColor: colors.surfaceSunk }]}>
                  <Text style={[styles.verseNumberText, { color: colors.gold }]} allowFontScaling={false}>
                    {toArabicDigits(verse.verseNumber)}
                  </Text>
                </View>
                <View style={styles.verseText}>
                  <Text
                    style={[styles.hemistich, { color: colors.textPrimary }]}
                    allowFontScaling={false}
                    accessibilityLanguage="ar"
                  >
                    {verse.hemistichA}
                  </Text>
                  <Text
                    style={[styles.hemistich, styles.hemistichB, { color: colors.textPrimary }]}
                    allowFontScaling={false}
                    accessibilityLanguage="ar"
                  >
                    {verse.hemistichB}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { flex: 1, fontFamily: fonts.defaultBold, fontSize: 18, textAlign: 'center' },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  centerContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  titleBlock: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  fullName: { fontFamily: fonts.defaultBold, fontSize: 16, textAlign: 'center' },
  author: { fontFamily: fonts.default, fontSize: 13, textAlign: 'center' },
  note: {
    fontFamily: fonts.default,
    fontSize: 12,
    lineHeight: 20,
    marginTop: spacing.xs,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  preludeBox: {
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  preludeText: {
    fontFamily: fonts.quran,
    fontSize: 19,
    lineHeight: 40,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.md,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionRule: { flex: 1, height: StyleSheet.hairlineWidth },
  sectionTitle: { fontFamily: fonts.defaultBold, fontSize: 15, textAlign: 'center' },
  verseRow: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  verseText: { flex: 1 },
  hemistich: {
    fontFamily: fonts.quran,
    fontSize: 19,
    lineHeight: 40,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hemistichB: { opacity: 0.92 },
  verseNumber: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 26,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minWidth: 26,
    paddingHorizontal: 4,
  },
  verseNumberText: { fontFamily: fonts.defaultMedium, fontSize: 12 },
});
