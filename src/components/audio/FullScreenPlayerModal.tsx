/**
 * Fullscreen Luxury Quran Audio Player Modal.
 *
 * Immersive audio player with golden Islamic disc visual,
 * scrubbing slider, speed control, repeat modes, and offline indicators.
 */

import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAudioStore } from '../../features/audio/audioStore';
import { useTheme } from '../../theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../../theme/tokens';
import { toArabicDigits } from '../../utils/arabicDigits';
import { IslamicEmblem } from '../ui/IslamicEmblem';
import { surahFontName } from '../../utils/surahFontName';

function formatTime(millis: number): string {
  if (!millis || isNaN(millis) || millis < 0) return '00:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function FullScreenPlayerModal() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isOpen = useAudioStore((s) => s.isFullScreenPlayerOpen);
  const setOpen = useAudioStore((s) => s.setFullScreenPlayerOpen);
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const playbackStatus = useAudioStore((s) => s.playbackStatus);
  const positionMillis = useAudioStore((s) => s.positionMillis);
  const durationMillis = useAudioStore((s) => s.durationMillis);
  const playbackRate = useAudioStore((s) => s.playbackRate);
  const repeatMode = useAudioStore((s) => s.repeatMode);

  const togglePlayPause = useAudioStore((s) => s.togglePlayPause);
  const seekTo = useAudioStore((s) => s.seekTo);
  const skipNext = useAudioStore((s) => s.skipNext);
  const skipPrev = useAudioStore((s) => s.skipPrev);
  const setPlaybackRate = useAudioStore((s) => s.setPlaybackRate);
  const setRepeatMode = useAudioStore((s) => s.setRepeatMode);

  // Rotation animation for Islamic Disc
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (playbackStatus === 'playing') {
      anim = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 20000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      anim.start();
    } else {
      rotateAnim.stopAnimation();
    }
    return () => {
      anim?.stop();
    };
  }, [playbackStatus, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progress = durationMillis > 0 ? Math.min(1, Math.max(0, positionMillis / durationMillis)) : 0;
  const isPlaying = playbackStatus === 'playing';
  const isLoading = playbackStatus === 'loading';

  const handleScrub = useCallback(
    (ratio: number) => {
      if (durationMillis > 0) {
        void seekTo(Math.floor(ratio * durationMillis));
      }
    },
    [durationMillis, seekTo],
  );

  const cycleSpeed = useCallback(() => {
    const speeds = [1.0, 1.25, 1.5, 0.75];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    void setPlaybackRate(speeds[nextIdx]);
  }, [playbackRate, setPlaybackRate]);

  const cycleRepeat = useCallback(() => {
    const modes: Array<'off' | 'one' | 'all'> = ['off', 'one', 'all'];
    const nextIdx = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIdx]);
  }, [repeatMode, setRepeatMode]);

  if (!currentTrack) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => setOpen(false)}
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : spacing.sm }]}>
            <Pressable
              onPress={() => setOpen(false)}
              hitSlop={HIT_SLOP}
              style={[styles.circleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="تصغير المشغل"
            >
              <Feather name="chevron-down" size={24} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerTitleCol}>
              <Text style={[styles.headerSub, { color: colors.textSecond }]}>مشغل التلاوات</Text>
              {currentTrack.localUri && (
                <View style={[styles.offlinePill, { backgroundColor: colors.sageSoft }]}>
                  <Feather name="download-cloud" size={12} color={colors.accent} />
                  <Text style={[styles.offlineText, { color: colors.accent }]}>محفوظ بدون إنترنت</Text>
                </View>
              )}
            </View>

            <View style={{ width: 42 }} />
          </View>

          {/* Central Animated Vinyl / Islamic Disc */}
          <View style={styles.centerStage}>
            <View style={[styles.outerGlowRing, { borderColor: colors.goldSoft }]}>
              <View style={[styles.middleRing, { borderColor: colors.gold }]}>
                <Animated.View
                  style={[
                    styles.disc,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.gold,
                      transform: [{ rotate: spin }],
                    },
                  ]}
                >
                  <IslamicEmblem size={100} color={colors.gold} fillColor={colors.surfaceSunk} />
                </Animated.View>
              </View>
            </View>

            {/* Surah Title in Calligraphy */}
            <Text style={[styles.surahTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              سورة {surahFontName(currentTrack.surahNameAr)}
            </Text>

            {/* Reciter & Moshaf Meta */}
            <Text style={[styles.reciterName, { color: colors.gold }]}>
              القارئ {currentTrack.reciterName}
            </Text>

            <Text style={[styles.moshafName, { color: colors.textSecond }]}>
              {currentTrack.moshafName}
            </Text>
          </View>

          {/* Scrubber / Progress Bar */}
          <View style={styles.scrubberSection}>
            <Pressable
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                // Estimate based on width
                const targetRatio = Math.min(1, Math.max(0, locationX / 320));
                handleScrub(targetRatio);
              }}
              style={[styles.scrubberTrack, { backgroundColor: colors.surfaceSunk }]}
            >
              <View
                style={[
                  styles.scrubberFill,
                  { backgroundColor: colors.gold, width: `${progress * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.scrubberThumb,
                  {
                    backgroundColor: colors.gold,
                    borderColor: colors.surface,
                    left: `${progress * 100}%`,
                  },
                ]}
              />
            </Pressable>

            {/* Time Labels */}
            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: colors.textSecond }]}>
                {formatTime(positionMillis)}
              </Text>
              <Text style={[styles.timeText, { color: colors.textSecond }]}>
                {formatTime(durationMillis)}
              </Text>
            </View>
          </View>

          {/* Main Controls Row */}
          <View style={styles.mainControlsRow}>
            {/* Repeat Mode */}
            <Pressable
              onPress={cycleRepeat}
              hitSlop={HIT_SLOP}
              style={[
                styles.secondaryBtn,
                repeatMode !== 'off' && { backgroundColor: colors.surfaceSunk, borderColor: colors.gold },
              ]}
              accessibilityRole="button"
              accessibilityLabel="تكرار التلاوة"
            >
              <Feather
                name={repeatMode === 'one' ? 'repeat' : 'repeat'}
                size={20}
                color={repeatMode !== 'off' ? colors.gold : colors.textMuted}
              />
              {repeatMode === 'one' && (
                <Text style={[styles.badgeTiny, { color: colors.gold }]}>1</Text>
              )}
            </Pressable>

            {/* Previous Surah */}
            <Pressable
              onPress={() => void skipPrev()}
              hitSlop={HIT_SLOP}
              style={[styles.skipBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="السورة السابقة"
            >
              <Feather name="skip-forward" size={24} color={colors.textPrimary} />
            </Pressable>

            {/* Play / Pause Giant Button */}
            <Pressable
              onPress={() => void togglePlayPause()}
              style={[styles.giantPlayBtn, { backgroundColor: colors.gold }]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#1A1713" />
              ) : (
                <Feather
                  name={isPlaying ? 'pause' : 'play'}
                  size={36}
                  color="#1A1713"
                  style={{ marginLeft: isPlaying ? 0 : 4 }}
                />
              )}
            </Pressable>

            {/* Next Surah */}
            <Pressable
              onPress={() => void skipNext()}
              hitSlop={HIT_SLOP}
              style={[styles.skipBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="السورة التالية"
            >
              <Feather name="skip-back" size={24} color={colors.textPrimary} />
            </Pressable>

            {/* Playback Speed */}
            <Pressable
              onPress={cycleSpeed}
              hitSlop={HIT_SLOP}
              style={[
                styles.secondaryBtn,
                playbackRate !== 1.0 && { backgroundColor: colors.surfaceSunk, borderColor: colors.gold },
              ]}
              accessibilityRole="button"
              accessibilityLabel="سرعة القراءة"
            >
              <Text style={[styles.speedText, { color: playbackRate !== 1.0 ? colors.gold : colors.textMuted }]}>
                {playbackRate}x
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  circleBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerTitleCol: {
    alignItems: 'center',
  },
  headerSub: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
  },
  offlinePill: {
    alignItems: 'center',
    borderRadius: radius.full,
    flexDirection: 'row-reverse',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  offlineText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 11,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  outerGlowRing: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 230,
    justifyContent: 'center',
    width: 230,
  },
  middleRing: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1.5,
    height: 200,
    justifyContent: 'center',
    width: 200,
  },
  disc: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 2,
    height: 170,
    justifyContent: 'center',
    width: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  surahTitle: {
    fontFamily: fonts.surahName,
    fontSize: 38,
    lineHeight: 46,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  reciterName: {
    fontFamily: fonts.defaultBold,
    fontSize: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  moshafName: {
    fontFamily: fonts.default,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  scrubberSection: {
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  scrubberTrack: {
    borderRadius: radius.full,
    height: 6,
    position: 'relative',
    width: '100%',
  },
  scrubberFill: {
    borderRadius: radius.full,
    height: '100%',
  },
  scrubberThumb: {
    borderRadius: radius.full,
    borderWidth: 2,
    height: 16,
    marginLeft: -8,
    marginTop: -5,
    position: 'absolute',
    top: 0,
    width: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  timeText: {
    fontFamily: fonts.defaultMedium,
    fontSize: 13,
  },
  mainControlsRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  giantPlayBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 76,
    justifyContent: 'center',
    width: 76,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  skipBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  secondaryBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
    position: 'relative',
  },
  speedText: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
  },
  badgeTiny: {
    fontSize: 10,
    fontWeight: 'bold',
    position: 'absolute',
    top: 2,
    right: 4,
  },
});
