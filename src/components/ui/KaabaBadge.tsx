/**
 * 3D Isometric Kaaba Badge Component (`src/components/ui/KaabaBadge.tsx`).
 *
 * Renders `assets/images/kaaba-3d.svg` with native white contour outline,
 * transparent background, and zero shadow.
 */

import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  size?: number;
  isAligned?: boolean;
}

function KaabaBadgeComponent({ size = 48, isAligned = false }: Props) {
  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          transform: [{ scale: isAligned ? 1.15 : 1 }],
        },
      ]}
    >
      <Image
        source={require('../../../assets/images/kaaba-3d.svg')}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const KaabaBadge = memo(KaabaBadgeComponent);
