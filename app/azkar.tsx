/**
 * Azkar & Adiyah Screen (`app/azkar.tsx`).
 *
 * Displays all authentic Adhkar categories from Hisn Al-Muslim,
 * with search across all duaa/adhkar and quick access to daily essentials.
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IslamicEmblem } from '../src/components/ui/IslamicEmblem';
import {
  getAzkarCategories,
  searchAzkar,
  type AzkarCategory,
  type ZekrItem,
} from '../src/data/database';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';

// Essential daily categories for spotlight
const DAILY_ESSENTIALS = [
  { title: 'أذكار الصباح', icon: 'sun', color: '#E8A07C' },
  { title: 'أذكار المساء', icon: 'moon', color: '#D6B46F' },
  { title: 'أذكار النوم', icon: 'cloud-rain', color: '#827148' },
  { title: 'أذكار الاستيقاظ من النوم', icon: 'sunrise', color: '#A5AF79' },
  { title: 'الأذكار بعد السلام من الصلاة', icon: 'check-circle', color: '#827148' },
  { title: 'الرقية الشرعية من القرآن الكريم', icon: 'shield', color: '#A5AF79' },
];

/** Matches the Quran search debounce. */
const SEARCH_DEBOUNCE_MS = 250;

export default function AzkarScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<AzkarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ZekrItem[]>([]);
  const [searching, setSearching] = useState(false);
  /** Guards against out-of-order responses overwriting newer results. */
  const searchRequestId = useRef(0);

  useEffect(() => {
    let active = true;
    getAzkarCategories()
      .then((data) => {
        if (active) {
          setCategories(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Debounced like the Quran search: firing an FTS5 query on every keystroke
  // put several queries on the JS thread at once, and without a request guard
  // a slower response for "الص" could land after — and overwrite — the newer
  // results for "الصباح".
  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const id = ++searchRequestId.current;

    const timer = setTimeout(() => {
      searchAzkar(trimmed, 30)
        .then((hits) => {
          if (id === searchRequestId.current) {
            setSearchResults(hits);
            setSearching(false);
          }
        })
        .catch(() => {
          if (id === searchRequestId.current) {
            setSearchResults([]);
            setSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openCategory = useCallback((categoryName: string) => {
    router.push({
      pathname: '/azkar-category',
      params: { category: categoryName },
    });
  }, []);

  const isSearchActive = searchQuery.trim().length >= 2;

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

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          الأذكار والأدعية
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.textSecond} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="ابحث في الأذكار والأدعية..."
          placeholderTextColor={colors.textSecond}
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign="right"
          clearButtonMode="while-editing"
        />
        {searching && <ActivityIndicator size="small" color={colors.gold} />}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.textSecond }]}>
            جاري تحميل الأذكار...
          </Text>
        </View>
      ) : isSearchActive ? (
        // Search Results List
        <FlatList
          data={searchResults}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={
            !searching ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                لا توجد نتائج مطابقة لبحثك
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openCategory(item.category)}
              style={({ pressed }) => [
                styles.searchHitCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.searchHitTopRow}>
                <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceSunk }]}>
                  <Text style={[styles.categoryBadgeText, { color: colors.gold }]}>
                    {item.category}
                  </Text>
                </View>
                {item.count > 1 && (
                  <Text style={[styles.hitCountText, { color: colors.textSecond }]}>
                    التكرار: {item.count} مرات
                  </Text>
                )}
              </View>

              <Text style={[styles.searchHitZekr, { color: colors.textPrimary }]}>
                {item.zekr}
              </Text>

              {item.description ? (
                <Text style={[styles.searchHitDesc, { color: colors.textSecond }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      ) : (
        // Categories & Daily Essentials
        <FlatList
          data={categories}
          keyExtractor={(item) => item.category}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerSection}>
              {/* Daily Essentials Grid */}
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  أذكار يومية أساسية
                </Text>
              </View>

              <View style={styles.essentialsGrid}>
                {DAILY_ESSENTIALS.map((item) => (
                  <Pressable
                    key={item.title}
                    onPress={() => openCategory(item.title)}
                    style={({ pressed }) => [
                      styles.essentialCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.essentialIconCircle, { backgroundColor: colors.surfaceSunk }]}>
                      <IslamicEmblem size={24} color={item.color} fillColor={colors.surface} />
                    </View>
                    <Text style={[styles.essentialTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* All Categories Section Title */}
              <View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  جميع أبواب الأذكار ({categories.length})
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openCategory(item.category)}
              style={({ pressed }) => [
                styles.categoryRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {/* Right: Emblem */}
              <View style={[styles.categoryEmblemCircle, { backgroundColor: colors.surfaceSunk }]}>
                <IslamicEmblem size={20} color={colors.gold} fillColor={colors.surface} />
              </View>

              {/* Center: Category Title */}
              <View style={styles.categoryInfoCol}>
                <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>
                  {item.category}
                </Text>
              </View>

              {/* Left: Count Badge & Chevron */}
              <View style={styles.rowLeftCol}>
                <View style={[styles.countBadge, { backgroundColor: colors.surfaceSunk }]}>
                  <Text style={[styles.countText, { color: colors.gold }]}>
                    {item.count}
                  </Text>
                </View>
                <Feather name="chevron-left" size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          )}
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
  headerTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 18,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  searchBar: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.default,
    fontSize: 15,
    height: 28,
  },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 14,
  },
  emptyText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 14,
    marginTop: 40,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  headerSection: {
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 17,
  },
  essentialsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  essentialCard: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    width: '47.5%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  essentialIconCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 44,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 44,
  },
  essentialTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
    minHeight: 34,
    textAlign: 'center',
  },
  categoryRow: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  categoryEmblemCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  categoryInfoCol: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: spacing.md,
  },
  categoryTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
    textAlign: 'right',
  },
  rowLeftCol: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.xs,
  },
  countBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 12,
  },
  searchHitCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.base,
  },
  searchHitTopRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  hitCountText: {
    fontFamily: fonts.default,
    fontSize: 12,
  },
  searchHitZekr: {
    fontFamily: fonts.quran,
    fontSize: 17,
    lineHeight: 28,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  searchHitDesc: {
    fontFamily: fonts.default,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
