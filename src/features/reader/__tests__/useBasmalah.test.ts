/**
 * The Basmalah is read once and shared.
 *
 * Four screens need this one string, and one of them (`ReaderSettingsSheet`)
 * is mounted inside the reader at all times. Fetching it per-consumer through
 * `useSurahAyahs(1)` gave each one its own async state object, which fed a new
 * value into the reader's `renderPage` dependencies on every pass and drove
 * FlashList into a "Maximum update depth exceeded" re-layout loop.
 *
 * The fix is the module-level cache behind `useBasmalah`. These tests cover
 * that cache directly — the React harness in this project cannot render hooks
 * reliably, and the cache is where the actual behaviour lives.
 */

import { __basmalahCacheForTest as cache } from '../useQuranData';
import { getAyahsForSurah } from '../../../data/database';

jest.mock('../../../data/database', () => ({
  getAyahsForSurah: jest.fn(),
}));

const mockedGet = getAyahsForSurah as jest.MockedFunction<typeof getAyahsForSurah>;

const BASMALAH = 'بسم الله الرحمن الرحيم';

beforeEach(() => {
  cache.reset();
  mockedGet.mockReset();
});

describe('basmalah cache', () => {
  it('queries the database only once across many callers', async () => {
    mockedGet.mockResolvedValue([{ text: BASMALAH }] as never);

    const results = await Promise.all([cache.fetch(), cache.fetch(), cache.fetch()]);

    expect(results).toEqual([BASMALAH, BASMALAH, BASMALAH]);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('serves later callers from cache without re-querying', async () => {
    mockedGet.mockResolvedValue([{ text: BASMALAH }] as never);

    await cache.fetch();
    expect(cache.peek()).toBe(BASMALAH);

    await cache.fetch();
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('returns the identical string instance every time', async () => {
    mockedGet.mockResolvedValue([{ text: BASMALAH }] as never);

    const first = await cache.fetch();
    const second = await cache.fetch();

    // Identity, not just equality: an unstable value is what caused the loop.
    expect(second).toBe(first);
  });

  it('does not cache a failure — a later mount can retry', async () => {
    mockedGet.mockRejectedValueOnce(new Error('db closed'));

    expect(await cache.fetch()).toBe('');
    expect(cache.peek()).toBeNull();

    mockedGet.mockResolvedValue([{ text: BASMALAH }] as never);
    expect(await cache.fetch()).toBe(BASMALAH);
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('resolves to empty string when the row is missing, never a literal', async () => {
    mockedGet.mockResolvedValue([] as never);
    expect(await cache.fetch()).toBe('');
  });
});
