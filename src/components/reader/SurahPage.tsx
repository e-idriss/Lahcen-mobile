/**
 * One surah rendered as a vertically scrolling page inside the horizontal pager.
 */

import { FlashList } from '@shopify/flash-list';
import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { Ayah, Surah } from '../../data/database';
import { useSurahAyahs } from '../../features/reader/useQuranData';
import { useSettings } from '../../store/settings';
import { useTheme } from '../../theme/ThemeProvider';
import { AyahView } from './AyahView';
import { Basmalah } from './Basmalah';
import { SurahHeader } from './SurahHeader';

interface Props {
  surah: Surah;
  width: number;
  /** The Basmalah text, taken from Al-Fatiha 1:1 in the database. */
  basmalahText: string;
  selected: { surah: number; ayah: number } | null;
  onSelectAyah: (position: { surah: number; ayah: number }) => void;
}

export function SurahPage({ surah, width, basmalahText, selected, onSelectAyah }: Props) {
  const { colors, spacing } = useTheme();
  const { data: ayahs, loading, error } = useSurahAyahs(surah.number);

  const fontSize = useSettings((s) => s.arabicFontSize);
  const showTranslation = useSettings((s) => s.showTranslation);
  const bookmarks = useSettings((s) => s.bookmarks);

  const renderItem = useCallback(
    ({ item }: { item: Ayah }) => (
      <AyahView
        surah={item.surah}
        ayah={item.ayah}
        text={item.text}
        translation={item.translation}
        fontSize={fontSize}
        showTranslation={showTranslation}
        isSelected={selected?.surah === item.surah && selected?.ayah === item.ayah}
        isBookmarked={bookmarks.some((b) => b.surah === item.surah && b.ayah === item.ayah)}
        onPress={onSelectAyah}
      />
    ),
    [fontSize, showTranslation, selected, bookmarks, onSelectAyah],
  );

  const keyExtractor = useCallback((item: Ayah) => String(item.id), []);

  const header = (
    <>
      <SurahHeader
        nameAr={surah.nameAr}
        revelation={surah.revelation}
        ayahCount={surah.ayahCount}
      />
      {/* At-Tawba has no Basmalah; Al-Fatiha carries it as ayah 1. */}
      {ayahs.length > 0 && ayahs[0].hasBasmalah && (
        <Basmalah text={basmalahText} fontSize={fontSize} />
      )}
    </>
  );

  if (error !== null) {
    return (
      <View style={[styles.centered, { width }]}>
        <Text style={{ color: colors.textSecond }}>تعذر تحميل هذه السورة.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { width }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    // `flex: 1` is required: without a bounded height the nested vertical list
    // collapses to zero and the page renders blank.
    <View style={{ width, flex: 1 }}>
      <FlashList
        data={ayahs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingBottom: spacing['5xl'],
          paddingHorizontal: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
