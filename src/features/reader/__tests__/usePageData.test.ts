/**
 * The page cache exists to stop a feedback loop.
 *
 * FlashList recycles page views as the reader swipes. If a recycled page
 * re-queries, the result sets state, the page re-renders, FlashList sees a
 * layout change and recycles again — "Maximum update depth exceeded".
 *
 * These cover the cache's contract: one query per page no matter how many
 * mounts, shared in-flight requests, and no cached failures.
 */

import { __pageCacheForTest as pageCache } from '../usePageData';
import { getAyahsForPage } from '../../../data/database';

jest.mock('../../../data/database', () => ({
  getAyahsForPage: jest.fn(),
}));

const mockedGet = getAyahsForPage as jest.MockedFunction<typeof getAyahsForPage>;

const rows = (page: number) => [{ id: page, surah: 1, ayah: page }] as never;

beforeEach(() => {
  pageCache.reset();
  mockedGet.mockReset();
});

describe('page cache', () => {
  it('queries a page once, then serves it from cache', async () => {
    mockedGet.mockResolvedValue(rows(1));

    await pageCache.load(1);
    await pageCache.load(1);
    await pageCache.load(1);

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('returns the identical array instance on every hit', async () => {
    mockedGet.mockResolvedValue(rows(5));

    const a = await pageCache.load(5);
    const b = await pageCache.load(5);

    // Identity matters: a new array would look like changed data to React and
    // re-render the page even though nothing changed.
    expect(b).toBe(a);
    expect(pageCache.peek(5)).toBe(a);
  });

  it('shares one query between pages mounting concurrently', async () => {
    mockedGet.mockResolvedValue(rows(7));

    const [a, b, c] = await Promise.all([
      pageCache.load(7),
      pageCache.load(7),
      pageCache.load(7),
    ]);

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('keeps pages independent', async () => {
    mockedGet.mockImplementation((async (p: number) => rows(p)) as never);

    const p1 = await pageCache.load(1);
    const p2 = await pageCache.load(2);

    expect(p1).not.toBe(p2);
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failure — the page can retry', async () => {
    mockedGet.mockRejectedValueOnce(new Error('db closed'));

    await expect(pageCache.load(3)).rejects.toThrow('db closed');
    expect(pageCache.peek(3)).toBeUndefined();

    mockedGet.mockResolvedValue(rows(3));
    await expect(pageCache.load(3)).resolves.toEqual(rows(3));
  });
});
