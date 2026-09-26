/**
 * Unified Mushaf Page Hook.
 *
 * Coordinates:
 * - Hafs QCF v2 data loading & font preloading
 * - Warsh SQLite data & 15-line layout parsing
 * - Surah metadata, Juz, Hizb, and navigation data
 */

import { useEffect, useMemo, useState } from 'react';

import * as Font from 'expo-font';

import { getAllSurahs, getAyahsForPage, type PageAyah, type Surah } from '../../data/database';
import { hizbForPage, juzForPage } from '../../data/navigation';
import { useSettings, type Riwaya } from '../../store/settings';
import { ensureQcfFontLoaded, getQcfFontFamily, prefetchAdjacentQcfFonts } from './qcfFontLoader';
import {
  getQcfPageData,
  prefetchAdjacentQcfData,
  type QcfPageLayout,
  type SurahMetaHeader,
} from './qcfDataService';
import { buildWarshPageLayout, type WarshPageLayout } from './warshDataService';

let cachedSurahMetaMap: Map<number, SurahMetaHeader> | null = null;

async function getSurahMetaMap(): Promise<Map<number, SurahMetaHeader>> {
  if (cachedSurahMetaMap) return cachedSurahMetaMap;
  const surahs = await getAllSurahs();
  const map = new Map<number, SurahMetaHeader>();
  for (const s of surahs) {
    map.set(s.number, {
      surahNumber: s.number,
      nameAr: s.nameAr,
      nameEn: s.nameEn,
      revelation: s.revelation,
      ayahCount: s.ayahCount,
    });
  }
  cachedSurahMetaMap = map;
  return map;
}

export interface UnifiedMushafPageState {
  pageNumber: number;
  riwaya: Riwaya;
  juzNumber: number;
  hizbNumber: number;
  surahNameAr: string;
  loading: boolean;
  qcfFontFamily: string;
  isQcfFontLoaded: boolean;
  qcfLayout: QcfPageLayout | null;
  warshLayout: WarshPageLayout | null;
  rawAyahs: PageAyah[];
  error: Error | null;
}

export function useMushafPage(pageNumber: number): UnifiedMushafPageState {
  const riwaya = useSettings((s) => s.riwaya);

  const juzNumber = useMemo(() => juzForPage(pageNumber), [pageNumber]);
  const hizbNumber = useMemo(() => hizbForPage(pageNumber), [pageNumber]);

  const qcfFontFamily = useMemo(() => getQcfFontFamily(pageNumber), [pageNumber]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [rawAyahs, setRawAyahs] = useState<PageAyah[]>([]);
  const [qcfLayout, setQcfLayout] = useState<QcfPageLayout | null>(null);
  const [warshLayout, setWarshLayout] = useState<WarshPageLayout | null>(null);
  const [isQcfFontLoaded, setIsQcfFontLoaded] = useState(() => Font.isLoaded(getQcfFontFamily(pageNumber)));

  // Derive primary surah name for top frame header
  const surahNameAr = useMemo(() => {
    if (qcfLayout && qcfLayout.lines.length > 0) {
      for (const line of qcfLayout.lines) {
        if (line.type === 'surah_header') return line.surah.nameAr;
        if (line.type === 'text' && line.words.length > 0) {
          const sNum = line.words[0].surahNumber;
          const meta = cachedSurahMetaMap?.get(sNum);
          if (meta) return meta.nameAr;
        }
      }
    }
    if (rawAyahs.length > 0) {
      if (rawAyahs[0].surahHeader) return rawAyahs[0].surahHeader.nameAr;
      const sNum = rawAyahs[0].surah;
      const meta = cachedSurahMetaMap?.get(sNum);
      if (meta) return meta.nameAr;
    }
    return '';
  }, [qcfLayout, rawAyahs]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setIsQcfFontLoaded(Font.isLoaded(qcfFontFamily));

    async function load() {
      try {
        const metaMap = await getSurahMetaMap();

        if (riwaya === 'warsh') {
          // 1. Warsh Mode: query SQLite
          const ayahs = await getAyahsForPage(pageNumber, 'warsh');
          if (!active) return;
          setRawAyahs(ayahs);
          const layout = buildWarshPageLayout(pageNumber, ayahs);
          setWarshLayout(layout);
          setLoading(false);
        } else {
          // 2. Hafs Mode:
          // A) Fetch SQLite ayahs immediately for local fast paint/fallback
          const ayahs = await getAyahsForPage(pageNumber, 'hafs');
          if (!active) return;
          setRawAyahs(ayahs);

          // B) Try font prefetch & loading
          void ensureQcfFontLoaded(pageNumber).then((loaded) => {
            if (active) setIsQcfFontLoaded(loaded);
          });
          prefetchAdjacentQcfFonts(pageNumber);

          // C) Load QCF word metadata with cache
          const qcf = await getQcfPageData(pageNumber, metaMap);
          if (!active) return;

          setQcfLayout(qcf);
          setLoading(false);
          prefetchAdjacentQcfData(pageNumber, metaMap);
        }
      } catch (err: unknown) {
        if (!active) return;
        console.warn(`[useMushafPage] Error loading page ${pageNumber}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [pageNumber, riwaya]);

  return {
    pageNumber,
    riwaya,
    juzNumber,
    hizbNumber,
    surahNameAr,
    loading,
    qcfFontFamily,
    isQcfFontLoaded,
    qcfLayout,
    warshLayout,
    rawAyahs,
    error,
  };
}
