import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSettings } from '../settings';

const reset = () =>
  useSettings.setState({ riwaya: 'hafs', lastReadByRiwaya: { hafs: null, warsh: null }, bookmarks: [] });

describe('reading position per riwaya', () => {
  beforeEach(reset);

  it('saves the exact ayah and page under the current riwaya only', () => {
    useSettings.getState().setLastRead({ surah: 2, ayah: 255, page: 42 });

    const { lastReadByRiwaya } = useSettings.getState();
    expect(lastReadByRiwaya.hafs).toMatchObject({ surah: 2, ayah: 255, page: 42, riwaya: 'hafs' });
    expect(lastReadByRiwaya.warsh).toBeNull();
  });

  it('keeps Hafs and Warsh stopping points independent', () => {
    useSettings.getState().setLastRead({ surah: 2, ayah: 255, page: 42 });
    useSettings.getState().setRiwaya('warsh');
    useSettings.getState().setLastRead({ surah: 18, ayah: 10, page: 294 });

    const { lastReadByRiwaya } = useSettings.getState();
    expect(lastReadByRiwaya.hafs).toMatchObject({ surah: 2, ayah: 255, riwaya: 'hafs' });
    expect(lastReadByRiwaya.warsh).toMatchObject({ surah: 18, ayah: 10, page: 294, riwaya: 'warsh' });
  });

  it('clears only the current riwaya', () => {
    useSettings.getState().setLastRead({ surah: 1, ayah: 1, page: 1 });
    useSettings.getState().setRiwaya('warsh');
    useSettings.getState().setLastRead({ surah: 1, ayah: 1, page: 1 });
    useSettings.getState().clearLastRead();

    const { lastReadByRiwaya } = useSettings.getState();
    expect(lastReadByRiwaya.warsh).toBeNull();
    expect(lastReadByRiwaya.hafs).not.toBeNull();
  });

  it('does not treat the same surah:ayah in another riwaya as the same bookmark', () => {
    useSettings.getState().toggleBookmark({ surah: 2, ayah: 5, page: 2 });
    useSettings.getState().setRiwaya('warsh');
    useSettings.getState().toggleBookmark({ surah: 2, ayah: 5, page: 2 });
    expect(useSettings.getState().bookmarks).toHaveLength(2);

    useSettings.getState().toggleBookmark({ surah: 2, ayah: 5, page: 2 });
    expect(useSettings.getState().bookmarks.map((b) => b.riwaya)).toEqual(['hafs']);
  });
});

describe('v3 → v4 migration', () => {
  it('attaches the old riwaya-less position to the riwaya that was active', async () => {
    await AsyncStorage.setItem(
      'quran-settings',
      JSON.stringify({
        version: 3,
        state: {
          riwaya: 'hafs',
          arabicFontSize: 30,
          lastRead: { surah: 2, ayah: 255 },
          bookmarks: [{ surah: 36, ayah: 1, savedAt: 5 }],
        },
      }),
    );
    await useSettings.persist.rehydrate();

    const state = useSettings.getState();
    expect(state.lastReadByRiwaya.hafs).toMatchObject({ surah: 2, ayah: 255, page: 42, riwaya: 'hafs' });
    expect(state.lastReadByRiwaya.warsh).toBeNull();
    expect(state.bookmarks).toEqual([{ surah: 36, ayah: 1, page: 440, riwaya: 'hafs', savedAt: 5 }]);
    expect(state.arabicFontSize).toBe(30);
    expect('lastRead' in state).toBe(false);
  });
});
