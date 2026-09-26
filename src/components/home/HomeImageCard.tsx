/**
 * Home dashboard card with a photographic background (Moroccan ceiling, zellige…).
 *
 * The scrim is a light vertical gradient — just enough for the cream calligraphy
 * to read — so the ornament of the photo stays visible instead of a dark block.
 */

import { ImageBackground, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '../../theme/tokens';

// Warm brown, never pure black: darker in the middle where the text sits.
const SCRIM_COLORS = ['rgba(38, 22, 10, 0.28)', 'rgba(38, 22, 10, 0.52)', 'rgba(38, 22, 10, 0.3)'] as const;

interface Props {
  source: ImageSource | number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function HomeImageCard({ source, children, style }: Props) {
  return (
    <View style={[styles.wrapper, style]}>
      <ImageBackground source={source} style={styles.image} contentFit="cover" transition={150}>
        <LinearGradient colors={SCRIM_COLORS} style={StyleSheet.absoluteFill} />
        {children}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#3A2410',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
  },
});
