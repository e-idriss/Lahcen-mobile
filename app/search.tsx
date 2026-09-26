/**
 * Search across the Arabic text and the English translation.
 *
 * Formatted with full Right-to-Left (RTL) Arabic alignment and Thmanyah UI typography.
 */

import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IslamicEmblem } from '../src/components/ui/IslamicEmblem';
import type { SearchHit } from '../src/data/database';
import { useSearch } from '../src/features/reader/useQuranData';
import { useSettings } from '../src/store/settings';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, MIN_TOUCH_TARGET, arabicTextStyle, fonts, radius, spacing } from '../src/theme/tokens';
import { toArabicDigits } from '../src/utils/arabicDigits';

const SUGGESTIONS = ['آية الكرسي', 'الفاتحة', 'الرحمن', 'الصبر', 'النور', 'الجنة'];

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { query, setQuery, results, loading } = useSearch();
  const setLastRead = useSettings((s) => s.setLastRead);

  const openHit = useCallback(
    (hit: SearchHit) => {
      setLastRead({ surah: hit.surah, ayah: hit.ayah });
      router.back();
    },
    [setLastRead],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchHit }) => (
      <Pressable
        onPress={() => openHit(item)}
        style={({ pressed }) => [
          styles.hitCard,
          {
            backgroundColor: pressed ? colors.surfaceSunk : colors.surface,
            borderColor: colors.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`سورة ${item.surahNameAr}، الآية ${item.ayah}`}
      >
        <View style={styles.hitHeader}>
          <View style={[styles.surahPill, { backgroundColor: colors.surfaceSunk, borderColor: colors.border }]}>
            <Text style={[styles.hitSurah, { color: colors.gold }]}>
              سورة {item.surahNameAr} · الآية {toArabicDigits(item.ayah)}
            </Text>
          </View>
        </View>

        <Text
          style={[arabicTextStyle(22), styles.hitArabic, { color: colors.textPrimary }]}
          accessibilityLanguage="ar"
          allowFontScaling={false}
          numberOfLines={3}
        >
          {item.text}
        </Text>

        <Text
          style={[styles.hitTranslation, { color: colors.textSecond }]}
          numberOfLines={3}
        >
          {item.translation}
        </Text>

        <View style={[styles.hitFooter, { borderTopColor: colors.border }]}>
          <View style={[styles.pageBadge, { backgroundColor: colors.sageSoft }]}>
            <Text style={[styles.pageBadgeText, { color: colors.accent }]}>
              ص {toArabicDigits(item.page)}
            </Text>
          </View>
          <View style={styles.readNowRow}>
            <Text style={[styles.readNowText, { color: colors.accent }]}>
              قراءة في المصحف
            </Text>
            <Feather name="chevron-left" size={14} color={colors.accent} />
          </View>
        </View>
      </Pressable>
    ),
    [colors, openHit],
  );

  const trimmed = query.trim();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Search Screen Top Header (RTL) */}
      <View style={[styles.headerSection, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={HIT_SLOP}
            style={[styles.circleButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="العودة إلى القارئ"
          >
            <Feather name="chevron-right" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: colors.textPrimary }]}>البحث في القرآن</Text>
          <View style={styles.circleButtonPlaceholder} />
        </View>

        {/* Input Bar (RTL) */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="search" size={18} color={colors.gold} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث بالنص العربي أو الترجمة الإنجليزية…"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
              },
            ]}
            autoFocus
            autoCorrect={false}
            accessibilityLabel="نص البحث"
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {trimmed.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="مسح البحث">
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* States & Results */}
      {loading ? (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecond, marginTop: spacing.md }]}>
            جارٍ البحث…
          </Text>
        </View>
      ) : trimmed.length < 2 ? (
        <View style={styles.stateBlock}>
          <IslamicEmblem size={56} color={colors.goldSoft} fillColor={colors.surfaceSunk} />
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
            اكتشف القرآن
          </Text>
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            ابحث في الآيات بالنص العربي أو كلمات الترجمة الإنجليزية.
          </Text>

          {/* Quick Suggestions */}
          <View style={styles.suggestionsContainer}>
            <Text style={[styles.suggestionsLabel, { color: colors.textSecond }]}>
              بحث شائع:
            </Text>
            <View style={styles.suggestionsRow}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setQuery(s)}
                  style={[styles.suggestionChip, { backgroundColor: colors.surfaceSunk, borderColor: colors.border }]}
                >
                  <Text style={[styles.suggestionText, { color: colors.textPrimary }]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.stateBlock}>
          <IslamicEmblem size={56} color={colors.goldSoft} fillColor={colors.surfaceSunk} />
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
            لا توجد نتائج
          </Text>
          <Text style={[styles.stateText, { color: colors.textSecond }]}>
            لم يتم العثور على آية تطابق “{trimmed}”. تحقق من الإملاء أو استخدم كلمات بحث أوسع.
          </Text>
        </View>
      ) : (
        <View style={styles.resultsWrapper}>
          <View style={styles.resultCountBar}>
            <Text style={[styles.resultCountText, { color: colors.textSecond }]}>
              {`تم العثور على ${toArabicDigits(results.length)} ${results.length === 1 ? 'آية' : 'آيات'}`}
            </Text>
          </View>

          <FlashList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{
              paddingBottom: insets.bottom + spacing['3xl'],
              paddingHorizontal: spacing.base,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  circleButton: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  circleButtonPlaceholder: {
    width: 38,
  },
  title: {
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    letterSpacing: 0.2,
  },
  inputContainer: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    height: 48,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontFamily: fonts.default,
    fontSize: 15,
    height: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  resultsWrapper: {
    flex: 1,
  },
  resultCountBar: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xs,
    alignItems: 'flex-start',
  },
  resultCountText: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hitCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.base,
  },
  hitHeader: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  surahPill: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  hitSurah: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hitArabic: {
    marginVertical: spacing.xs,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hitTranslation: {
    fontFamily: fonts.default,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hitFooter: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  pageBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pageBadgeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  readNowRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 4,
  },
  readNowText: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
  },
  stateBlock: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  stateTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    marginTop: spacing.base,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  stateText: {
    fontFamily: fonts.default,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  suggestionsContainer: {
    alignItems: 'center',
    marginTop: spacing['2xl'],
    width: '100%',
  },
  suggestionsLabel: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  suggestionsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  suggestionChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 13,
  },
});
