/**
 * Prayer Times & Location settings store.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { reschedulePrayerNotifications } from './prayerNotifications';
import { CITY_PRESETS } from './prayerService';
import type { CalculationMethodName } from './types';

interface PrayerState {
  latitude: number;
  longitude: number;
  cityName: string;
  isAutoLocation: boolean;
  calculationMethod: CalculationMethodName;
  isHanafi: boolean;
  adhanAudioEnabled: boolean;
  locationLoading: boolean;

  setLocation: (lat: number, lng: number, cityName: string, isAuto?: boolean) => void;
  setCalculationMethod: (method: CalculationMethodName) => void;
  setIsHanafi: (isHanafi: boolean) => void;
  setAdhanAudioEnabled: (enabled: boolean) => void;
  refreshGpsLocation: () => Promise<boolean>;
  /** Re-arms the rolling window of scheduled adhan notifications from current settings. */
  syncPrayerNotifications: () => Promise<void>;
}

export const usePrayerStore = create<PrayerState>()(
  persist(
    (set, get) => ({
      latitude: CITY_PRESETS[0].lat,
      longitude: CITY_PRESETS[0].lng,
      cityName: CITY_PRESETS[0].nameAr,
      isAutoLocation: true,
      calculationMethod: 'UmmAlQura',
      isHanafi: false,
      adhanAudioEnabled: true,
      locationLoading: false,

      setLocation: (latitude, longitude, cityName, isAuto = false) => {
        set({ latitude, longitude, cityName, isAutoLocation: isAuto });
        void get().syncPrayerNotifications();
      },

      setCalculationMethod: (calculationMethod) => {
        set({ calculationMethod });
        void get().syncPrayerNotifications();
      },

      setIsHanafi: (isHanafi) => {
        set({ isHanafi });
        void get().syncPrayerNotifications();
      },

      setAdhanAudioEnabled: (adhanAudioEnabled) => {
        set({ adhanAudioEnabled });
        void get().syncPrayerNotifications();
      },

      syncPrayerNotifications: async () => {
        const { adhanAudioEnabled, latitude, longitude, calculationMethod, isHanafi } = get();
        await reschedulePrayerNotifications({
          enabled: adhanAudioEnabled,
          latitude,
          longitude,
          calculationMethod,
          isHanafi,
        });
      },

      refreshGpsLocation: async () => {
        try {
          set({ locationLoading: true });
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            set({ locationLoading: false });
            return false;
          }

          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          const { latitude, longitude } = location.coords;
          let cityName = 'موقعي الحالي';

          try {
            const [geocode] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geocode) {
              cityName = geocode.city || geocode.subregion || geocode.region || geocode.country || 'موقعي الحالي';
            }
          } catch {}

          set({
            latitude,
            longitude,
            cityName,
            isAutoLocation: true,
            locationLoading: false,
          });
          void get().syncPrayerNotifications();
          return true;
        } catch {
          set({ locationLoading: false });
          return false;
        }
      },
    }),
    {
      name: 'quran-prayer-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
