/**
 * Adhan Audio playback manager using expo-audio.
 *
 * Plays the authentic Madinah Adhan audio (`assets/audio/adhan-madina.mp3`).
 */

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { create } from 'zustand';

let adhanPlayer: AudioPlayer | null = null;
let statusSub: { remove: () => void } | null = null;

interface AdhanAudioState {
  isPlaying: boolean;
  playAdhan: () => Promise<void>;
  stopAdhan: () => Promise<void>;
  toggleAdhan: () => Promise<void>;
}

export const useAdhanAudio = create<AdhanAudioState>((set, get) => ({
  isPlaying: false,

  playAdhan: async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: true,
      }).catch(() => {});

      if (statusSub) {
        statusSub.remove();
        statusSub = null;
      }
      if (adhanPlayer) {
        try {
          adhanPlayer.pause();
          adhanPlayer.release();
        } catch {}
        adhanPlayer = null;
      }

      const player = createAudioPlayer(require('../../../assets/audio/adhan-madina.mp3'));
      adhanPlayer = player;

      statusSub = player.addListener('playbackStatusUpdate', (status) => {
        set({ isPlaying: status.playing });
        if (status.didJustFinish) {
          set({ isPlaying: false });
        }
      });

      player.play();
      set({ isPlaying: true });
    } catch {
      set({ isPlaying: false });
    }
  },

  stopAdhan: async () => {
    if (adhanPlayer) {
      try {
        adhanPlayer.pause();
        adhanPlayer.release();
      } catch {}
      adhanPlayer = null;
    }
    if (statusSub) {
      statusSub.remove();
      statusSub = null;
    }
    set({ isPlaying: false });
  },

  toggleAdhan: async () => {
    const { isPlaying, playAdhan, stopAdhan } = get();
    if (isPlaying) {
      await stopAdhan();
    } else {
      await playAdhan();
    }
  },
}));
