/**
 * Azkar Category Detail Screen (`app/azkar-category.tsx`).
 *
 * Displays all Adhkar for a specific category with interactive repetition counters,
 * haptic vibration feedback, completion tracking, copying, and sharing.
 */

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAzkarByCategory, type ZekrItem } from '../src/data/database';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';

function formatZekrText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^\(\(\s*/, '')
    .replace(/\s*\)\)\.?$/, '')
    .replace(/\(\(/g, '«')
    .replace(/\)\)/g, '»')
    .replace(/\*/g, ' ')
    .trim();
}

export default function AzkarCategoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category: string }>();

  const categoryName = params.category || 'الأذكار';

  const [azkar, setAzkar] = useState<ZekrItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Counter state per zekr: { [id: number]: currentCount }
  const [counts, setCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    let active = true;
    getAzkarByCategory(categoryName)
      .then((items) => {
        if (active) {
          setAzkar(items);
          // Initialize counts to 0
          const initialCounts: Record<number, number> = {};
          items.forEach((item) => {
            initialCounts[item.id] = 0;
          });
          setCounts(initialCounts);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [categoryName]);

  const handleIncrement = useCallback((item: ZekrItem) => {
    setCounts((prev) => {
      const current = prev[item.id] || 0;
      if (current >= item.count) return prev;
      const next = current + 1;
      // Light haptic tap on each count
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Success vibration when completed target
      if (next >= item.count) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return { ...prev, [item.id]: next };
    });
  }, []);

  // Handle Reset
  const handleReset = useCallback((id: number) => {
    setCounts((prev) => ({ ...prev, [id]: 0 }));
    void Haptics.selectionAsync();
  }, []);

  // Handle Share
  const handleShare = useCallback(async (item: ZekrItem) => {
    try {
      const cleanText = formatZekrText(item.zekr);
      const shareContent = `${cleanText}\n\n${item.description ? item.description + '\n' : ''}${item.reference ? '📚 ' + item.reference : ''}`;
      await Share.share({
        message: shareContent,
      });
    } catch {
      // User cancelled
    }
  }, []);

  // Completed count
  const completedCount = useMemo(() => {
    return azkar.filter((item) => (counts[item.id] || 0) >= item.count).length;
  }, [azkar, counts]);
  const progressRatio = azkar.length > 0 ? completedCount / azkar.length : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top > 0 ? 0 : spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={HIT_SLOP}
          style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
        >
          <Feather name="arrow-right" size={20} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.gold }]}>
            {completedCount} من {azkar.length} مكتمل
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Top Progress Bar */}
      <View style={[styles.progressBarBackground, { backgroundColor: colors.surfaceSunk }]}>
        <View
          style={[
            styles.progressBarFill,
            { backgroundColor: colors.gold, width: `${progressRatio * 100}%` },
          ]}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={azkar}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const current = counts[item.id] || 0;
            const isCompleted = current >= item.count;
            const remaining = Math.max(0, item.count - current);

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isCompleted ? colors.sage : colors.border,
                  },
                ]}
              >
                {/* Top Badge: Number and Total repetitions */}
                <View style={styles.cardHeader}>
                  <View style={[styles.zekrIndexBadge, { backgroundColor: colors.surfaceSunk }]}>
                    <Text style={[styles.zekrIndexText, { color: colors.textSecond }]}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={[styles.targetBadge, { backgroundColor: isCompleted ? colors.sageSoft : colors.surfaceSunk }]}>
                    <Text style={[styles.targetText, { color: isCompleted ? colors.accent : colors.gold }]}>
                      التكرار: {item.count}
                    </Text>
                  </View>
                </View>

                {/* Dhikr Arabic Text */}
                <Text style={[styles.zekrText, { color: colors.textPrimary }]} allowFontScaling={false}>
                  {formatZekrText(item.zekr)}
                </Text>

                {/* Virtue / Explanation (if present) */}
                {item.description ? (
                  <View style={[styles.descBox, { backgroundColor: colors.surfaceSunk }]}>
                    <Text style={[styles.descText, { color: colors.textSecond }]}>
                      {item.description}
                    </Text>
                  </View>
                ) : null}

                {/* Reference (if present) */}
                {item.reference ? (
                  <Text style={[styles.referenceText, { color: colors.textMuted }]}>
                    {item.reference}
                  </Text>
                ) : null}

                {/* Bottom Actions & Big Counter Button */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.footerActions}>
                    <Pressable
                      onPress={() => void handleShare(item)}
                      hitSlop={HIT_SLOP}
                      style={[styles.smallActionBtn, { backgroundColor: colors.surfaceSunk }]}
                      accessibilityLabel="مشاركة الذكر"
                    >
                      <Feather name="share-2" size={16} color={colors.textSecond} />
                    </Pressable>

                    <Pressable
                      onPress={() => handleReset(item.id)}
                      hitSlop={HIT_SLOP}
                      style={[styles.smallActionBtn, { backgroundColor: colors.surfaceSunk }]}
                      accessibilityLabel="إعادة التكرار"
                    >
                      <Feather name="rotate-ccw" size={16} color={colors.textSecond} />
                    </Pressable>
                  </View>

                  {/* Tactile Circular Counter Button */}
                  <Pressable
                    onPress={() => void handleIncrement(item)}
                    style={({ pressed }) => [
                      styles.counterBtn,
                      {
                        backgroundColor: isCompleted ? '#3E7B54' : '#8D6443',
                        borderColor: isCompleted ? '#529E6E' : '#C59B27',
                        transform: [{ scale: pressed ? 0.92 : 1 }],
                      },
                    ]}
                    accessibilityLabel={isCompleted ? 'تم إكمال الذكر' : `اضغط للعد، المتبقي ${remaining}`}
                  >
                    {isCompleted ? (
                      <View style={styles.completedRow}>
                        <Feather name="check" size={22} color="#FFFFFF" />
                      </View>
                    ) : (
                      <Text style={styles.counterBtnText}>
                        {remaining}
                      </Text>
                    )}
                  </Pressable>
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
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitleCol: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 17,
  },
  headerSubtitle: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginTop: 2,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  progressBarBackground: {
    height: 3,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  zekrIndexBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  zekrIndexText: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  targetBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  targetText: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  zekrText: {
    fontFamily: fonts.defaultBold,
    fontSize: 21,
    lineHeight: 40,
    marginVertical: spacing.sm,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  descBox: {
    borderRadius: radius.lg,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  descText: {
    fontFamily: fonts.default,
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  referenceText: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  cardFooter: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  footerActions: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
  },
  smallActionBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  counterBtn: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1.5,
    elevation: 4,
    height: 52,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    width: 52,
  },
  counterBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    fontWeight: '700',
  },
  completedRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
