/**
 * Types for Quran Audio (mp3quran.net API v3 integration).
 */

export interface Moshaf {
  id: number;
  name: string;
  server: string;
  surah_total: number;
  moshaf_type: number;
  /** Comma-separated surah numbers e.g. "1,2,3...114" */
  surah_list: string;
}

export interface Reciter {
  id: number;
  name: string;
  letter: string;
  moshaf: Moshaf[];
}

export interface AudioTrack {
  surahNumber: number;
  surahNameAr: string;
  reciterId: number;
  reciterName: string;
  moshafName: string;
  audioUrl: string;
  /** Local file path if downloaded */
  localUri?: string;
  durationMs?: number;
}

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface DownloadProgress {
  surahNumber: number;
  reciterId: number;
  progress: number; // 0..1
  status: 'pending' | 'downloading' | 'completed' | 'error';
}
