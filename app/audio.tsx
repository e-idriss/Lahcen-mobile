
/**
 * Quran Reciters Screen (`app/audio.tsx`).
 *
 * Displays the list of Islamic reciters (Cheikhs) from mp3quran.net,
 * with luxury Quran image hero header, search by name, spotlight on popular reciters,
 * and navigation to surah tracks.
 */

import { Feather } from '@expo/vector-icons';
import { ImageBackground } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IslamicEmblem } from '../src/components/ui/IslamicEmblem';
import { fetchReciters, POPULAR_RECITER_IDS } from '../src/features/audio/audioApi';
import type { Reciter } from '../src/features/audio/types';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';
import { toArabicDigits } from '../src/utils/arabicDigits';

export default function AudioRecitersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    fetchReciters()
      .then((data) => {
        if (active) {
          setReciters(data);
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

  // Filter reciters by search
  const filteredReciters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reciters;
    return reciters.filter((r) => r.name.toLowerCase().includes(q));
  }, [reciters, searchQuery]);

  // Featured Popular reciters
  const popularReciters = useMemo(() => {
    return reciters.filter((r) => POPULAR_RECITER_IDS.includes(r.id));
  }, [reciters]);

  const openReciter = useCallback((reciter: Reciter) => {
    router.push({
      pathname: '/reciter-surahs',
      params: { reciterJson: JSON.stringify(reciter) },
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={loading ? [] : filteredReciters}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        ListHeaderComponent={
          <>
            {/* Top Hero: Full-Width Mosque Backdrop */}
            <ImageBackground
              source={require('../assets/images/mosque.jpg')}
              style={[
                styles.heroBackdrop,
                {
                  paddingTop: insets.top + 8,
                },
              ]}
              imageStyle={styles.heroImage}
            >
              {/* Scrim overlay for rich contrast */}
              <View style={[styles.scrim, { backgroundColor: colors.overlayScrim }]} />

              <View style={styles.heroInnerContent}>
                {/* Header Row */}
                <View style={styles.headerRow}>
                  <Pressable
                    onPress={() => router.back()}
                    hitSlop={HIT_SLOP}
                    style={[
                      styles.headerBtn,
                      { backgroundColor: 'rgba(0, 0, 0, 0.55)', borderColor: 'rgba(255, 255, 255, 0.3)' },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="رجوع"
                  >
                    <Feather name="arrow-right" size={20} color="#FFFFFF" />
                  </Pressable>

                  <Text style={[styles.headerTitleText, { color: '#FFFFFF' }]}>
                    التلاوات القرآنية
                  </Text>

                  <View
                    style={[
                      styles.headerBadge,
                      { backgroundColor: 'rgba(0, 0, 0, 0.55)', borderColor: '#F5D77F' },
                    ]}
                  >
                    <Feather name="headphones" size={16} color="#F5D77F" />
                  </View>
                </View>

                {/* Subtitle & Search Bar */}
                <View style={styles.heroBottomArea}>
                  <Text style={[styles.heroSubtitle, { color: '#FFEED6' }]}>
                    استمع وحمل تلاوات بأصوات كبار القراء
                  </Text>

                  <View
                    style={[
                      styles.searchBar,
                      {
                        backgroundColor: 'rgba(0, 0, 0, 0.55)',
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                    ]}
                  >
                    <Feather name="search" size={18} color="#F5D77F" />
                    <TextInput
                      style={[styles.searchInput, { color: '#FFFFFF' }]}
                      placeholder="ابحث عن قارئ أو شيخ..."
                      placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      textAlign="right"
                      clearButtonMode="while-editing"
                    />
                  </View>
                </View>
              </View>
            </ImageBackground>

            {/* Bottom Content Section (Rounded Top overlapping image) */}
            <View
              style={[
                styles.bottomSection,
                {
                  backgroundColor: colors.bg,
                  borderTopColor: colors.goldSoft,
                },
              ]}
            >
              {loading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={colors.gold} />
                  <Text style={[styles.loadingText, { color: colors.textSecond }]}>
                    جاري تحميل قائمة القراء...
                  </Text>
                </View>
              ) : (
                <>
                  {searchQuery.trim().length === 0 && popularReciters.length > 0 && (
                    <View style={styles.featuredSection}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                          أشهر القراء
                        </Text>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.featuredScroll}
                      >
                        {popularReciters.map((r) => (
                          <Pressable
                            key={r.id}
                            onPress={() => openReciter(r)}
                            style={({ pressed }) => [
                              styles.featuredCard,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                opacity: pressed ? 0.85 : 1,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.featuredEmblem,
                                { backgroundColor: colors.surfaceSunk },
                              ]}
                            >
                              <IslamicEmblem
                                size={30}
                                color={colors.gold}
                                fillColor={colors.surface}
                              />
                            </View>
                            <Text
                              style={[styles.featuredName, { color: colors.textPrimary }]}
                              numberOfLines={2}
                            >
                              {r.name}
                            </Text>
                            <View
                              style={[
                                styles.riwayahBadge,
                                { backgroundColor: colors.surfaceSunk },
                              ]}
                            >
                              <Text
                                style={[styles.riwayahText, { color: colors.gold }]}
                                numberOfLines={1}
                              >
                                {r.moshaf[0]?.name || 'مصحف مرتل'}
                              </Text>
                            </View>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <View style={[styles.sectionHeaderRow, { marginTop: spacing.md }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                      جميع القراء ({toArabicDigits(filteredReciters.length)})
                    </Text>
                  </View>
                </>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.lg, backgroundColor: colors.bg }}>
            <Pressable
              onPress={() => openReciter(item)}
              style={({ pressed }) => [
                styles.reciterRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {/* Right: Emblem Avatar */}
              <View style={[styles.avatarCircle, { backgroundColor: colors.surfaceSunk }]}>
                <IslamicEmblem size={24} color={colors.gold} fillColor={colors.surface} />
              </View>

              {/* Center: Reciter Info */}
              <View style={styles.reciterInfoCol}>
                <Text style={[styles.reciterName, { color: colors.textPrimary }]}>
                  الشيخ {item.name}
                </Text>
                <Text style={[styles.reciterMoshafs, { color: colors.textSecond }]} numberOfLines={1}>
                  {item.moshaf.map((m) => m.name).join(' • ')}
                </Text>
              </View>

              {/* Left: Surah count badge & chevron */}
              <View style={styles.rowLeftCol}>
                <View style={[styles.surahCountPill, { backgroundColor: colors.surfaceSunk }]}>
                  <Text style={[styles.surahCountText, { color: colors.gold }]}>
                    {toArabicDigits(item.moshaf[0]?.surah_total || 114)} سورة
                  </Text>
                </View>
                <Feather name="chevron-left" size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBackdrop: {
    overflow: 'hidden',
    paddingBottom: spacing['3xl'] + 6,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  heroImage: {},
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  heroInnerContent: {
    zIndex: 2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleText: {
    fontFamily: fonts.defaultBold,
    fontSize: 18,
  },
  headerBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerBadge: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  heroBottomArea: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  heroSubtitle: {
    fontFamily: fonts.defaultMedium,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  searchBar: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    width: '100%',
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.default,
    fontSize: 14,
    height: 28,
  },
  bottomSection: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.5,
    marginTop: -26,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 14,
  },
  featuredSection: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 17,
  },
  featuredScroll: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  featuredCard: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featuredEmblem: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 48,
  },
  featuredName: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
    minHeight: 36,
    textAlign: 'center',
  },
  riwayahBadge: {
    borderRadius: radius.full,
    marginTop: spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  riwayahText: {
    fontFamily: fonts.default,
    fontSize: 11,
  },
  reciterRow: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  avatarCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  reciterInfoCol: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: spacing.md,
  },
  reciterName: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
    textAlign: 'right',
  },
  reciterMoshafs: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  rowLeftCol: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.xs,
  },
  surahCountPill: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  surahCountText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 11,
  },
});
