/**
 * The reader — the app's entry point.
 *
 * Opens directly onto the mushaf, at page 604 (index 0 of the reversed
 * `PAGES` array — see below). The unit of navigation is the PAGE (1..604),
 * matching a printed mushaf, not the surah.
 *
 * Immersive reading mode: Tap screen to toggle the illuminated top bar.
 */

import { Feather } from '@expo/vector-icons';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MushafPageContainer } from '../../src/components/reader/MushafPageContainer';
import { ReaderSettingsSheet } from '../../src/components/reader/ReaderSettingsSheet';
import { IslamicEmblem } from '../../src/components/ui/IslamicEmblem';
import { getSurahForPage } from '../../src/data/database';
import {
  firstAyahOnPage,
  hizbForPage,
  indexForPage,
  juzForPage,
  pageForAyah,
  pageForIndex,
} from '../../src/data/navigation';
import { TOTAL_PAGES } from '../../src/data/parseTanzil';
import { useBasmalah, useSurahList } from '../../src/features/reader/useQuranData';
import { useSettings } from '../../src/store/settings';
import { useTheme } from '../../src/theme/ThemeProvider';
import { HIT_SLOP, MIN_TOUCH_TARGET, fonts, radius, spacing } from '../../src/theme/tokens';
import { toArabicDigits } from '../../src/utils/arabicDigits';

/**
 * Page numbers in REVERSED order: index 0 is page 604, the last index is page 1.
 */
const PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => TOTAL_PAGES - i);

/** Height of the illuminated top bar. */
const TOP_BAR_HEIGHT = 56;

