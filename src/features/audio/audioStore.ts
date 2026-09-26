/**
 * Zustand Audio Store for Quran recitation playback with modern expo-audio.
 *
 * Supports streaming, offline local playback, scrubbing, playlist auto-advance,
 * playback rate, and background audio configuration.
 */

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { create } from 'zustand';

import { isSurahDownloaded, getLocalAudioUri } from './downloadManager';
import type { AudioTrack, PlaybackStatus } from './types';

let playerInstance: AudioPlayer | null = null;
let statusSubscription: { remove: () => void } | null = null;

interface AudioState {
  currentTrack: AudioTrack | null;
  playbackStatus: PlaybackStatus;
  positionMillis: number;
  durationMillis: number;
  playbackRate: number;
  repeatMode: 'off' | 'one' | 'all';
  isFullScreenPlayerOpen: boolean;
  playlist: AudioTrack[];
  playlistIndex: number;

  playTrack: (track: AudioTrack, playlist?: AudioTrack[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seekTo: (positionMillis: number) => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrev: () => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  setRepeatMode: (mode: 'off' | 'one' | 'all') => void;
  setFullScreenPlayerOpen: (open: boolean) => void;
  stop: () => Promise<void>;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentTrack: null,
  playbackStatus: 'idle',
  positionMillis: 0,
  durationMillis: 0,
  playbackRate: 1.0,
  repeatMode: 'off',
  isFullScreenPlayerOpen: false,
  playlist: [],
  playlistIndex: 0,

  playTrack: async (track, playlist) => {
    try {
      set({ playbackStatus: 'loading', currentTrack: track });

      if (playlist) {
        const idx = playlist.findIndex((t) => t.surahNumber === track.surahNumber);
        set({ playlist, playlistIndex: idx >= 0 ? idx : 0 });
      }

      // Configure background audio mode
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: true,
      }).catch(() => {});

      // Clean up previous player
      if (statusSubscription) {
        statusSubscription.remove();
        statusSubscription = null;
      }
      if (playerInstance) {
        try {
          playerInstance.pause();
          playerInstance.release();
        } catch {}
        playerInstance = null;
      }

      // Check if file is downloaded locally
      const isDownloaded = await isSurahDownloaded(track.reciterId, track.surahNumber);
      const audioSourceUri = isDownloaded
        ? getLocalAudioUri(track.reciterId, track.surahNumber)
        : track.audioUrl;

      const player = createAudioPlayer({ uri: audioSourceUri }, { updateInterval: 250 });
      playerInstance = player;

      statusSubscription = player.addListener('playbackStatusUpdate', (status) => {
        const isPlaying = status.playing;
        const currentSeconds = status.currentTime || 0;
        const durationSeconds = status.duration || 0;

        set({
          positionMillis: Math.floor(currentSeconds * 1000),
          durationMillis: Math.floor(durationSeconds * 1000),
          playbackStatus: isPlaying ? 'playing' : status.isBuffering ? 'loading' : 'paused',
        });

        if (status.didJustFinish) {
          const state = get();
          if (state.repeatMode === 'one') {
            void player.seekTo(0);
            player.play();
          } else {
            void state.skipNext();
          }
        }
      });

      player.playbackRate = get().playbackRate;
      player.play();

      set({
        playbackStatus: 'playing',
        currentTrack: { ...track, localUri: isDownloaded ? audioSourceUri : undefined },
      });
    } catch {
      set({ playbackStatus: 'error' });
    }
  },

  togglePlayPause: async () => {
    if (!playerInstance) return;
    if (playerInstance.playing) {
      playerInstance.pause();
      set({ playbackStatus: 'paused' });
    } else {
      playerInstance.play();
      set({ playbackStatus: 'playing' });
    }
  },

  pause: async () => {
    if (!playerInstance) return;
    playerInstance.pause();
    set({ playbackStatus: 'paused' });
  },

  resume: async () => {
    if (!playerInstance) return;
    playerInstance.play();
    set({ playbackStatus: 'playing' });
  },

  seekTo: async (positionMillis: number) => {
    if (!playerInstance) return;
    await playerInstance.seekTo(positionMillis / 1000);
    set({ positionMillis });
  },

  skipNext: async () => {
    const { playlist, playlistIndex, playTrack, repeatMode } = get();
    if (playlist.length === 0) return;

    if (playlistIndex < playlist.length - 1) {
      const nextTrack = playlist[playlistIndex + 1];
      await playTrack(nextTrack);
    } else if (repeatMode === 'all') {
      const firstTrack = playlist[0];
      await playTrack(firstTrack);
    }
  },

  skipPrev: async () => {
    const { playlist, playlistIndex, playTrack, positionMillis, seekTo } = get();
    if (positionMillis > 4000) {
      await seekTo(0);
      return;
    }
    if (playlist.length === 0) return;

    if (playlistIndex > 0) {
      const prevTrack = playlist[playlistIndex - 1];
      await playTrack(prevTrack);
    }
  },

  setPlaybackRate: async (rate: number) => {
    set({ playbackRate: rate });
    if (playerInstance) {
      playerInstance.playbackRate = rate;
    }
  },

  setRepeatMode: (mode) => set({ repeatMode: mode }),

  setFullScreenPlayerOpen: (open) => set({ isFullScreenPlayerOpen: open }),

  stop: async () => {
    if (playerInstance) {
      try {
        playerInstance.pause();
        playerInstance.release();
      } catch {}
      playerInstance = null;
    }
    if (statusSubscription) {
      statusSubscription.remove();
      statusSubscription = null;
    }
    set({ currentTrack: null, playbackStatus: 'idle', positionMillis: 0, durationMillis: 0 });
  },
}));
