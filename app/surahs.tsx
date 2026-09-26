/**
 * The Quran Index — Surahs, Juz, and Bookmarks.
 *
 * Designed with luxury Islamic illumination aesthetics and the palette
 * #FFEED6, #A5AF79, #827148, #E8A07C.
 * Fully formatted with authentic Right-to-Left (RTL) Arabic alignment and Thmanyah font.
 */

import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IslamicEmblem } from '../src/components/ui/IslamicEmblem';
import type { Surah } from '../src/data/database';
import {
  getAllHizbs,
  getAllJuz,
  pageForAyah,
  type HizbInfo,
  type JuzInfo,
} from '../src/data/navigation';
import { useSurahList } from '../src/features/reader/useQuranData';
import { useSettings, type Bookmark } from '../src/store/settings';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, MIN_TOUCH_TARGET, fonts, radius, spacing } from '../src/theme/tokens';
import { toArabicDigits } from '../src/utils/arabicDigits';

type TabType = 'surahs' | 'juz' | 'hizb';

export default function SurahIndexScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: surahs } = useSurahList();

  const lastRead = useSettings((s) => s.lastRead);
  const setLastRead = useSettings((s) => s.setLastRead);
  const bookmarks = useSettings((s) => s.bookmarks);
  const toggleBookmark = useSettings((s) => s.toggleBookmark);

  const [activeTab, setActiveTab] = useState<TabType>('surahs');
  const [filter, setFilter] = useState('');

  const juzList = useMemo(() => getAllJuz(), []);
  const hizbList = useMemo(() => getAllHizbs(), []);

  const lastReadSurah = useMemo(() => {
    if (!lastRead) return null;
    return surahs.find((s) => s.number === lastRead.surah) ?? null;
  }, [surahs, lastRead]);

  const filteredSurahs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (q === '') return surahs;

    return surahs.filter(
      (s) =>
        s.nameTr.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.nameAr.includes(q) ||
        String(s.number) === q,
    );
  }, [surahs, filter]);

  const openSurah = useCallback(
    (surah: number, ayah = 1) => {
      const targetPage = pageForAyah(surah, ayah);
      setLastRead({ surah, ayah });
      router.push({
        pathname: '/(tabs)/quran',
        params: { page: String(targetPage), surah: String(surah) },
      });
    },
    [setLastRead],
  );

  const openJuz = useCallback(
    (juz: JuzInfo) => {
      const targetPage = juz.startPage;
      setLastRead({ surah: juz.startSurah, ayah: juz.startAyah });
      router.push({
        pathname: '/(tabs)/quran',
        params: { page: String(targetPage), surah: String(juz.startSurah) },
      });
    },
    [setLastRead],
  );

  const openHizb = useCallback(
    (hizb: HizbInfo) => {
      const targetPage = hizb.startPage;
      setLastRead({ surah: hizb.startSurah, ayah: hizb.startAyah });
      router.push({
        pathname: '/(tabs)/quran',
        params: { page: String(targetPage), surah: String(hizb.startSurah) },
      });
    },
    [setLastRead],
  );

  // Render Surah Row Item (RTL right-aligned with Thmanyah font)
  const renderSurahItem = useCallback(
    ({ item }: { item: Surah }) => (
      <Pressable
        onPress={() => openSurah(item.number)}
        style={({ pressed }) => [
          styles.cardRow,
          {
            backgroundColor: pressed ? colors.surfaceSunk : colors.surface,
            borderColor: colors.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`سورة ${item.nameAr}، رقم ${item.number}، ${item.ayahCount} آية`}
      >
        {/* Right side in row-reverse: Geometric Star Number Badge */}
        <IslamicEmblem
          size={44}
          color={colors.gold}
          innerBorderColor={colors.goldSoft}
          fillColor={colors.surfaceSunk}
        >
          <Text style={[styles.emblemNumberText, { color: colors.gold }]}>
            {toArabicDigits(item.number)}
          </Text>
        </IslamicEmblem>

        {/* Center-Right in row-reverse: Surah Title and Badges */}
        <View style={styles.cardInfo}>
          <Text style={[styles.surahNameTr, { color: colors.textPrimary }]} numberOfLines={1}>
            سورة {item.nameAr}
          </Text>

          <View style={styles.surahMetaRow}>
            <View
              style={[
                styles.miniBadge,
                {
                  backgroundColor: item.revelation === 'Meccan' ? colors.sageSoft : colors.terracottaSoft,
                  borderColor: item.revelation === 'Meccan' ? colors.sage : colors.terracotta,
                },
              ]}
            >
              <Text
                style={[
                  styles.miniBadgeText,
                  {
                    color: item.revelation === 'Meccan' ? colors.accent : colors.terracotta,
                  },
                ]}
              >
                {item.revelation === 'Meccan' ? 'مكية' : 'مدنية'}
              </Text>
            </View>

            <Text style={[styles.surahNameEn, { color: colors.textSecond }]} numberOfLines={1}>
              {toArabicDigits(item.ayahCount)} آية
            </Text>
          </View>
        </View>

        {/* Left side in row-reverse: Page info */}
        <View style={[styles.pageBadge, { backgroundColor: colors.surfaceSunk }]}>
          <Text style={[styles.pageBadgeText, { color: colors.gold }]}>
            ص {toArabicDigits(pageForAyah(item.number, 1))}
          </Text>
        </View>
      </Pressable>
    ),
    [colors, openSurah],
  );

  // Render Juz Row Item (RTL right-aligned with Thmanyah font)
  const renderJuzItem = useCallback(
    ({ item }: { item: JuzInfo }) => {
      const startingSurah = surahs.find((s) => s.number === item.startSurah);
      return (
        <Pressable
          onPress={() => openJuz(item)}
          style={({ pressed }) => [
            styles.cardRow,
            {
              backgroundColor: pressed ? colors.surfaceSunk : colors.surface,
              borderColor: colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`الجزء ${item.number}، يبدأ من صفحة ${item.startPage}`}
        >
          <IslamicEmblem
            size={44}
            color={colors.accent}
            innerBorderColor={colors.sageSoft}
            fillColor={colors.surfaceSunk}
          >
            <Text style={[styles.emblemNumberText, { color: colors.accent }]}>
              {toArabicDigits(item.number)}
            </Text>
          </IslamicEmblem>

          <View style={styles.cardInfo}>
            <Text style={[styles.juzHizbTitle, { color: colors.textPrimary }]}>
              الجزء {toArabicDigits(item.number)}
            </Text>
            <Text style={[styles.surahNameEn, { color: colors.textSecond }]}>
              يبدأ من {startingSurah?.nameAr ?? `سورة ${item.startSurah}`} : {toArabicDigits(item.startAyah)}
            </Text>
          </View>

          <View style={[styles.pageBadge, { backgroundColor: colors.surfaceSunk }]}>
            <Text style={[styles.pageBadgeText, { color: colors.gold }]}>
              ص {toArabicDigits(item.startPage)}
            </Text>
          </View>
        </Pressable>
      );
    },
    [colors, surahs, openJuz],
  );

  // Render Hizb Row Item (RTL right-aligned with Thmanyah font)
  const renderHizbItem = useCallback(
    ({ item }: { item: HizbInfo }) => {
      const startingSurah = surahs.find((s) => s.number === item.startSurah);
      return (
        <Pressable
          onPress={() => openHizb(item)}
          style={({ pressed }) => [
            styles.cardRow,
            {
              backgroundColor: pressed ? colors.surfaceSunk : colors.surface,
              borderColor: colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`الحزب ${item.number}، الجزء ${item.juzNumber}، يبدأ من صفحة ${item.startPage}`}
        >
          <IslamicEmblem
            size={44}
            color={colors.gold}
            innerBorderColor={colors.goldSoft}
            fillColor={colors.surfaceSunk}
          >
            <Text style={[styles.emblemNumberText, { color: colors.gold }]}>
              {toArabicDigits(item.number)}
            </Text>
          </IslamicEmblem>

          <View style={styles.cardInfo}>
            <Text style={[styles.juzHizbTitle, { color: colors.textPrimary }]}>
              الحزب {toArabicDigits(item.number)}
            </Text>
            <View style={styles.surahMetaRow}>
              <View
                style={[
                  styles.miniBadge,
                  {
                    backgroundColor: colors.sageSoft,
                    borderColor: colors.sage,
                  },
                ]}
              >
                <Text style={[styles.miniBadgeText, { color: colors.accent }]}>
                  الجزء {toArabicDigits(item.juzNumber)}
                </Text>
              </View>

              <Text style={[styles.surahNameEn, { color: colors.textSecond }]} numberOfLines={1}>
                {startingSurah?.nameAr ?? `سورة ${item.startSurah}`} : {toArabicDigits(item.startAyah)}
              </Text>
            </View>
          </View>

          <View style={[styles.pageBadge, { backgroundColor: colors.surfaceSunk }]}>
            <Text style={[styles.pageBadgeText, { color: colors.gold }]}>
              ص {toArabicDigits(item.startPage)}
            </Text>
          </View>
        </Pressable>
      );
    },
    [colors, surahs, openHizb],
  );

  // Render Bookmarks Row Item (RTL right-aligned with Thmanyah font)
  const renderBookmarkItem = useCallback(
    ({ item }: { item: Bookmark }) => {
      const bSurah = surahs.find((s) => s.number === item.surah);
      const bPage = pageForAyah(item.surah, item.ayah);

      return (
        <Pressable
          onPress={() => openSurah(item.surah, item.ayah)}
          style={({ pressed }) => [
            styles.cardRow,
            {
              backgroundColor: pressed ? colors.surfaceSunk : colors.surface,
              borderColor: colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`إشارة مرجعية: سورة ${bSurah?.nameAr}، الآية ${item.ayah}`}
        >
          <IslamicEmblem
            size={44}
            color={colors.terracotta}
            innerBorderColor={colors.terracottaSoft}
            fillColor={colors.surfaceSunk}
          >
            <Text style={[styles.emblemNumberText, { color: colors.terracotta }]}>
              {toArabicDigits(item.ayah)}
            </Text>
          </IslamicEmblem>

          <View style={styles.cardInfo}>
            <Text style={[styles.juzHizbTitle, { color: colors.textPrimary }]}>
              {bSurah?.nameAr ?? `سورة ${item.surah}`} · الآية {toArabicDigits(item.ayah)}
            </Text>
            <Text style={[styles.surahNameEn, { color: colors.textSecond }]}>
              صفحة {toArabicDigits(bPage)}
            </Text>
          </View>

          <Pressable
            onPress={() => toggleBookmark(item)}
            hitSlop={HIT_SLOP}
            style={[styles.bookmarkDeleteButton, { backgroundColor: colors.surfaceSunk }]}
            accessibilityRole="button"
            accessibilityLabel="إزالة الإشارة المرجعية"
          >
            <Feather name="star" size={18} color={colors.terracotta} />
          </Pressable>
        </Pressable>
      );
    },
    [colors, surahs, openSurah, toggleBookmark],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Header (RTL) */}
      <View style={[styles.topHeader, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={HIT_SLOP}
          style={[styles.circleButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="العودة"
        >
          <Feather name="chevron-right" size={22} color={colors.textPrimary} />
        </Pressable>

        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          فهرس القرآن الكريم
        </Text>

        <View style={styles.circleButtonPlaceholder} />
      </View>

      {/* Hero "Last Read" Card (RTL) */}
      {lastReadSurah && (
        <View style={styles.heroWrapper}>
          <Pressable
            onPress={() => openSurah(lastReadSurah.number, lastRead?.ayah ?? 1)}
            style={({ pressed }) => [
              styles.heroCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.gold,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`متابعة قراءة سورة ${lastReadSurah.nameAr}`}
          >
            {/* Right side in row-reverse: Surah details */}
            <View style={styles.heroContent}>
              <View style={[styles.heroBadge, { backgroundColor: colors.terracottaSoft }]}>
                <Text style={[styles.heroBadgeText, { color: colors.terracotta }]}>
                  آخر قراءة
                </Text>
              </View>

              <Text style={[styles.heroArabicName, { color: colors.textPrimary }]}>
                سورة {lastReadSurah.nameAr}
              </Text>

              <Text style={[styles.heroSurahMeta, { color: colors.textSecond }]}>
                {`الآية ${toArabicDigits(lastRead?.ayah ?? 1)} · ${lastReadSurah.revelation === 'Meccan' ? 'مكية' : 'مدنية'}`}
              </Text>
            </View>

            {/* Left side in row-reverse: Action button */}
            <View style={styles.heroLeft}>
              <View style={[styles.heroResumePill, { backgroundColor: colors.surfaceSunk, borderColor: colors.goldSoft }]}>
                <Text style={[styles.heroResumeText, { color: colors.accent }]}>
                  متابعة
                </Text>
                <Feather name="chevron-left" size={14} color={colors.accent} />
              </View>
            </View>
          </Pressable>
        </View>
      )}

      {/* Tab Selector Bar (RTL right-to-left order with 3 Tabs: Surahs, Juz, Hizb) */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceSunk, borderColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab('surahs')}
          style={[
            styles.tabItem,
            activeTab === 'surahs' && [styles.activeTabItem, { backgroundColor: colors.surface }],
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'surahs' }}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'surahs' ? colors.accent : colors.textMuted,
                fontFamily: activeTab === 'surahs' ? fonts.defaultBold : fonts.defaultMedium,
              },
            ]}
          >
            السور (114)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('juz')}
          style={[
            styles.tabItem,
            activeTab === 'juz' && [styles.activeTabItem, { backgroundColor: colors.surface }],
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'juz' }}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'juz' ? colors.accent : colors.textMuted,
                fontFamily: activeTab === 'juz' ? fonts.defaultBold : fonts.defaultMedium,
              },
            ]}
          >
            الأجزاء (30)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('hizb')}
          style={[
            styles.tabItem,
            activeTab === 'hizb' && [styles.activeTabItem, { backgroundColor: colors.surface }],
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'hizb' }}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'hizb' ? colors.accent : colors.textMuted,
                fontFamily: activeTab === 'hizb' ? fonts.defaultBold : fonts.defaultMedium,
              },
            ]}
          >
            الأحزاب (60)
          </Text>
        </Pressable>
      </View>

      {/* Filter Input for Surahs Tab (RTL) */}
      {activeTab === 'surahs' && (
        <View style={styles.searchWrapper}>
          <View style={[styles.searchInputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.gold} style={styles.searchIcon} />
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="ابحث باسم السورة أو رقمها…"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.searchInput,
                {
                  color: colors.textPrimary,
                },
              ]}
              accessibilityLabel="تصفية السور"
              clearButtonMode="while-editing"
            />
          </View>
        </View>
      )}

      {/* Main List Area */}
      <View style={styles.listContainer}>
        {activeTab === 'surahs' && (
          <FlashList
            data={filteredSurahs}
            renderItem={renderSurahItem}
            keyExtractor={(item) => String(item.number)}
            contentContainerStyle={{
              paddingBottom: insets.bottom + spacing['3xl'],
              paddingHorizontal: spacing.base,
            }}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {activeTab === 'juz' && (
          <FlashList
            data={juzList}
            renderItem={renderJuzItem}
            keyExtractor={(item) => String(item.number)}
            contentContainerStyle={{
              paddingBottom: insets.bottom + spacing['3xl'],
              paddingHorizontal: spacing.base,
            }}
          />
        )}

        {activeTab === 'hizb' && (
          <FlashList
            data={hizbList}
            renderItem={renderHizbItem}
            keyExtractor={(item) => String(item.number)}
            contentContainerStyle={{
              paddingBottom: insets.bottom + spacing['3xl'],
              paddingHorizontal: spacing.base,
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
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
  screenTitle: {
    flex: 1,
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    letterSpacing: 0.2,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  heroWrapper: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  heroContent: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: spacing.md,
  },
  heroBadge: {
    borderRadius: radius.sm,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  heroBadgeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  heroArabicName: {
    fontFamily: fonts.surahName,
    fontSize: 24,
    lineHeight: 30,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  heroSurahMeta: {
    fontFamily: fonts.default,
    fontSize: 14,
    marginTop: 3,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  heroLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  heroResumePill: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroResumeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
  },
  tabBar: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: 3,
  },
  tabItem: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    paddingVertical: 8,
  },
  activeTabItem: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  searchWrapper: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  searchInputBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    height: 44,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginLeft: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.default,
    fontSize: 15,
    height: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  listContainer: {
    flex: 1,
  },
  cardRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  emblemNumberText: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
  },
  cardInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.md,
  },
  surahNameTr: {
    fontFamily: fonts.surahName,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  juzHizbTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 16.5,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  surahMetaRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 6,
    marginTop: 3,
  },
  miniBadge: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  miniBadgeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 11,
  },
  surahNameEn: {
    fontFamily: fonts.default,
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pageBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pageBadgeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  bookmarkDeleteButton: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
  },
  emptyTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    marginTop: spacing.base,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptySubtitle: {
    fontFamily: fonts.default,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
