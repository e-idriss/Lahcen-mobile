/**
 * Floating Mini Audio Player.
 *
 * Appears at the bottom of the screen when Quran audio is active,
 * allowing instant play/pause, progress tracking, and expanding the full player.
 */

import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAudioStore } from '../../features/audio/audioStore';
import { useTheme } from '../../theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../../theme/tokens';
import { IslamicEmblem } from '../ui/IslamicEmblem';
import { surahFontName } from '../../utils/surahFontName';

export function MiniAudioPlayer() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const currentTrack = useAudioStore((s) => s.currentTrack);
  const playbackStatus = useAudioStore((s) => s.playbackStatus);
  const positionMillis = useAudioStore((s) => s.positionMillis);
  const durationMillis = useAudioStore((s) => s.durationMillis);
  const togglePlayPause = useAudioStore((s) => s.togglePlayPause);
  const setFullScreenPlayerOpen = useAudioStore((s) => s.setFullScreenPlayerOpen);
  const stop = useAudioStore((s) => s.stop);

  if (!currentTrack || playbackStatus === 'idle') {
    return null;
  }

  const progress = durationMillis > 0 ? Math.min(1, positionMillis / durationMillis) : 0;
  const isPlaying = playbackStatus === 'playing';
  const isLoading = playbackStatus === 'loading';

  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom: insets.bottom + 56, // Above bottom tab bar
        },
      ]}
    >
      <Pressable
        onPress={() => setFullScreenPlayerOpen(true)}
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.gold,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`مشغل الصوت، سورة ${currentTrack.surahNameAr}`}
      >
        {/* Top Progress Bar */}
        <View style={[styles.progressBarBackground, { backgroundColor: colors.surfaceSunk }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.gold,
                width: `${progress * 100}%`,
              },
            ]}
          />
        </View>

        <View style={styles.contentRow}>
          {/* Right in RTL: Emblem Icon */}
          <View style={[styles.emblemCircle, { backgroundColor: colors.surfaceSunk }]}>
            <IslamicEmblem size={24} color={colors.gold} fillColor={colors.surface} />
          </View>

          {/* Center in RTL: Surah & Reciter Info */}
          <View style={styles.infoCol}>
            <Text style={[styles.surahTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              سورة {surahFontName(currentTrack.surahNameAr)}
            </Text>
            <Text style={[styles.reciterName, { color: colors.textSecond }]} numberOfLines={1}>
              القارئ {currentTrack.reciterName}
            </Text>
          </View>

          {/* Left in RTL: Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                void togglePlayPause();
              }}
              hitSlop={HIT_SLOP}
              style={[styles.playBtn, { backgroundColor: colors.gold }]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#1A1713" />
              ) : (
                <Feather
                  name={isPlaying ? 'pause' : 'play'}
                  size={18}
                  color="#1A1713"
                  style={{ marginLeft: isPlaying ? 0 : 2 }}
                />
              )}
            </Pressable>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                void stop();
              }}
              hitSlop={HIT_SLOP}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="إغلاق المشغل"
            >
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    left: spacing.base,
    position: 'absolute',
    right: spacing.base,
    zIndex: 999,
  },
  container: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  progressBarBackground: {
    height: 3,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  contentRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emblemCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  infoCol: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: spacing.md,
  },
  surahTitle: {
    fontFamily: fonts.surahName,
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'right',
  },
  reciterName: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginTop: 1,
    textAlign: 'right',
  },
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.sm,
  },
  playBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  closeBtn: {
    padding: spacing.xs,
  },
});
