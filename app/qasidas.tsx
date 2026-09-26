/**
 * Qasā'id al-Madā'iḥ Screen (`app/qasidas.tsx`).
 *
 * Lists the devotional poems in praise of the Prophet ﷺ shipped with the app —
 * al-Burda and al-Hamziyya of al-Busiri. Each row opens a verse-by-verse
 * reader (`app/qasida.tsx`). A search bar spans both poems.
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IslamicEmblem } from '../src/components/ui/IslamicEmblem';
import {
  getAllQasidas,
  searchQasidas,
  type Qasida,
  type QasidaSearchHit,
} from '../src/data/database';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';
import { toArabicDigits } from '../src/utils/arabicDigits';

const SEARCH_DEBOUNCE_MS = 250;

export default function QasidasScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [qasidas, setQasidas] = useState<Qasida[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QasidaSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    getAllQasidas()
      .then((data) => {
        if (active) {
          setQasidas(data);
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

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      searchQasidas(trimmed, 40)
        .then((hits) => {
          if (id === requestId.current) {
            setResults(hits);
            setSearching(false);
          }
        })
        .catch(() => {
          if (id === requestId.current) {
            setResults([]);
            setSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const openQasida = useCallback((slug: string) => {
    router.push({ pathname: '/qasida', params: { slug } });
  }, []);

  const isSearchActive = query.trim().length >= 2;

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          قصائد المدائح النبوية
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.textSecond} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="ابحث في أبيات القصائد..."
          placeholderTextColor={colors.textSecond}
          value={query}
          onChangeText={setQuery}
          textAlign="right"
          clearButtonMode="while-editing"
        />
        {searching && <ActivityIndicator size="small" color={colors.gold} />}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : isSearchActive ? (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !searching ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                لا توجد أبيات مطابقة لبحثك
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openQasida(item.qasidaSlug)}
              style={({ pressed }) => [
                styles.hitCard,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={styles.hitTopRow}>
                <View style={[styles.badge, { backgroundColor: colors.surfaceSunk }]}>
                  <Text style={[styles.badgeText, { color: colors.gold }]}>{item.qasidaName}</Text>
                </View>
                {item.verseNumber > 0 && (
                  <Text style={[styles.hitMeta, { color: colors.textSecond }]}>
                    البيت {toArabicDigits(item.verseNumber)}
                  </Text>
                )}
              </View>
              <Text style={[styles.hitVerse, { color: colors.textPrimary }]} allowFontScaling={false}>
                {item.hemistichA}
                {'  ·  '}
                {item.hemistichB}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={qasidas}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openQasida(item.slug)}
              style={({ pressed }) => [
                styles.qasidaCard,
                { backgroundColor: colors.surface, borderColor: colors.goldSoft, opacity: pressed ? 0.9 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.name}
            >
              <View style={[styles.emblemCircle, { backgroundColor: colors.surfaceSunk }]}>
                <IslamicEmblem size={26} color={colors.gold} fillColor={colors.surface} />
              </View>
              <View style={styles.qasidaInfo}>
                <Text style={[styles.qasidaName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.qasidaFullName, { color: colors.gold }]} numberOfLines={1}>
                  {item.fullName}
                </Text>
                <Text style={[styles.qasidaMeta, { color: colors.textSecond }]} numberOfLines={1}>
                  {item.author}
                </Text>
                <View style={styles.chipRow}>
                  <View style={[styles.chip, { backgroundColor: colors.sageSoft }]}>
                    <Text style={[styles.chipText, { color: colors.accent }]}>
                      {toArabicDigits(item.verseCount)} بيت
                    </Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: colors.surfaceSunk }]}>
                    <Text style={[styles.chipText, { color: colors.textSecond }]}>
                      بحر {item.meter}
                    </Text>
                  </View>
                </View>
              </View>
              <Feather name="chevron-left" size={18} color={colors.textMuted} />
            </Pressable>
          )}
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
  headerTitle: { fontFamily: fonts.defaultBold, fontSize: 18 },
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
  searchInput: { flex: 1, fontFamily: fonts.default, fontSize: 15, height: 28 },
  centerContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  emptyText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 14,
    marginTop: spacing['3xl'],
    textAlign: 'center',
  },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  qasidaCard: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.base,
  },
  emblemCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  qasidaInfo: { alignItems: 'flex-end', flex: 1, gap: 2 },
  qasidaName: { fontFamily: fonts.surahName, fontSize: 30, lineHeight: 42, textAlign: 'right' },
  qasidaFullName: { fontFamily: fonts.defaultMedium, fontSize: 13, textAlign: 'right' },
  qasidaMeta: { fontFamily: fonts.default, fontSize: 12, textAlign: 'right' },
  chipRow: { flexDirection: 'row-reverse', gap: spacing.xs, marginTop: spacing.xs },
  chip: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontFamily: fonts.defaultMedium, fontSize: 11 },
  hitCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.base,
  },
  hitTopRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.defaultBold, fontSize: 12 },
  hitMeta: { fontFamily: fonts.default, fontSize: 12 },
  hitVerse: {
    fontFamily: fonts.quran,
    fontSize: 18,
    lineHeight: 36,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
