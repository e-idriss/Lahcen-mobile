/**
 * Home quick-link tile: tinted icon chip + label + chevron, RTL.
 */

import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { fonts, radius } from '../../theme/tokens';

interface Props {
  label: string;
  accessibilityLabel: string;
  icon: ReactNode;
  /** Soft tint behind the icon. */
  chipColor: string;
  onPress: () => void;
}

export function QuickLinkTile({ label, accessibilityLabel, icon, chipColor, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.goldSoft,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.content}>
        <View style={[styles.iconChip, { backgroundColor: chipColor }]}>{icon}</View>
        <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Feather name="chevron-left" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1.2,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 10,
  },
  iconChip: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  label: {
    flexShrink: 1,
    fontFamily: fonts.defaultBold,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
