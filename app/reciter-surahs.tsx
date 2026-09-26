/**
 * Surahs list screen for a chosen reciter (`app/reciter-surahs.tsx`).
 *
 * Displays all available surahs for the reciter with instant streaming,
 * download to offline storage, and active playback indicator.
 */

import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAllSurahs, type Surah } from '../src/data/database';
import { getSurahAudioUrl } from '../src/features/audio/audioApi';
import { useAudioStore } from '../src/features/audio/audioStore';
import {
  deleteDownloadedSurah,
  downloadSurah,
  getDownloadedSurahsForReciter,
} from '../src/features/audio/downloadManager';
import type { AudioTrack, Moshaf, Reciter } from '../src/features/audio/types';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';
import { toArabicDigits } from '../src/utils/arabicDigits';
import { surahFontName } from '../src/utils/surahFontName';

/**
 * Parses the `reciterJson` route param into a Reciter, or null.
 *
 * `JSON.parse` alone is not enough: it succeeds on `{}`, `42`, or `true`, all
 * of which pass a `!reciter` guard and then throw on `reciter.moshaf[0]`. The
 * app declares a `quran://` URL scheme, so this param can arrive from an
 * external link and must be treated as untrusted input.
 */
function parseReciterParam(raw: string | undefined): Reciter | null {
  if (typeof raw !== 'string' || raw === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Partial<Reciter>;

  if (typeof candidate.id !== 'number' || typeof candidate.name !== 'string') return null;
  if (!Array.isArray(candidate.moshaf) || candidate.moshaf.length === 0) return null;

  const moshafValid = candidate.moshaf.every(
    (m): m is Moshaf =>
      typeof m === 'object' &&
      m !== null &&
      typeof m.id === 'number' &&
      typeof m.server === 'string' &&
      typeof m.surah_list === 'string',
  );
  if (!moshafValid) return null;

  return candidate as Reciter;
}

export default function ReciterSurahsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ reciterJson: string }>();

  const reciter: Reciter | null = useMemo(
    () => parseReciterParam(params.reciterJson),
    [params.reciterJson],
  );

  const [allSurahMeta, setAllSurahMeta] = useState<Surah[]>([]);
  const [selectedMoshaf, setSelectedMoshaf] = useState<Moshaf | null>(
    reciter?.moshaf[0] || null,
  );
  const [downloadedSurahs, setDownloadedSurahs] = useState<Set<number>>(new Set());
  const [downloadingSurahs, setDownloadingSurahs] = useState<Record<number, boolean>>({});

  // Audio store hooks
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const playbackStatus = useAudioStore((s) => s.playbackStatus);
  const playTrack = useAudioStore((s) => s.playTrack);
  const togglePlayPause = useAudioStore((s) => s.togglePlayPause);

  // Load Quran database metadata
  useEffect(() => {
    void getAllSurahs().then(setAllSurahMeta);
  }, []);

  // Load downloaded surahs for this reciter
  useEffect(() => {
    if (!reciter) return;
    void getDownloadedSurahsForReciter(reciter.id).then((nums) => {
      setDownloadedSurahs(new Set(nums));
    });
  }, [reciter]);

  // List of available surahs for current Moshaf
  const availableSurahList: Surah[] = useMemo(() => {
    if (!selectedMoshaf || allSurahMeta.length === 0) return [];
    const availableNumbers = new Set(
      selectedMoshaf.surah_list.split(',').map((n) => Number(n.trim())),
    );
    return allSurahMeta.filter((s) => availableNumbers.has(s.number));
  }, [selectedMoshaf, allSurahMeta]);

  // Handle Play
  const handlePlaySurah = useCallback(
    async (surah: Surah) => {
      if (!reciter || !selectedMoshaf) return;

      const isCurrent =
        currentTrack?.surahNumber === surah.number &&
        currentTrack?.reciterId === reciter.id;

      if (isCurrent) {
        await togglePlayPause();
        return;
      }

      const track: AudioTrack = {
        surahNumber: surah.number,
        surahNameAr: surah.nameAr,
        reciterId: reciter.id,
        reciterName: reciter.name,
        moshafName: selectedMoshaf.name,
        audioUrl: getSurahAudioUrl(selectedMoshaf.server, surah.number),
      };

      // Build playlist of all available surahs for this reciter
      const playlist: AudioTrack[] = availableSurahList.map((s) => ({
        surahNumber: s.number,
        surahNameAr: s.nameAr,
        reciterId: reciter.id,
        reciterName: reciter.name,
        moshafName: selectedMoshaf.name,
        audioUrl: getSurahAudioUrl(selectedMoshaf.server, s.number),
      }));

      await playTrack(track, playlist);
    },
    [reciter, selectedMoshaf, currentTrack, availableSurahList, playTrack, togglePlayPause],
  );

  // Handle Download / Delete
  const handleToggleDownload = useCallback(
    async (surah: Surah) => {
      if (!reciter || !selectedMoshaf) return;
      const isDownloaded = downloadedSurahs.has(surah.number);

      if (isDownloaded) {
        Alert.alert(
          'حذف التلاوة المحفوظة',
          `هل تريد حذف سورة ${surah.nameAr} من الذاكرة؟`,
          [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'حذف',
              style: 'destructive',
              onPress: async () => {
                await deleteDownloadedSurah(reciter.id, surah.number);
                setDownloadedSurahs((prev) => {
                  const next = new Set(prev);
                  next.delete(surah.number);
                  return next;
                });
              },
            },
          ],
        );
        return;
      }

      // Start download
      setDownloadingSurahs((prev) => ({ ...prev, [surah.number]: true }));
      try {
        const remoteUrl = getSurahAudioUrl(selectedMoshaf.server, surah.number);
        await downloadSurah(reciter.id, surah.number, remoteUrl);
        setDownloadedSurahs((prev) => new Set(prev).add(surah.number));
      } catch {
        Alert.alert('خطأ', 'فشل تحميل السورة. يرجى التحقق من اتصال الإنترنت.');
      } finally {
        setDownloadingSurahs((prev) => ({ ...prev, [surah.number]: false }));
      }
    },
    [reciter, selectedMoshaf, downloadedSurahs],
  );

  if (!reciter) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.textPrimary, textAlign: 'center', marginTop: 40 }}>
          تعذر العثور على بيانات القارئ
        </Text>
      </SafeAreaView>
    );
  }

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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {reciter.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.gold }]}>
            {selectedMoshaf?.name}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Surah List */}
      <FlatList
        data={availableSurahList}
        keyExtractor={(item) => String(item.number)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isCurrent =
            currentTrack?.surahNumber === item.number &&
            currentTrack?.reciterId === reciter.id;
          const isPlaying = isCurrent && playbackStatus === 'playing';
          const isDownloaded = downloadedSurahs.has(item.number);
          const isDownloading = downloadingSurahs[item.number];

          return (
            <Pressable
              onPress={() => void handlePlaySurah(item)}
              style={({ pressed }) => [
                styles.surahRow,
                {
                  backgroundColor: isCurrent ? colors.surfaceSunk : colors.surface,
                  borderColor: isCurrent ? colors.gold : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {/* Right: Surah number medallion */}
              <View
                style={[
                  styles.numberBadge,
                  { backgroundColor: isCurrent ? colors.gold : colors.surfaceSunk },
                ]}
              >
                {isPlaying ? (
                  <Feather name="volume-2" size={16} color={isCurrent ? '#1A1713' : colors.gold} />
                ) : (
                  <Text
                    style={[
                      styles.numberText,
                      { color: isCurrent ? '#1A1713' : colors.textPrimary },
                    ]}
                  >
                    {toArabicDigits(item.number)}
                  </Text>
                )}
              </View>

              {/* Center: Surah Name in Calligraphy & Meta */}
              <View style={styles.surahInfoCol}>
                <Text
                  style={[
                    styles.surahName,
                    { color: isCurrent ? colors.gold : colors.textPrimary },
                  ]}
                  allowFontScaling={false}
                >
                  سورة {surahFontName(item.nameAr)}
                </Text>
                <Text style={[styles.surahMeta, { color: colors.textSecond }]}>
                  {item.revelation === 'Meccan' ? 'مكية' : 'مدنية'} • {toArabicDigits(item.ayahCount)} آية
                </Text>
              </View>

              {/* Left: Play button & Download button */}
              <View style={styles.actionsRow}>
                {/* Download Button */}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    void handleToggleDownload(item);
                  }}
                  hitSlop={HIT_SLOP}
                  style={[
                    styles.downloadBtn,
                    {
                      backgroundColor: isDownloaded ? colors.sageSoft : colors.surfaceSunk,
                      borderColor: isDownloaded ? colors.sage : colors.border,
                    },
                  ]}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={colors.gold} />
                  ) : (
                    <Feather
                      name={isDownloaded ? 'check' : 'download-cloud'}
                      size={16}
                      color={isDownloaded ? colors.accent : colors.textSecond}
                    />
                  )}
                </Pressable>

                {/* Play Button */}
                <View
                  style={[
                    styles.playIconCircle,
                    { backgroundColor: isCurrent ? colors.gold : colors.surfaceSunk },
                  ]}
                >
                  <Feather
                    name={isPlaying ? 'pause' : 'play'}
                    size={16}
                    color={isCurrent ? '#1A1713' : colors.textPrimary}
                    style={{ marginLeft: isPlaying ? 0 : 2 }}
                  />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  surahRow: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  numberBadge: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  numberText: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
  },
  surahInfoCol: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: spacing.md,
  },
  surahName: {
    fontFamily: fonts.surahName,
    fontSize: 26,
    lineHeight: 30,
    textAlign: 'right',
  },
  surahMeta: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.sm,
  },
  downloadBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  playIconCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
