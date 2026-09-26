/**
 * 8-point Islamic Star / Rub-el-Hizb geometric emblem.
 *
 * Rendered using precision view transformations (two overlapping 45-deg squares
 * with concentric rings), creating a stunning illuminated manuscript insignia
 * without requiring external SVG dependencies.
 */

import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BRAND_PRIMARY } from '../../theme/tokens';

interface Props {
  size?: number;
  color?: string;
  fillColor?: string;
  innerBorderColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

function IslamicEmblemComponent({
  size = 40,
  color = BRAND_PRIMARY,
  fillColor = 'transparent',
  innerBorderColor,
  style,
  children,
}: Props) {
  const squareSize = size * 0.76;
  const innerCircleSize = size * 0.58;
  const borderWidth = Math.max(1, Math.round(size * 0.035));

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      {/* Base Square 1 (0 deg) */}
      <View
        style={[
          styles.square,
          {
            width: squareSize,
            height: squareSize,
            borderColor: color,
            borderWidth,
            backgroundColor: fillColor,
            borderRadius: Math.max(2, size * 0.05),
          },
        ]}
      />

      {/* Base Square 2 (45 deg) */}
      <View
        style={[
          styles.square,
          {
            width: squareSize,
            height: squareSize,
            borderColor: color,
            borderWidth,
            backgroundColor: fillColor,
            borderRadius: Math.max(2, size * 0.05),
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />

      {/* Inner Concentric Circle Accent */}
      <View
        style={[
          styles.innerCircle,
          {
            width: innerCircleSize,
            height: innerCircleSize,
            borderColor: innerBorderColor ?? color,
            borderWidth: Math.max(0.75, borderWidth * 0.75),
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  square: {
    position: 'absolute',
  },
  innerCircle: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    position: 'absolute',
  },
});

export const IslamicEmblem = memo(IslamicEmblemComponent);
