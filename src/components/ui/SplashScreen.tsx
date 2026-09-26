/**
 * Animated Splash Screen.
 *
 * Minimalist, elegant entrance experience featuring:
 * - Authentic paper background (#FFEED6)
 * - Pure Lahcen calligraphy SVG emblem in the center
 * - Traditional brown Arabesque corner decorations (decor.svg) in all 4 corners
 * - NO text / labels
 */

import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { DecorCorner } from './DecorCorner';
import { LahcenLogo } from './LahcenLogo';

interface Props {
  isReady: boolean;
  onAnimationFinish: () => void;
}

export function AnimatedSplashScreen({ isReady, onAnimationFinish }: Props) {
  const { colors } = useTheme();

  // Animation values using standard Animated API with native driver
  const emblemScale = useRef(new Animated.Value(0.85)).current;
  const emblemOpacity = useRef(new Animated.Value(0)).current;
  const decorOpacity = useRef(new Animated.Value(0)).current;
  const splashExitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Parallel entrance animations
    Animated.parallel([
      Animated.timing(emblemOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(emblemScale, {
        toValue: 1,
        friction: 7,
        tension: 35,
        useNativeDriver: true,
      }),
      Animated.timing(decorOpacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [emblemOpacity, emblemScale, decorOpacity]);

  // When assets & database are ready, trigger graceful fade-out
  useEffect(() => {
    if (isReady) {
      const exitTimer = setTimeout(() => {
        Animated.timing(splashExitOpacity, {
          toValue: 0,
          duration: 450,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            onAnimationFinish();
          }
        });
      }, 700);

      return () => clearTimeout(exitTimer);
    }
  }, [isReady, onAnimationFinish, splashExitOpacity]);

  const cornerColor = '#8d6443';

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: colors.bg, opacity: splashExitOpacity },
      ]}
      pointerEvents={isReady ? 'none' : 'auto'}
    >
      {/* Top Left Corner Decor */}
      <Animated.View style={[styles.cornerTopLeft, { opacity: decorOpacity }]}>
        <DecorCorner width={130} height={65} color={cornerColor} />
      </Animated.View>

      {/* Top Right Corner Decor */}
      <Animated.View style={[styles.cornerTopRight, { opacity: decorOpacity }]}>
        <DecorCorner width={130} height={65} color={cornerColor} />
      </Animated.View>

      {/* Bottom Left Corner Decor */}
      <Animated.View style={[styles.cornerBottomLeft, { opacity: decorOpacity }]}>
        <DecorCorner width={130} height={65} color={cornerColor} />
      </Animated.View>

      {/* Bottom Right Corner Decor */}
      <Animated.View style={[styles.cornerBottomRight, { opacity: decorOpacity }]}>
        <DecorCorner width={130} height={65} color={cornerColor} />
      </Animated.View>

      {/* Central Pure Lahcen Emblem */}
      <Animated.View
        style={[
          styles.centerEmblem,
          {
            opacity: emblemOpacity,
            transform: [{ scale: emblemScale }],
          },
        ]}
      >
        <LahcenLogo width={220} height={180} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    transform: [{ scaleX: -1 }],
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    transform: [{ scaleY: -1 }],
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    transform: [{ scaleX: -1 }, { scaleY: -1 }],
  },
  centerEmblem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
