/**
 * Wallpaper Editor & Quran Text Overlay Customizer.
 *
 * Allows users to choose an ayah from presets or search,
 * toggle Basmalah & Surah name in calligraphy,
 * adjust overlay styling (position, color, darkening, font size),
 * and export/save the high-resolution wallpaper to their device gallery.
 */

import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { search, type SearchHit } from '../src/data/database';
import {
  DEFAULT_WALLPAPERS,
  PRESET_VERSES,
  getPresetVerseText,
  presetAyahLabel,
} from '../src/data/wallpapers';
import { useBasmalah } from '../src/features/reader/useQuranData';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';
import { toArabicDigits } from '../src/utils/arabicDigits';
import { saveImageToGallery } from '../src/utils/saveToGallery';
import { surahFontName } from '../src/utils/surahFontName';

type TextPosition = 'top' | 'center' | 'bottom';
type TextColor = 'gold' | 'white' | 'dark';

interface UnifiedVerseItem {
  id: string;
  surahNameAr: string;
  /** Display label for the ayah reference: `255`, or `5-6` for a range. */
  ayahLabel: string;
  surahNumber: number;
  /**
   * Arabic text, always sourced from `text_display` in the bundled database —
   * never a literal in this file. Empty until the DB read resolves.
   */
  text: string;
}

