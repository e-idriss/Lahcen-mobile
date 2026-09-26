/**
 * Root layout. Blocks the UI behind the splash screen until the Quran fonts are
 * loaded — a flash of fallback system Arabic misrenders diacritics badly.
 */

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { AnimatedSplashScreen } from '../src/components/ui/SplashScreen';
import { FullScreenPlayerModal } from '../src/components/audio/FullScreenPlayerModal';
import { MiniAudioPlayer } from '../src/components/audio/MiniAudioPlayer';
import { usePrayerStore } from '../src/features/prayer/prayerStore';
import { registerWidgets, startWidgetSync, syncWidgets } from '../src/features/widgets';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

// Wire the headless Android widget task handler before React renders.
registerWidgets();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Elgharib: require('../assets/fonts/Elgharib-HAFSTharwatEmara.otf'),
    'Elgharib-HAFSTharwatEmara': require('../assets/fonts/Elgharib-HAFSTharwatEmara.otf'),
    'Elgharib- HAFS Tharwat Emara': require('../assets/fonts/Elgharib-HAFSTharwatEmara.otf'),
    Almaghribi: require('../assets/fonts/Almaghribi Warsh-Quran.otf'),
    'AlmaghribiWarsh-Quran': require('../assets/fonts/Almaghribi Warsh-Quran.otf'),
    'Almaghribi Warsh Quran': require('../assets/fonts/Almaghribi Warsh-Quran.otf'),
    WarshUthmanic: require('../assets/fonts/uthmanic_warsh_v21.ttf'),
    'KFGQPC_WARSH_Uthmanic_Script_H': require('../assets/fonts/KFGQPC_Warsh.ttf'),
    QurraanSora: require('../assets/fonts/arbfonts_Qurraan_sora.otf'),
    ElgharibHijriMonths: require('../assets/fonts/Elgharib-AYB-Hijri Months.ttf'),
    ElgharibDaysOfWeek: require('../assets/fonts/Elgharib-Days Of Week.ttf'),
    ElgharibPrayers: require('../assets/fonts/Elgharib-Omar_5.Prayers.ttf'),
    ThmanyahRegular: require('../assets/fonts/thmanyahserifdisplay-Regular.otf'),
    ThmanyahMedium: require('../assets/fonts/thmanyahserifdisplay-Medium.otf'),
    ThmanyahBold: require('../assets/fonts/thmanyahserifdisplay-Bold.otf'),
    ThmanyahLight: require('../assets/fonts/thmanyahserifdisplay-Light.otf'),
  });

  const [splashFinished, setSplashFinished] = useState(false);

  const onReady = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    void onReady();
  }, [onReady]);

  // On launch: re-arm scheduled adhan notifications and refresh home-screen widgets.
  useEffect(() => {
    void usePrayerStore.getState().syncPrayerNotifications();
    startWidgetSync();
    void syncWidgets();
  }, []);

  // Hold the splash until fonts are ready so scripture never renders in a fallback font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ThemeProvider>
            <View style={styles.root}>
              <ThemedStack />
              <MiniAudioPlayer />
              <FullScreenPlayerModal />
              {!splashFinished && (
                <AnimatedSplashScreen
                  isReady={Boolean(fontsLoaded || fontError)}
                  onAnimationFinish={() => setSplashFinished(true)}
                />
              )}
            </View>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function ThemedStack() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="surahs" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="search" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="prayer-times" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="qibla" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="audio" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="reciter-surahs" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="azkar" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="azkar-category" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="qasidas" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="qasida" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="wallpapers" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="wallpaper-editor" options={{ presentation: 'card', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="widgets" options={{ presentation: 'card', animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
