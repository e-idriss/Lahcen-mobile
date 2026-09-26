/**
 * Theme context. Resolves the user's preference against the OS colour scheme
 * and exposes the active palette plus the tokens every component needs.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '../store/settings';
import {
  palette,
  radius,
  spacing,
  type Colors,
  type ThemeName,
  type as typeScale,
} from './tokens';

interface ThemeValue {
  colors: Colors;
  name: ThemeName;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof typeScale;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useSettings((s) => s.themePreference);

  const value = useMemo<ThemeValue>(() => {
    const name: ThemeName =
      preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

    return {
      name,
      colors: palette[name],
      isDark: name === 'dark',
      spacing,
      radius,
      type: typeScale,
    };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return value;
}
