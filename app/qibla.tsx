/**
 * Real-time Qibla Compass Screen (`app/qibla.tsx`).
 *
 * Exact Mawaqit-style Minimalist Design:
 * - Full-bleed immersion with top circular Arabesque watermark fading radially into page background.
 * - Prominent Dual-Ring Compass:
 *   • Outer Soft Halo Ring (translucent pastel / lavender / sage).
 *   • Inner Pure White Floating Disc with radial dash ticks & rotated cardinal letters.
 *   • 3D Isometric Kaaba Badge perched on the outer perimeter at the Qibla angle.
 *   • Center Modern Triangular Needle pointing UP with subtle shadow tail.
 * - Minimal Top Location Header (`حاليًا يقع في` / `[City], [Country] 📍`).
 * - Floating Minimalist Status & Distance Pill.
 * - Haptic pulse & golden glow when aligned.
 */

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Magnetometer } from 'expo-sensors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { KaabaBadge } from '../src/components/ui/KaabaBadge';
import { usePrayerStore } from '../src/features/prayer/prayerStore';
import {
  calculateCompassHeading,
  calculateDistanceToKaaba,
  calculateQiblaDirection,
} from '../src/features/prayer/qiblaService';
import { useTheme } from '../src/theme/ThemeProvider';
import { HIT_SLOP, fonts, radius, spacing } from '../src/theme/tokens';
import { withAlpha } from '../src/utils/color';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COMPASS_OUTER_SIZE = Math.min(SCREEN_WIDTH - 56, 310);
const COMPASS_INNER_SIZE = COMPASS_OUTER_SIZE - 28;
const INNER_RADIUS = COMPASS_INNER_SIZE / 2;

// 36 tick marks around the dial (every 10 degrees)
const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);

