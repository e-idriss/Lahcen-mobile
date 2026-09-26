import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getAllSurahs,
  getAyahsForSurah,
  getPageIndex,
  search as runSearch,
  type Ayah,
  type SearchHit,
  type Surah,
} from '../../data/database';
import { pageForAyah } from '../../data/navigation';
import { useSettings } from '../../store/settings';

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

export function useSurahList(): AsyncState<Surah[]> {
  const [state, setState] = useState<AsyncState<Surah[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    getAllSurahs()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (active) setState({ data: [], loading: false, error });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}

let basmalahCacheHafs: string | null = null;
let basmalahRequest: Promise<string> | null = null;

/**
 * The Basmalah is scripture, so it is read from the database (Al-Fatiha 1:1)
 * rather than written as a literal here. Only Hafs ships, so there is a single
 * cache slot.
 */
function fetchBasmalah(): Promise<string> {
  basmalahRequest ??= getAyahsForSurah(1)
    .then((ayahs) => {
      const text = ayahs[0]?.text ?? '';
      basmalahCacheHafs = text;
      return text;
    })
    .catch(() => {
      basmalahRequest = null;
      return '';
    });
  return basmalahRequest;
}

export const __basmalahCacheForTest = {
  fetch: () => fetchBasmalah(),
  peek: (): string | null => basmalahCacheHafs,
  reset: (): void => {
    basmalahCacheHafs = null;
    basmalahRequest = null;
  },
};

export function useBasmalah(): string {
  const [text, setText] = useState<string>(() => basmalahCacheHafs ?? '');

  useEffect(() => {
    if (basmalahCacheHafs !== null) {
      setText(basmalahCacheHafs);
      return;
    }

    let active = true;
    void fetchBasmalah().then((value) => {
      if (active) setText(value);
    });

    return () => {
      active = false;
    };
  }, []);

  return text;
}

export function useSurahAyahs(surah: number | null): AsyncState<Ayah[]> {
  const riwaya = useSettings((s) => s.riwaya);
  const [state, setState] = useState<AsyncState<Ayah[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (surah === null) return;

    let active = true;
    setState((prev) => ({ ...prev, loading: true }));

    getAyahsForSurah(surah, riwaya)
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (active) setState({ data: [], loading: false, error });
      });

    return () => {
      active = false;
    };
  }, [surah, riwaya]);

  return state;
}

const SEARCH_DEBOUNCE_MS = 250;

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  // Guards against out-of-order responses overwriting newer results.
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestId.current;

    const timer = setTimeout(() => {
      runSearch(trimmed)
        .then((hits) => {
          if (id === requestId.current) {
            setResults(hits);
            setLoading(false);
          }
        })
        .catch(() => {
          if (id === requestId.current) {
            setResults([]);
            setLoading(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, setQuery, results, loading, clear };
}

/**
 * `(surah, ayah) → page` for the riwaya being read. Hafs resolves through
 * `quran-meta`; Warsh through its own table, since it paginates and numbers
 * ayahs differently. An ayah number missing from the riwaya falls back to the
 * closest earlier ayah of that surah.
 */
export function usePageForAyah(): (surah: number, ayah: number) => number {
  const riwaya = useSettings((s) => s.riwaya);
  const [index, setIndex] = useState<Map<number, number[]> | null>(null);

  useEffect(() => {
    if (riwaya === 'hafs') {
      setIndex(null);
      return;
    }
    let active = true;
    getPageIndex(riwaya)
      .then((loaded) => {
        if (active) setIndex(loaded);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [riwaya]);

  return useCallback(
    (surah: number, ayah: number) => {
      const pages = riwaya === 'warsh' ? index?.get(surah) : undefined;
      if (pages && pages.length > 0) {
        return pages[Math.min(Math.max(ayah, 1), pages.length) - 1] ?? pages[0];
      }
      try {
        return pageForAyah(surah, ayah);
      } catch {
        return pageForAyah(surah, 1);
      }
    },
    [riwaya, index],
  );
}
