/**
 * Home dashboard card with a photographic background (the mosque carpet).
 *
 * The photo is already dark, so the scrim is a light vertical gradient — just
 * enough for the cream calligraphy to read — and the carpet pattern stays visible.
 */

import { ImageBackground, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '../../theme/tokens';

// Warm brown, never pure black: a touch darker in the middle where the text sits.
const SCRIM_COLORS = ['rgba(38, 22, 10, 0.08)', 'rgba(38, 22, 10, 0.3)', 'rgba(38, 22, 10, 0.1)'] as const;

/** Text colours for content laid over the card photo (cream, never pure white). */
export const IMAGE_CARD_TEXT = {
  primary: '#FFF4E2',
  muted: '#F1E3C4',
  gold: '#FCE38A',
} as const;

/** Soft shadow that keeps light text legible over the photo. */
export const imageCardTextShadow = {
  textShadowColor: 'rgba(30, 16, 6, 0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
} as const;

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
