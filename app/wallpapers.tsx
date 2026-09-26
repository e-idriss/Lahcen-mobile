/**
 * Wallpapers screen (`app/wallpapers.tsx`).
 *
 * Wallpapers gallery + custom photo import + Quran text editor.
 * Home screen widgets live in their own screen (`app/widgets.tsx`).
 */

import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_WALLPAPERS, type WallpaperItem } from '../src/data/wallpapers';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';

export default function WallpapersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [previewItem, setPreviewItem] = useState<WallpaperItem | null>(null);

  // Pick custom image from user's phone gallery
  const pickCustomImage = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('إذن الوصول مطلوب', 'يرجى السماح للتطبيق بالوصول إلى مكتبة الصور لاختيار خلفية.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        router.push({
          pathname: '/wallpaper-editor',
          params: { customImageUri: uri },
        });
      }
    } catch {
      Alert.alert('خطأ', 'تعذر فتح ألبوم الصور');
    }
  }, []);

  const openEditor = useCallback((item: WallpaperItem) => {
    setPreviewItem(null);
    router.push({
      pathname: '/wallpaper-editor',
      params: { wallpaperId: item.id },
    });
  }, []);

  const numColumns = 2;
  const cardWidth = (width - spacing.lg * 2 - spacing.md) / numColumns;
  const cardHeight = cardWidth * 1.77; // 9:16 aspect ratio

  const renderWallpaperCard = useCallback(
    ({ item }: { item: WallpaperItem }) => (
      <Pressable
        onPress={() => setPreviewItem(item)}
        style={({ pressed }) => [
          styles.card,
          {
            width: cardWidth,
            height: cardHeight,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <Image
          source={item.source}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.cardOverlay}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.titleAr}
          </Text>
        </View>
      </Pressable>
    ),
    [cardWidth, cardHeight, colors.border],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Header */}
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
          خلفيات الشاشة
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Wallpapers gallery */}
      <FlatList
        data={DEFAULT_WALLPAPERS}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Custom Image Import Banner */}
            <Pressable
              onPress={pickCustomImage}
              style={({ pressed }) => [
                styles.importBanner,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.gold,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={[styles.importIconCircle, { backgroundColor: colors.surfaceSunk }]}>
                <Feather name="image" size={24} color={colors.gold} />
              </View>
              <View style={styles.importTextCol}>
                <Text style={[styles.importTitle, { color: colors.textPrimary }]}>
                  اختر صورة من ألبوم الصور
                </Text>
                <Text style={[styles.importSubtitle, { color: colors.textSecond }]}>
                  استخدم أي صورة من هاتفك وأضف عليها آيات القرآن
                </Text>
              </View>
              <Feather name="plus-circle" size={22} color={colors.gold} />
            </Pressable>

            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                الخلفيات المقترحة
              </Text>
            </View>
          </View>
        }
        renderItem={renderWallpaperCard}
      />

      {/* Full-Screen Preview Modal for Wallpapers */}
      <Modal
        visible={previewItem !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewItem(null)}
      >
        <View style={styles.previewModalBackdrop}>
          {previewItem && (
            <View style={[styles.previewModalContainer, { width, height }]}>
              <Image
                source={previewItem.source}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />

              {/* Close Button */}
              <SafeAreaView style={styles.previewTopBar}>
                <Pressable
                  onPress={() => setPreviewItem(null)}
                  style={styles.previewCloseBtn}
                >
                  <Feather name="x" size={24} color="#FFF" />
                </Pressable>
              </SafeAreaView>

              {/* Bottom Actions */}
              <SafeAreaView style={styles.previewBottomBar}>
                <Pressable
                  onPress={() => openEditor(previewItem)}
                  style={styles.editorActionBtn}
                >
                  <Feather name="edit-3" size={20} color="#000" />
                  <Text style={styles.editorActionBtnText}>
                    تصميم وإضافة نص قرآني
                  </Text>
                </Pressable>
              </SafeAreaView>
            </View>
          )}
        </View>
      </Modal>
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
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 18,
  },
  headerSpacer: {
    width: 40,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },

  /* Top Segment Switcher */

  /* Wallpapers Gallery */
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  listHeader: {
    marginBottom: spacing.md,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  importBanner: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  importIconCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  importTextCol: {
    flex: 1,
    gap: 2,
  },
  importTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
    textAlign: 'right',
  },
  importSubtitle: {
    fontFamily: fonts.default,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  sectionTitleRow: {
    flexDirection: 'row-reverse',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 16,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    height: '100%',
    width: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  cardTitle: {
    color: '#FFF',
    fontFamily: fonts.defaultBold,
    fontSize: 13,
    textAlign: 'center',
  },

  /* Preview Modal */
  previewModalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    flex: 1,
  },
  previewModalContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewTopBar: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  previewCloseBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  previewBottomBar: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  editorActionBtn: {
    alignItems: 'center',
    backgroundColor: '#F5D77F',
    borderRadius: radius.full,
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  editorActionBtnText: {
    color: '#1A1713',
    fontFamily: fonts.defaultBold,
    fontSize: 16,
  },

  /* Widgets Styles */
});
