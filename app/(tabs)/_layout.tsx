/**
 * Bottom tab bar: Home, Quran (the mushaf reader), Settings.
 *
 * The app still launches into this tab group at the root `_layout.tsx`, but
 * the default tab is deliberately Home rather than Quran — an explicit,
 * user-confirmed exception to the "opens on the Quran" rule in CLAUDE.md.
 */

import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { type ComponentProps } from 'react';
import { type ColorValue } from 'react-native';

import { useTheme } from '../../src/theme/ThemeProvider';

type FeatherName = ComponentProps<typeof Feather>['name'];

function TabIcon({ name, color }: { name: FeatherName; color: ColorValue }) {
  return <Feather name={name} size={26} color={color as string} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          tabBarAccessibilityLabel: 'الرئيسية',
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: 'القرآن',
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color }) => <TabIcon name="book-open" color={color} />,
          tabBarAccessibilityLabel: 'قراءة القرآن',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
          tabBarAccessibilityLabel: 'الإعدادات',
        }}
      />
    </Tabs>
  );
}