export default function WallpaperEditorScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ wallpaperId?: string; customImageUri?: string }>();

  // Canvas ViewShot ref for exporting
  const canvasRef = useRef<View>(null);
  const [saving, setSaving] = useState(false);

  // Wallpaper source
  const wallpaperSource = useMemo(() => {
    if (params.customImageUri) {
      return { uri: params.customImageUri };
    }
    const found = DEFAULT_WALLPAPERS.find((w) => w.id === params.wallpaperId);
    return found ? found.source : DEFAULT_WALLPAPERS[0].source;
  }, [params.customImageUri, params.wallpaperId]);

  // Selected verse. Text starts empty and is filled from the database — the
  // reference (surah/ayah) is all this screen is allowed to hardcode.
  const [selectedVerse, setSelectedVerse] = useState<UnifiedVerseItem>(() => ({
    id: PRESET_VERSES[0].id,
    surahNameAr: PRESET_VERSES[0].surahNameAr,
    ayahLabel: presetAyahLabel(PRESET_VERSES[0]),
    surahNumber: PRESET_VERSES[0].surahNumber,
    text: '',
  }));

  // Al-Fatiha 1:1 IS the Basmalah — the single source for the header text,
  // matching the reader. Never a literal: the Uthmani spelling of this phrase
  // carries codepoints that must never reach the screen.
  const basmalahText = useBasmalah();

  /** Preset texts, keyed by preset id, loaded once from the database. */
  const [presetTexts, setPresetTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      PRESET_VERSES.map(async (preset) => [preset.id, await getPresetVerseText(preset)] as const),
    )
      .then((entries) => {
        if (cancelled) return;
        const texts = Object.fromEntries(entries);
        setPresetTexts(texts);
        // Fill in the initial selection once its real text is available.
        setSelectedVerse((current) =>
          current.text === '' && texts[current.id] !== undefined
            ? { ...current, text: texts[current.id] }
            : current,
        );
      })
      .catch(() => {
        // Leave the presets empty rather than showing hand-typed scripture.
        if (!cancelled) setPresetTexts({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Customization controls
  const [position, setPosition] = useState<TextPosition>('center');
  const [textColor, setTextColor] = useState<TextColor>('gold');
  const [darknessOpacity, setDarknessOpacity] = useState<number>(0.35);
  const [fontSizeLevel, setFontSizeLevel] = useState<'sm' | 'md' | 'lg'>('md');

  // Toggle options for Basmalah and Surah name
  const [showBasmalah, setShowBasmalah] = useState(true);
  const [showSurahRef, setShowSurahRef] = useState(true);

  // Search Modal for picking any Ayah in Quran
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const hits = await search(query, 25);
      setSearchResults(hits);
    } catch {
      setSearchResults([]);
    }
  }, []);

  const selectSearchHit = useCallback((hit: SearchHit) => {
    setSelectedVerse({
      id: `search_${hit.surah}_${hit.ayah}`,
      surahNameAr: hit.surahNameAr,
      ayahLabel: `${hit.ayah}`,
      surahNumber: hit.surah,
      text: hit.text,
    });
    setSearchModalOpen(false);
  }, []);

  // Save composed wallpaper to phone library
  const handleSaveToGallery = useCallback(async () => {
    try {
      setSaving(true);

      if (!canvasRef.current) {
        setSaving(false);
        return;
      }

      const uri = await captureRef(canvasRef.current, {
        format: 'png',
        quality: 1.0,
      });

      const result = await saveImageToGallery(uri);
      if (result.status === 'permission-denied') {
        Alert.alert('الإذن مطلوب', 'يرجى تفعيل إذن الوصول لحفظ الصورة في ألبوم الصور.');
      } else if (result.status === 'failed') {
        Alert.alert('خطأ', 'تعذر حفظ الصورة. يرجى المحاولة مرة أخرى.');
      } else {
        Alert.alert('تم الحفظ بنجاح! ✨', 'تم حفظ الخلفية بدقة عالية في ألبوم الصور الخاص بك.');
      }
    } catch (e) {
      Alert.alert('خطأ', 'تعذر حفظ الصورة. يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  }, []);

  const activeColor = textColor === 'gold' ? '#F6DA9C' : textColor === 'white' ? '#FFFFFF' : '#1A1713';
  const ayahFontSize = fontSizeLevel === 'sm' ? 22 : fontSizeLevel === 'md' ? 26 : 32;
  const ayahLineHeight = fontSizeLevel === 'sm' ? 38 : fontSizeLevel === 'md' ? 44 : 52;

  const verseListData: UnifiedVerseItem[] = useMemo(() => {
    if (searchQuery.trim().length >= 2) {
      return searchResults.map((hit) => ({
        id: `search_${hit.surah}_${hit.ayah}`,
        surahNameAr: hit.surahNameAr,
        ayahLabel: `${hit.ayah}`,
        surahNumber: hit.surah,
        text: hit.text,
      }));
    }
    // Presets whose text has not loaded yet are omitted rather than shown
    // blank — a verse row with no scripture in it is meaningless.
    return PRESET_VERSES.filter((preset) => presetTexts[preset.id]).map((preset) => ({
      id: preset.id,
      surahNameAr: preset.surahNameAr,
      ayahLabel: presetAyahLabel(preset),
      surahNumber: preset.surahNumber,
      text: presetTexts[preset.id],
    }));
  }, [searchQuery, searchResults, presetTexts]);

  return (
    <View style={styles.container}>
      {/* Visual Canvas (Captured when saving) */}
      <View ref={canvasRef} style={[styles.canvas, { width, height }]} collapsable={false}>
        <Image
          source={wallpaperSource}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />

        {/* Darkness / Tint Overlay */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: `rgba(0, 0, 0, ${darknessOpacity})` },
          ]}
        />

        {/* Quran Verse Content */}
        <View
          style={[
            styles.versePositionContainer,
            position === 'top'
              ? styles.posTop
              : position === 'bottom'
              ? styles.posBottom
              : styles.posCenter,
            { paddingTop: insets.top + 50, paddingBottom: insets.bottom + 120 },
          ]}
        >
          <View style={styles.verseBox}>
            {/* Basmalah (Togglable) — text comes from Al-Fatiha 1:1 in the DB */}
            {showBasmalah && basmalahText !== '' && (
              <Text
                style={[
                  styles.canvasBasmalah,
                  { color: activeColor },
                ]}
              >
                {basmalahText}
              </Text>
            )}

            {/* Verse Text */}
            <Text
              style={[
                styles.canvasVerseText,
                {
                  color: activeColor,
                  fontSize: ayahFontSize,
                  lineHeight: ayahLineHeight,
                },
              ]}
              allowFontScaling={false}
            >
              « {selectedVerse.text} »
            </Text>

            {/* Surah Reference Badge with Calligraphy Font (Togglable) */}
            {showSurahRef && (
              <View
                style={[
                  styles.canvasReferenceBadge,
                  { borderColor: activeColor, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
                ]}
              >
                <Text
                  style={[
                    styles.canvasSurahName,
                    { color: activeColor },
                  ]}
                  allowFontScaling={false}
                >
                  سورة {surahFontName(selectedVerse.surahNameAr)}
                </Text>
                <Text
                  style={[
                    styles.canvasAyahNumber,
                    { color: activeColor },
                  ]}
                >
                  {`•  آية ${selectedVerse.ayahLabel}`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Floating Top Bar Navigation */}
      <SafeAreaView style={styles.topFloatingBar}>
        <View style={styles.topBarContent}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={HIT_SLOP}
            style={styles.circleBtn}
          >
            <Feather name="arrow-right" size={20} color="#FFF" />
          </Pressable>

          <Text style={styles.topBarTitle}>تخصيص الخلفية</Text>

          <Pressable
            onPress={handleSaveToGallery}
            disabled={saving}
            style={[styles.saveHeaderBtn, { backgroundColor: colors.gold }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#1A1713" />
            ) : (
              <>
                <Feather name="download" size={18} color="#1A1713" />
                <Text style={styles.saveHeaderBtnText}>حفظ</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Bottom Customizer Drawer */}
      <View style={[styles.bottomDrawer, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 12 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerScroll}>
          {/* Change Ayah Button */}
          <Pressable
            onPress={() => setSearchModalOpen(true)}
            style={[styles.drawerActionBtn, { borderColor: colors.gold, backgroundColor: colors.surfaceSunk }]}
          >
            <Feather name="search" size={16} color={colors.gold} />
            <Text style={[styles.drawerActionBtnText, { color: colors.textPrimary }]}>
              اختيار آية
            </Text>
          </Pressable>

          {/* Basmalah Toggle */}
          <Pressable
            onPress={() => setShowBasmalah((prev) => !prev)}
            style={[
              styles.drawerActionBtn,
              { borderColor: colors.border },
              showBasmalah
                ? { backgroundColor: colors.gold, borderColor: colors.gold }
                : { backgroundColor: colors.surfaceSunk },
            ]}
          >
            <Feather name={showBasmalah ? 'check-square' : 'square'} size={15} color={showBasmalah ? '#1A1713' : colors.textPrimary} />
            <Text
              style={[
                styles.drawerActionBtnText,
                { color: showBasmalah ? '#1A1713' : colors.textPrimary, fontFamily: fonts.defaultBold },
              ]}
            >
              البسملة
            </Text>
          </Pressable>

          {/* Surah Name Toggle */}
          <Pressable
            onPress={() => setShowSurahRef((prev) => !prev)}
            style={[
              styles.drawerActionBtn,
              { borderColor: colors.border },
              showSurahRef
                ? { backgroundColor: colors.gold, borderColor: colors.gold }
                : { backgroundColor: colors.surfaceSunk },
            ]}
          >
            <Feather name={showSurahRef ? 'check-square' : 'square'} size={15} color={showSurahRef ? '#1A1713' : colors.textPrimary} />
            <Text
              style={[
                styles.drawerActionBtnText,
                { color: showSurahRef ? '#1A1713' : colors.textPrimary, fontFamily: fonts.defaultBold },
              ]}
            >
              اسم السورة
            </Text>
          </Pressable>

          {/* Position Selector */}
          <View style={[styles.selectorGroup, { borderColor: colors.border }]}>
            <Text style={[styles.selectorGroupLabel, { color: colors.textSecond }]}>الموضع:</Text>
            <Pressable
              onPress={() => setPosition('top')}
              style={[styles.segBtn, position === 'top' && { backgroundColor: colors.gold }]}
            >
              <Text style={[styles.segBtnText, position === 'top' && { color: '#1A1713' }]}>أعلى</Text>
            </Pressable>
            <Pressable
              onPress={() => setPosition('center')}
              style={[styles.segBtn, position === 'center' && { backgroundColor: colors.gold }]}
            >
              <Text style={[styles.segBtnText, position === 'center' && { color: '#1A1713' }]}>وسط</Text>
            </Pressable>
            <Pressable
              onPress={() => setPosition('bottom')}
              style={[styles.segBtn, position === 'bottom' && { backgroundColor: colors.gold }]}
            >
              <Text style={[styles.segBtnText, position === 'bottom' && { color: '#1A1713' }]}>أسفل</Text>
            </Pressable>
          </View>

          {/* Color Selector */}
          <View style={[styles.selectorGroup, { borderColor: colors.border }]}>
            <Text style={[styles.selectorGroupLabel, { color: colors.textSecond }]}>اللون:</Text>
            <Pressable
              onPress={() => setTextColor('gold')}
              style={[styles.colorDot, { backgroundColor: '#E2BA65' }, textColor === 'gold' && styles.colorDotActive]}
            />
            <Pressable
              onPress={() => setTextColor('white')}
              style={[styles.colorDot, { backgroundColor: '#FFFFFF' }, textColor === 'white' && styles.colorDotActive]}
            />
            <Pressable
              onPress={() => setTextColor('dark')}
              style={[styles.colorDot, { backgroundColor: '#1A1713' }, textColor === 'dark' && styles.colorDotActive]}
            />
          </View>

          {/* Font Size Selector */}
          <View style={[styles.selectorGroup, { borderColor: colors.border }]}>
            <Text style={[styles.selectorGroupLabel, { color: colors.textSecond }]}>الخط:</Text>
            <Pressable
              onPress={() => setFontSizeLevel('sm')}
              style={[styles.segBtn, fontSizeLevel === 'sm' && { backgroundColor: colors.gold }]}
            >
              <Text style={[styles.segBtnText, fontSizeLevel === 'sm' && { color: '#1A1713' }]}>صغير</Text>
            </Pressable>
            <Pressable
              onPress={() => setFontSizeLevel('md')}
              style={[styles.segBtn, fontSizeLevel === 'md' && { backgroundColor: colors.gold }]}
            >
              <Text style={[styles.segBtnText, fontSizeLevel === 'md' && { color: '#1A1713' }]}>متوسط</Text>
            </Pressable>
            <Pressable
              onPress={() => setFontSizeLevel('lg')}
              style={[styles.segBtn, fontSizeLevel === 'lg' && { backgroundColor: colors.gold }]}
            >
              <Text style={[styles.segBtnText, fontSizeLevel === 'lg' && { color: '#1A1713' }]}>كبير</Text>
            </Pressable>
          </View>

          {/* Darkness Toggle */}
          <Pressable
            onPress={() =>
              setDarknessOpacity((prev) => (prev === 0 ? 0.25 : prev === 0.25 ? 0.5 : 0))
            }
            style={[styles.drawerActionBtn, { borderColor: colors.border, backgroundColor: colors.surfaceSunk }]}
          >
            <Feather name="moon" size={16} color={colors.textPrimary} />
            <Text style={[styles.drawerActionBtnText, { color: colors.textPrimary }]}>
              تعتيم {darknessOpacity * 100}%
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Search Ayah Modal */}
      <Modal
        visible={searchModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSearchModalOpen(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={() => setSearchModalOpen(false)}
              style={styles.modalCloseBtn}
            >
              <Feather name="x" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              اختر آية من القرآن الكريم
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Search Input */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.textSecond} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="ابحث عن آية أو سورة..."
              placeholderTextColor={colors.textSecond}
              value={searchQuery}
              onChangeText={handleSearch}
              textAlign="right"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Preset Ayahs or Search Results */}
          <FlatList
            data={verseListData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.verseList}
            ListHeaderComponent={
              searchQuery.trim().length < 2 ? (
                <Text style={[styles.presetSectionTitle, { color: colors.textSecond }]}>
                  آيات مختارة شائعة:
                </Text>
              ) : null
            }
            renderItem={({ item }) => {
              const title = `سورة ${item.surahNameAr} • آية ${toArabicDigits(item.ayahLabel)}`;
              return (
                <Pressable
                  onPress={() => {
                    setSelectedVerse(item);
                    setSearchModalOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.verseRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.verseRowSurah, { color: colors.gold }]}>{title}</Text>
                  <Text style={[styles.verseRowText, { color: colors.textPrimary }]}>
                    « {item.text} »
                  </Text>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
  },
  canvas: {
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  versePositionContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  posTop: {
    justifyContent: 'flex-start',
  },
  posCenter: {
    justifyContent: 'center',
  },
  posBottom: {
    justifyContent: 'flex-end',
  },
  verseBox: {
    alignItems: 'center',
    width: '100%',
  },
  canvasBasmalah: {
    fontFamily: fonts.quran,
    fontSize: 18,
    marginBottom: 14,
    textAlign: 'center',
  },
  canvasVerseText: {
    fontFamily: fonts.quran,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  canvasReferenceBadge: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  canvasSurahName: {
    fontFamily: fonts.surahName,
    fontSize: 22,
    lineHeight: 28,
  },
  canvasAyahNumber: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  topFloatingBar: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 50,
  },
  topBarContent: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  topBarTitle: {
    color: '#FFF',
    fontFamily: fonts.defaultBold,
    fontSize: 17,
  },
  circleBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  saveHeaderBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    flexDirection: 'row-reverse',
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveHeaderBtnText: {
    color: '#1A1713',
    fontFamily: fonts.defaultBold,
    fontSize: 14,
  },
  bottomDrawer: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  drawerScroll: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  drawerActionBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 6,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  drawerActionBtnText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 13,
  },
  selectorGroup: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 4,
    height: 40,
    paddingHorizontal: 10,
  },
  selectorGroupLabel: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginLeft: 4,
  },
  segBtn: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  segBtnText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 12,
  },
  colorDot: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#888',
    height: 22,
    marginHorizontal: 2,
    width: 22,
  },
  colorDotActive: {
    borderColor: '#FFF',
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 17,
  },
  modalCloseBtn: {
    padding: spacing.xs,
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
  verseList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  presetSectionTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  verseRow: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  verseRowSurah: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'right',
  },
  verseRowText: {
    fontFamily: fonts.quran,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
