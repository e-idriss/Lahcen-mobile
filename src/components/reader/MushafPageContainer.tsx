/**
 * Loads one mushaf page's data and renders it.
 * Supports Hafs (King Fahd Complex QCF v2 fonts) and Warsh (Maghribi Uthmani).
 */

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useMushafPage } from '../../features/reader/useMushafPage';
import { useTheme } from '../../theme/ThemeProvider';
import { MushafPage } from './MushafPage';

interface Props {
  page: number;
  width: number;
  height: number;
  fontSize: number;
  basmalahText: string;
  onSelectAyah: (position: { surah: number; ayah: number; page: number }) => void;
  onToggleHeader: () => void;
  isBookmarked?: boolean;
  selectedAyah?: { surah: number; ayah: number } | null;
  savedAyah?: { surah: number; ayah: number } | null;
}

export function MushafPageContainer({
  page,
  width,
  height,
  basmalahText,
  onSelectAyah,
  onToggleHeader,
  isBookmarked = false,
  selectedAyah = null,
  savedAyah = null,
}: Props) {
  const { colors, spacing } = useTheme();
  const pageState = useMushafPage(page);

  if (pageState.loading && pageState.rawAyahs.length === 0 && !pageState.qcfLayout && !pageState.warshLayout) {
    return (
      <View style={[styles.centered, { width, height }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (pageState.error !== null && pageState.rawAyahs.length === 0) {
    return (
      <View style={[styles.centered, { width, height, paddingHorizontal: spacing.xl }]}>
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          تعذر تحميل هذه الصفحة
        </Text>
        <Text style={[styles.errorBody, { color: colors.textSecond, marginTop: spacing.xs }]}>
          {`الصفحة ${page} لم تُرجع أي نص.`}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      <MushafPage
        page={page}
        width={width}
        height={height}
        riwaya={pageState.riwaya}
        juzNumber={pageState.juzNumber}
        hizbNumber={pageState.hizbNumber}
        surahNameAr={pageState.surahNameAr}
        qcfFontFamily={pageState.qcfFontFamily}
        isQcfFontLoaded={pageState.isQcfFontLoaded}
        qcfLayout={pageState.qcfLayout}
        warshLayout={pageState.warshLayout}
        rawAyahs={pageState.rawAyahs}
        basmalahText={basmalahText}
        onSelectAyah={onSelectAyah}
        onToggleHeader={onToggleHeader}
        isBookmarked={isBookmarked}
        selectedAyah={selectedAyah}
        savedAyah={savedAyah}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', writingDirection: 'rtl' },
  errorBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', writingDirection: 'rtl' },
});