export default function ReaderScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{ page?: string; surah?: string }>();

  const { data: surahs } = useSurahList();
  // Al-Fatiha 1:1 IS the Basmalah — the single source for the header text.
  // Cached at module scope: this value feeds `renderPage`'s dependency list,
  // so an unstable identity here re-creates every page on each render.
  const basmalahText = useBasmalah();

  const setLastRead = useSettings((s) => s.setLastRead);
  const lastRead = useSettings((s) => s.lastRead);
  const fontSize = useSettings((s) => s.arabicFontSize);
  const bookmarks = useSettings((s) => s.bookmarks);
  const toggleBookmark = useSettings((s) => s.toggleBookmark);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [, setSelected] = useState<{ surah: number; ayah: number } | null>(null);

  // Compute initial target page once on component mount
  const initialPage = useMemo(() => {
    if (params.page) {
      const p = Number(params.page);
      if (p >= 1 && p <= TOTAL_PAGES) return p;
    }
    if (params.surah) {
      const s = Number(params.surah);
      if (s >= 1 && s <= 114) return pageForAyah(s, 1);
    }
    if (lastRead) {
      return pageForAyah(lastRead.surah, lastRead.ayah);
    }
    return TOTAL_PAGES;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const currentPageRef = useRef<number>(initialPage);
  currentPageRef.current = currentPage;

  const listRef = useRef<FlashListRef<number>>(null);

  // Top Bar Visibility Toggle Animation
  const [headerVisible, setHeaderVisible] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const totalHeaderHeight = TOP_BAR_HEIGHT + insets.top;

  const toggleHeader = useCallback(() => {
    setHeaderVisible((prev) => {
      const next = !prev;
      Animated.timing(headerAnim, {
        toValue: next ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return next;
    });
  }, [headerAnim]);

  /*
   * Safe bounded page height: accounts for top safe area (status bar / dynamic island)
   * and bottom safe area (home indicator / navigation bar) on iOS and Android.
   */
  const safeTop = Math.max(insets.top, 10);
  const safeBottom = Math.max(insets.bottom, 12);
  const pageContentHeight = useMemo(
    () => Math.floor(windowHeight - safeTop - safeBottom),
    [windowHeight, safeTop, safeBottom],
  );

  const scrollToPage = useCallback(
    (page: number, animated = false) => {
      const idx = indexForPage(page);
      if (idx >= 0 && idx < TOTAL_PAGES) {
        listRef.current?.scrollToOffset({ offset: idx * width, animated });
        setCurrentPage(page);
      }
    },
    [width],
  );

  const lastHandledTargetRef = useRef<string | null>(null);

  // Scroll to target page when route params change (e.g. from Surah Index or Home)
  useEffect(() => {
    const pageParam = params.page;
    const surahParam = params.surah;
    const paramKey = `${pageParam ?? ''}_${surahParam ?? ''}`;

    if (!pageParam && !surahParam) {
      lastHandledTargetRef.current = null;
      return;
    }

    if (lastHandledTargetRef.current === paramKey) {
      return;
    }
    lastHandledTargetRef.current = paramKey;

    let targetPage: number | null = null;
    if (pageParam) {
      targetPage = Number(pageParam);
    } else if (surahParam) {
      targetPage = pageForAyah(Number(surahParam), 1);
    }

    if (targetPage && targetPage >= 1 && targetPage <= TOTAL_PAGES) {
      scrollToPage(targetPage, false);
    }
  }, [params.page, params.surah, scrollToPage]);

  const onSelectAyah = useCallback(
    (position: { surah: number; ayah: number }) => {
      setSelected((prev) =>
        prev?.surah === position.surah && prev?.ayah === position.ayah ? null : position,
      );
      setLastRead(position);
    },
    [setLastRead],
  );

  const onMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      if (index < 0 || index >= TOTAL_PAGES) return;

      const page = pageForIndex(index);
      setCurrentPage((prev) => (prev === page ? prev : page));
    },
    [width],
  );

  const renderPage = useCallback(
    ({ item }: { item: number }) => {
      const isOpening = item === 1 || item === 2;
      const isPageBookmarked = bookmarks.some(
        (b) => pageForAyah(b.surah, b.ayah) === item,
      );
      return (
        <View
          style={{
            width,
            height: windowHeight,
            paddingTop: isOpening ? 0 : safeTop,
            paddingBottom: isOpening ? 0 : safeBottom,
            paddingHorizontal: isOpening ? 0 : 4,
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <MushafPageContainer
            page={item}
            width={isOpening ? width : width - 8}
            height={isOpening ? windowHeight : pageContentHeight}
            fontSize={fontSize}
            basmalahText={basmalahText}
            onSelectAyah={onSelectAyah}
            onToggleHeader={toggleHeader}
            isBookmarked={isPageBookmarked}
          />
        </View>
      );
    },
    [width, windowHeight, safeTop, safeBottom, pageContentHeight, fontSize, basmalahText, onSelectAyah, toggleHeader, bookmarks],
  );

  /** Surah shown in the top bar: whichever one the visible page belongs to. */
  const [pageSurah, setPageSurah] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getSurahForPage(currentPage)
      .then((surah) => {
        if (active) setPageSurah(surah);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentPage]);

  const activeSurah = useMemo(
    () => surahs.find((s) => s.number === pageSurah),
    [surahs, pageSurah],
  );

  const currentJuz = useMemo(() => juzForPage(currentPage), [currentPage]);
  const currentHizb = useMemo(() => hizbForPage(currentPage), [currentPage]);

  const isPageSaved = useMemo(() => {
    return bookmarks.some((b) => pageForAyah(b.surah, b.ayah) === currentPage);
  }, [bookmarks, currentPage]);

  const handleSavePage = useCallback(() => {
    const pos = firstAyahOnPage(currentPage);
    toggleBookmark(pos);
    setLastRead(pos);
  }, [currentPage, toggleBookmark, setLastRead]);

  const translateYTop = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-totalHeaderHeight, 0],
  });

  const translateYBottom = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Streamlined Animated Top Bar Overlay (RTL) */}
      <Animated.View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.base,
            paddingTop: insets.top,
            height: totalHeaderHeight,
            transform: [{ translateY: translateYTop }],
            opacity: headerAnim,
          },
        ]}
        pointerEvents={headerVisible ? 'auto' : 'none'}
      >
        {/* Right: Home button */}
        <View style={styles.topSideActions}>
          <Pressable
            onPress={() => router.push('/(tabs)/home')}
            hitSlop={HIT_SLOP}
            style={StyleSheet.flatten([
              styles.circleButton,
              { backgroundColor: colors.surfaceSunk, borderColor: colors.border },
            ])}
            accessibilityRole="button"
            accessibilityLabel="الرئيسية"
          >
            <Feather name="home" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Center: Surah Name & Juz info */}
        <View style={styles.centerPill}>
          <View
            style={styles.barSurahNameRow}
            accessible
            accessibilityLanguage="ar"
            accessibilityLabel={activeSurah ? `سورة ${activeSurah.nameAr}` : ''}
          >
            {activeSurah && (
              <Text
                style={[styles.barSurahPrefix, { color: colors.textSecond }]}
                allowFontScaling={false}
              >
                سورة
              </Text>
            )}
            <Text
              style={[styles.barSurahName, { color: colors.textPrimary }]}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {activeSurah?.nameAr ?? ''}
            </Text>
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.metaChip, { backgroundColor: colors.sageSoft }]}>
              <Text style={[styles.metaChipText, { color: colors.accent }]}>
                جزء {toArabicDigits(currentJuz)} · حزب {toArabicDigits(currentHizb)}
              </Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: colors.surfaceSunk }]}>
              <Text style={[styles.metaChipText, { color: colors.textSecond }]}>
                ص {toArabicDigits(currentPage)}
              </Text>
            </View>
          </View>
        </View>

        {/* Left: Bookmark / Save Reading Page Button */}
        <View style={styles.topSideActions}>
          <Pressable
            onPress={handleSavePage}
            hitSlop={HIT_SLOP}
            style={StyleSheet.flatten([
              styles.circleButton,
              {
                backgroundColor: isPageSaved ? colors.goldSoft : colors.surfaceSunk,
                borderColor: isPageSaved ? colors.gold : colors.border,
              },
            ])}
            accessibilityRole="button"
            accessibilityLabel={isPageSaved ? 'تم حفظ موضع القراءة' : 'حفظ موضع القراءة'}
          >
            <Feather
              name="bookmark"
              size={18}
              color={isPageSaved ? colors.gold : colors.textPrimary}
            />
          </Pressable>
        </View>
      </Animated.View>

      {/* Main Mushaf Horizontal Pager (Full immersion, exact page snapping) */}
      <View style={styles.pager}>
        <FlashList
          ref={listRef}
          data={PAGES}
          renderItem={renderPage}
          keyExtractor={(item: number) => String(item)}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          initialScrollIndex={indexForPage(initialPage)}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          style={styles.pager}
        />
      </View>

      {/* Animated Bottom Bar Overlay (RTL) containing Sommaire, Search, and Options */}
      <Animated.View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            transform: [{ translateY: translateYBottom }],
            opacity: headerAnim,
          },
        ]}
        pointerEvents={headerVisible ? 'auto' : 'none'}
      >
        {/* 1. Sommaire / Index button */}
        <Link href="/surahs" asChild>
          <Pressable
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [
              styles.bottomBarItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="فهرس السور"
          >
            <IslamicEmblem size={24} color={colors.gold} fillColor={colors.surface} />
          </Pressable>
        </Link>

        {/* 2. Search button */}
        <Link href="/search" asChild>
          <Pressable
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [
              styles.bottomBarItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="البحث في القرآن"
          >
            <Feather name="search" size={23} color={colors.textPrimary} />
          </Pressable>
        </Link>

        {/* 3. Options / Settings button */}
        <Pressable
          onPress={() => setSettingsOpen(true)}
          hitSlop={HIT_SLOP}
          style={({ pressed }) => [
            styles.bottomBarItem,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="خيارات القراءة"
        >
          <Feather name="sliders" size={22} color={colors.gold} />
        </Pressable>
      </Animated.View>

      {/* Reader Settings Modal / Bottom Sheet */}
      <ReaderSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentPage={currentPage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 100,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  topSideActions: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    minWidth: 44,
  },
  centerPill: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  barSurahNameRow: {
    alignItems: 'baseline',
    flexDirection: 'row-reverse',
    gap: 6,
    maxWidth: '100%',
  },
  barSurahPrefix: {
    fontFamily: fonts.defaultMedium,
    fontSize: 14,
  },
  barSurahName: {
    fontFamily: fonts.surahName,
    fontSize: 22,
    lineHeight: 28,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 4,
    marginTop: 2,
  },
  metaChip: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  metaChipText: {
    fontFamily: fonts.defaultBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  circleButton: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  bottomBar: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    elevation: 8,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    left: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    zIndex: 100,
  },
  bottomBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    paddingVertical: 8,
  },
  bottomBarLabel: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
    textAlign: 'center',
  },
});
