/**
 * Offline Audio Download Manager.
 *
 * Downloads and stores MP3 Quran recitations locally on the device
 * using `expo-file-system`.
 */

import * as FileSystem from 'expo-file-system/legacy';

const AUDIO_DIR = `${FileSystem.documentDirectory}quran_audio/`;

/**
 * Ensures the root audio directory exists.
 */
export async function ensureAudioDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
  }
}

/**
 * Returns the expected local path for a given reciter and surah.
 */
export function getLocalAudioUri(reciterId: number, surahNumber: number): string {
  return `${AUDIO_DIR}${reciterId}_${surahNumber}.mp3`;
}

/**
 * Checks if a surah is already downloaded locally.
 */
export async function isSurahDownloaded(reciterId: number, surahNumber: number): Promise<boolean> {
  try {
    const fileUri = getLocalAudioUri(reciterId, surahNumber);
    const info = await FileSystem.getInfoAsync(fileUri);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Downloads a surah MP3 with progress tracking.
 */
export async function downloadSurah(
  reciterId: number,
  surahNumber: number,
  remoteUrl: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  await ensureAudioDir();
  const fileUri = getLocalAudioUri(reciterId, surahNumber);

  // If already exists, return local path
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists) {
    return fileUri;
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    remoteUrl,
    fileUri,
    {},
    (downloadProgress) => {
      const total = downloadProgress.totalBytesExpectedToWrite;
      if (total > 0 && onProgress) {
        const progress = downloadProgress.totalBytesWritten / total;
        onProgress(Math.min(1, Math.max(0, progress)));
      }
    },
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) {
    throw new Error('Download failed');
  }

  return result.uri;
}

/**
 * Deletes a downloaded surah from local disk.
 */
export async function deleteDownloadedSurah(reciterId: number, surahNumber: number): Promise<void> {
  try {
    const fileUri = getLocalAudioUri(reciterId, surahNumber);
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch {}
}

/**
 * Returns list of downloaded surah numbers for a given reciter.
 */
export async function getDownloadedSurahsForReciter(reciterId: number): Promise<number[]> {
  try {
    await ensureAudioDir();
    const files = await FileSystem.readDirectoryAsync(AUDIO_DIR);
    const prefix = `${reciterId}_`;
    const downloaded: number[] = [];

    for (const f of files) {
      if (f.startsWith(prefix) && f.endsWith('.mp3')) {
        const surahStr = f.replace(prefix, '').replace('.mp3', '');
        const surahNum = Number(surahStr);
        if (!isNaN(surahNum)) downloaded.push(surahNum);
      }
    }
    return downloaded;
  } catch {
    return [];
  }
}