export default function QiblaScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const lat = usePrayerStore((s) => s.latitude);
  const lng = usePrayerStore((s) => s.longitude);
  const cityName = usePrayerStore((s) => s.cityName);

  // Bearing from North to Kaaba (0..360)
  const qiblaBearing = useMemo(() => calculateQiblaDirection(lat, lng), [lat, lng]);
  const distanceKm = useMemo(() => calculateDistanceToKaaba(lat, lng), [lat, lng]);

  const [heading, setHeading] = useState(0);
  const [isSensorAvailable, setIsSensorAvailable] = useState(true);

  // Continuous anti-flip rotation animation for the dial
  const animatedDialAngle = useRef(new Animated.Value(0)).current;
  const cumulativeDialAngleRef = useRef(0);
  const lastHeadingRef = useRef(0);
  const hasVibratedRef = useRef(false);

  useEffect(() => {
    let magSub: { remove: () => void } | null = null;
    let headingSub: Location.LocationSubscription | null = null;
    let cancelled = false;

    /**
     * `expo-location`'s heading is fused from the magnetometer + accelerometer
     * and, crucially, corrected for magnetic declination — it reports
     * `trueHeading` (degrees from geographic north), which is what the Qibla
     * bearing is measured against. The raw magnetometer is off by the local
     * declination (up to ~20° in parts of Europe and North America), so it is
     * only a fallback for devices that cannot produce a true heading.
     */
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => {
        if (cancelled || status !== 'granted') throw new Error('no-permission');
        return Location.watchHeadingAsync((h) => {
          if (cancelled) return;
          const trueHeading = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          setIsSensorAvailable(h.accuracy >= 0);
          applyHeading(trueHeading);
        });
      })
      .then((sub) => {
        if (cancelled) {
          sub?.remove();
          return;
        }
        headingSub = sub;
      })
      .catch(() => {
        if (cancelled) return;
        startMagnetometerFallback();
      });

    function startMagnetometerFallback() {
      Magnetometer.isAvailableAsync().then((available) => {
        if (cancelled) return;
        setIsSensorAvailable(available);
        if (!available) return;
        Magnetometer.setUpdateInterval(40);
        magSub = Magnetometer.addListener((data) => {
          applyHeading(calculateCompassHeading(data.x, data.y));
        });
      });
    }

    function applyHeading(rawHeading: number) {
        // Low-pass filter for smooth response
        let diff = rawHeading - lastHeadingRef.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        const smoothed = lastHeadingRef.current + diff * 0.28;
        lastHeadingRef.current = smoothed;
        const normalized = (smoothed + 360) % 360;
        setHeading(Math.round(normalized));

        // Dial rotates in reverse (-heading) so North matches physical North
        const targetDialAngle = -normalized;
        let angleDelta = targetDialAngle - cumulativeDialAngleRef.current;
        while (angleDelta > 180) angleDelta -= 360;
        while (angleDelta < -180) angleDelta += 360;
        cumulativeDialAngleRef.current += angleDelta;

        // Check alignment with Kaaba (within +/- 3.5 degrees)
        const relativeQiblaAngle = Math.abs(((normalized - qiblaBearing + 540) % 360) - 180);
        const isAligned = relativeQiblaAngle <= 3.5;

        if (isAligned) {
          if (!hasVibratedRef.current) {
            hasVibratedRef.current = true;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
        } else {
          hasVibratedRef.current = false;
        }

        Animated.timing(animatedDialAngle, {
          toValue: cumulativeDialAngleRef.current,
          duration: 40,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
    }

    return () => {
      cancelled = true;
      magSub?.remove();
      headingSub?.remove();
    };
  }, [qiblaBearing, animatedDialAngle]);

  const relativeQiblaAngle = Math.abs(((heading - qiblaBearing + 540) % 360) - 180);
  const isAligned = relativeQiblaAngle <= 3.5;

  const dialRotationInterpolation = animatedDialAngle.interpolate({
    inputRange: [-36000, 36000],
    outputRange: ['-36000deg', '36000deg'],
  });

  /**
   * Fade stops derived from the SAME token the screen is painted with.
   *
   * These were previously hardcoded (`rgba(247, 243, 235, …)`) while the page
   * background came from `colors.bg` (`#FFEED6`). The gradient therefore faded
   * to a colour the page never used, leaving a visible seam where the two met.
   * Deriving the stops guarantees the last one matches the backdrop exactly,
   * in every theme.
   */
  const fadeStops = useMemo(() => {
    // Ease-in alphas: slow at the top, accelerating into the solid background,
    // so the transition reads as a dissolve rather than a band.
    const at = (alpha: number) => withAlpha(colors.bg, alpha);
    return [at(0), at(0.08), at(0.25), at(0.5), at(0.75), at(0.92), at(1), at(1)] as const;
  }, [colors.bg]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Background Calligraphy Watermark with Silk-Smooth Radial & Linear Dissolve */}
      <View style={styles.topCalligraphyDome} pointerEvents="none">
        <Image
          source={require('../assets/images/bg1.svg')}
          style={[
            styles.domeImage,
            {
              tintColor: isDark ? colors.gold : colors.accent,
              opacity: isDark ? 0.32 : 0.20,
            },
          ]}
          contentFit="cover"
        />
        {/* Progressive dissolve into the page background — same token, no seam. */}
        <LinearGradient
          colors={fadeStops}
          locations={[0, 0.22, 0.42, 0.58, 0.72, 0.84, 0.94, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Top Floating Back Button (RTL) */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={HIT_SLOP}
            style={[
              styles.backButton,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="العودة"
          >
            <Feather name="chevron-right" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Location Info Header (Exact Mawaqit typography & alignment) */}
        <View style={styles.locationContainer}>
          <Text style={[styles.locationSubtitle, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : colors.textSecond }]}>
            حاليًا يقع في
          </Text>
          <View style={styles.locationTitleRow}>
            <Text style={[styles.locationTitle, { color: colors.textPrimary }]}>
              {cityName || 'موقعك الحالي'}
            </Text>
            <Feather name="map-pin" size={17} color={colors.terracotta} style={styles.pinIcon} />
          </View>
        </View>

        {/* Center Compass Hero Stage */}
        <View style={styles.compassContainer}>
          {/* Alignment Glowing Outer Halo Pulse */}
          {isAligned && (
            <View
              style={[
                styles.glowAura,
                {
                  width: COMPASS_OUTER_SIZE + 20,
                  height: COMPASS_OUTER_SIZE + 20,
                  borderRadius: (COMPASS_OUTER_SIZE + 20) / 2,
                  borderColor: colors.gold,
                  backgroundColor: isDark ? 'rgba(214, 180, 111, 0.15)' : 'rgba(165, 175, 121, 0.22)',
                },
              ]}
            />
          )}

          {/* Outer Soft Halo Ring (Lavender/Sage in light, Dark charcoal in dark) */}
          <View
            style={[
              styles.outerHaloRing,
              {
                width: COMPASS_OUTER_SIZE,
                height: COMPASS_OUTER_SIZE,
                borderRadius: COMPASS_OUTER_SIZE / 2,
                backgroundColor: isDark
                  ? '#1E1B18'
                  : 'rgba(235, 230, 220, 0.7)',
                borderColor: isAligned ? colors.gold : isDark ? '#332E29' : '#E8E1D3',
              },
            ]}
          >
            {/* Inner Rotating White Disc */}
            <Animated.View
              style={[
                styles.innerRotatingDisc,
                {
                  width: COMPASS_INNER_SIZE,
                  height: COMPASS_INNER_SIZE,
                  borderRadius: INNER_RADIUS,
                  backgroundColor: isDark ? '#26231F' : '#FFFFFF',
                  borderColor: isDark ? '#3D3833' : '#F0EBE0',
                  transform: [{ rotate: dialRotationInterpolation }],
                },
              ]}
            >
              {/* 360° Perimeter Dash Ticks */}
              {TICKS.map((deg) => {
                const isCardinal = deg % 90 === 0;
                const isMedium = deg % 30 === 0;
                return (
                  <View
                    key={deg}
                    style={[
                      styles.tickAnchor,
                      {
                        width: COMPASS_INNER_SIZE,
                        height: COMPASS_INNER_SIZE,
                        transform: [{ rotate: `${deg}deg` }],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.tickDash,
                        isCardinal
                          ? styles.tickCardinal
                          : isMedium
                          ? styles.tickMedium
                          : styles.tickSmall,
                        {
                          backgroundColor: isCardinal
                            ? isDark
                              ? colors.gold
                              : '#8C6718'
                            : isDark
                            ? '#665D54'
                            : '#C8C0B2',
                        },
                      ]}
                    />
                  </View>
                );
              })}

              {/* Cardinal Directions (N, E, S, W) inside the dial */}
              <View style={styles.cardinalNorth}>
                <Text style={[styles.cardinalText, { color: colors.terracotta }]}>N</Text>
              </View>
              <View style={styles.cardinalEast}>
                <Text style={[styles.cardinalText, { color: isDark ? '#A89E92' : '#6A6358' }]}>E</Text>
              </View>
              <View style={styles.cardinalSouth}>
                <Text style={[styles.cardinalText, { color: isDark ? '#A89E92' : '#6A6358' }]}>S</Text>
              </View>
              <View style={styles.cardinalWest}>
                <Text style={[styles.cardinalText, { color: isDark ? '#A89E92' : '#6A6358' }]}>W</Text>
              </View>

              {/* 3D Isometric Kaaba Badge at Qibla Bearing */}
              <View
                style={[
                  styles.kaabaAnchor,
                  {
                    width: COMPASS_INNER_SIZE,
                    height: COMPASS_INNER_SIZE,
                    transform: [{ rotate: `${qiblaBearing}deg` }],
                  },
                ]}
              >
                <View style={styles.kaabaBadgeWrapper}>
                  <KaabaBadge size={46} isAligned={isAligned} />
                </View>
              </View>
            </Animated.View>

            {/* Fixed Central Precision Needle (Points forward / UP) */}
            <View style={styles.needleOverlay} pointerEvents="none">
              {/* Top Forward Pointer Triangle */}
              <View
                style={[
                  styles.needleTopPointer,
                  {
                    borderBottomColor: isAligned
                      ? colors.gold
                      : isDark
                      ? colors.accent
                      : '#3F4D33',
                  },
                ]}
              />

              {/* Bottom Shadow Pointer Triangle */}
              <View
                style={[
                  styles.needleBottomPointer,
                  {
                    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              />

              {/* Center Pivot Point */}
              <View
                style={[
                  styles.centerPivotHub,
                  {
                    backgroundColor: isDark ? '#26231F' : '#FFFFFF',
                    borderColor: isAligned ? colors.gold : isDark ? '#665D54' : '#B0A898',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Minimalist Floating Status & Info Pill */}
        <View style={styles.bottomSection}>
          <View
            style={[
              styles.floatingStatusPill,
              {
                backgroundColor: isAligned
                  ? isDark
                    ? 'rgba(214, 180, 111, 0.18)'
                    : colors.sageSoft
                  : isDark
                  ? '#1F1C19'
                  : colors.surface,
                borderColor: isAligned ? colors.gold : colors.border,
              },
            ]}
          >
            <Feather
              name={isAligned ? 'check-circle' : 'navigation'}
              size={18}
              color={isAligned ? colors.gold : colors.accent}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: isAligned ? (isDark ? colors.gold : colors.accent) : colors.textPrimary,
                  fontFamily: isAligned ? fonts.defaultBold : fonts.defaultMedium,
                },
              ]}
            >
              {isAligned
                ? 'أنت باتجاه القبلة المشرفة تماماً'
                : `زاوية القبلة: ${Math.round(qiblaBearing)}° · ${distanceKm.toLocaleString()} كم إلى مكة`}
            </Text>
          </View>

          {!isSensorAvailable && (
            <Text style={[styles.sensorNotice, { color: colors.terracotta }]}>
              حساس البوصلة غير متوفر على هذا الجهاز
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topCalligraphyDome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
    overflow: 'hidden',
  },
  domeImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginTop: -spacing.sm,
  },
  locationSubtitle: {
    fontFamily: fonts.defaultMedium,
    fontSize: 14,
    marginBottom: 3,
    textAlign: 'center',
  },
  locationTitleRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 6,
  },
  locationTitle: {
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  pinIcon: {
    marginTop: 1,
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.md,
  },
  glowAura: {
    position: 'absolute',
    borderWidth: 2,
  },
  outerHaloRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  innerRotatingDisc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  tickAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tickDash: {
    borderRadius: 1,
    marginTop: 8,
  },
  tickCardinal: {
    width: 2.2,
    height: 10,
  },
  tickMedium: {
    width: 1.6,
    height: 7,
  },
  tickSmall: {
    width: 1.2,
    height: 4,
  },
  cardinalNorth: {
    position: 'absolute',
    top: 22,
    alignSelf: 'center',
  },
  cardinalEast: {
    position: 'absolute',
    right: 22,
    alignSelf: 'center',
  },
  cardinalSouth: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
  },
  cardinalWest: {
    position: 'absolute',
    left: 22,
    alignSelf: 'center',
  },
  cardinalText: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
  },
  kaabaAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  kaabaBadgeWrapper: {
    marginTop: -33, // Positioned slightly higher on the outer rim
  },
  needleOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    width: COMPASS_INNER_SIZE,
    height: COMPASS_INNER_SIZE,
  },
  needleTopPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: INNER_RADIUS * 0.54,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -4,
  },
  needleBottomPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: INNER_RADIUS * 0.38,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -4,
  },
  centerPivotHub: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  floatingStatusPill: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
  },
  sensorNotice: {
    fontFamily: fonts.default,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
