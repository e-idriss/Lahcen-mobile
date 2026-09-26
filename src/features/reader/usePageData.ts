/**
 * Loads the ayahs for a single mushaf page (supporting both Hafs and Warsh).
 *
 * Results are cached per `riwaya:page`. FlashList recycles page views as the reader
 * swipes, so an uncached hook re-queries on every recycle; each result sets
 * state, which triggers another recycle, and the reader spins in an infinite
 * update loop. The cache makes a revisited page resolve synchronously and ends
 * that cycle.
 */

import { useEffect, useState } from 'react';

import { getAyahsForPage, type PageAyah } from '../../data/database';
import { useSettings, type Riwaya } from '../../store/settings';

/** `riwaya:page` -> ayahs. Bounded and small. */
const cache = new Map<string, PageAyah[]>();
/** In-flight requests, so two pages mounting at once share one query. */
const inFlight = new Map<string, Promise<PageAyah[]>>();

function loadPage(page: number, riwaya: Riwaya = 'hafs'): Promise<PageAyah[]> {
  const key = `${riwaya}:${page}`;
  const cached = cache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  const existing = inFlight.get(key);
  if (existing !== undefined) return existing;

  const request = getAyahsForPage(page, riwaya)
    .then((rows) => {
      cache.set(key, rows);
      inFlight.delete(key);
      return rows;
    })
    .catch((error: unknown) => {
      inFlight.delete(key);
      throw error;
    });

  inFlight.set(key, request);
  return request;
}

/** Test seam for the cache above. Not for application use. */
export const __pageCacheForTest = {
  load: loadPage,
  peek: (page: number, riwaya: Riwaya = 'hafs'): PageAyah[] | undefined => cache.get(`${riwaya}:${page}`),
  reset: (): void => {
    cache.clear();
    inFlight.clear();
  },
};

export function usePageAyahs(page: number): {
  ayahs: PageAyah[];
  loading: boolean;
  error: Error | null;
} {
  const riwaya = useSettings((s) => s.riwaya);
  const cacheKey = `${riwaya}:${page}`;

  // Seed from the cache so a recycled page renders immediately, with no state
  // update and therefore no re-render.
  const [ayahs, setAyahs] = useState<PageAyah[]>(() => cache.get(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !cache.has(cacheKey));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      setAyahs((prev) => (prev === cached ? prev : cached));
      setLoading((prev) => (prev ? false : prev));
      setError((prev) => (prev === null ? prev : null));
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    loadPage(page, riwaya)
      .then((rows) => {
        if (active) {
          setAyahs(rows);
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setAyahs([]);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, riwaya, cacheKey]);

  return { ayahs, loading, error };
}
