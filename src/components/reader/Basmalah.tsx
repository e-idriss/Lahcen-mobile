/**
 * The standalone Basmalah shown at the head of a surah.
 *
 * Rendered as a centred, unnumbered header — never as an ayah. The text comes
 * from the database (split off ayah 1 at build time), never from a literal.
 */

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { arabicTextStyle, spacing } from '../../theme/tokens';

interface Props {
  text: string;
  fontSize: number;
}

function BasmalahComponent({ text, fontSize }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          arabicTextStyle(Math.max(18, Math.round(fontSize * 0.92))),
          styles.text,
          { color: colors.gold },
        ]}
        accessibilityLanguage="ar"
        allowFontScaling={false}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.sm,
    paddingTop: 2,
  },
  text: {
    textAlign: 'center',
  },
});

export const Basmalah = memo(BasmalahComponent);
