/**
 * Warsh Data Service.
 *
 * Converts Warsh ayahs from SQLite into clean, continuous calligraphic sections
 * and structured Mushaf layout matching the authentic Maghribi printed edition.
 *
 * Features:
 * - Dynamic Programming (DP) optimal line partitioning across all 604 pages:
 *   Minimizes variance in line length so no single line is overloaded or touches/crosses borders
 * - 8-line layout for Opening pages 1 & 2 (Header, Basmalah, 6 centered elliptical text lines)
 * - 15-line character-balanced grid for standard pages (evenly distributed character weights)
 * - Pure golden ayah end medallions (without duplicate ornate brackets)
 * - Exact Surah header banners and calligraphic Basmalah placement
 */

import type { PageAyah } from '../../data/database';
import { toArabicDigits } from '../../utils/arabicDigits';
import type { SurahMetaHeader } from './qcfDataService';

export interface WarshWord {
  id: string;
  text: string;
  surahNumber: number;
  ayahNumber: number;
  isEnd?: boolean;
}

export interface WarshSection {
  type: 'surah_header' | 'basmalah' | 'text';
  surah?: SurahMetaHeader;
  tokens?: WarshWord[];
}

export interface WarshPageLayout {
  pageNumber: number;
  sections: WarshSection[];
  lines: Array<
    | { type: 'surah_header'; surah: SurahMetaHeader; lineNumber: number }
    | { type: 'basmalah'; surahNumber: number; lineNumber: number }
    | { type: 'text_warsh'; words: WarshWord[]; lineNumber: number }
  >;
}

/** Strips combining Arabic diacritics to measure visible horizontal base character weight */
export function getArabicBaseGlyphCount(str: string): number {
  return str.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '').length;
}

/**
 * DP Optimal Line Partitioning.
 * Partitions an array of tokens into exactly K lines such that the variance in line weights is minimized.
 * Prevents any line from being overloaded with leftover words.
 */
function optimalLinePartition(tokens: WarshWord[], K: number): WarshWord[][] {
  const N = tokens.length;
  if (K <= 1 || N <= K) {
    const res: WarshWord[][] = [];
    const base = Math.floor(N / K);
    const rem = N % K;
    let curr = 0;
    for (let i = 0; i < K; i++) {
      const c = base + (i < rem ? 1 : 0);
      res.push(tokens.slice(curr, curr + c));
      curr += c;
    }
    return res;
  }

  const weights = tokens.map((t) => getArabicBaseGlyphCount(t.text) + 1);
  const prefix = [0];
  for (let i = 0; i < N; i++) {
    prefix.push(prefix[i] + weights[i]);
  }

  const target = prefix[N] / K;

  // dp[k][i] = minimum cost to partition tokens[0..i-1] into k lines
  const dp: number[][] = Array.from({ length: K + 1 }, () => new Array(N + 1).fill(Infinity));
  const parent: number[][] = Array.from({ length: K + 1 }, () => new Array(N + 1).fill(0));

  dp[0][0] = 0;

  for (let k = 1; k <= K; k++) {
    for (let i = k; i <= N - (K - k); i++) {
      for (let j = k - 1; j < i; j++) {
        const lineWeight = prefix[i] - prefix[j];
        const cost = Math.pow(lineWeight - target, 2);
        const total = dp[k - 1][j] + cost;
        if (total < dp[k][i]) {
          dp[k][i] = total;
          parent[k][i] = j;
        }
      }
    }
  }

  // Reconstruct the optimal lines
  const partition: WarshWord[][] = [];
  let curr = N;
  for (let k = K; k >= 1; k--) {
    const prev = parent[k][curr];
    partition.unshift(tokens.slice(prev, curr));
    curr = prev;
  }

  return partition;
}

export function buildWarshPageSections(pageNumber: number, ayahs: PageAyah[]): WarshSection[] {
  const sections: WarshSection[] = [];
  let currentTokens: WarshWord[] = [];

  for (const a of ayahs) {
    if (a.ayah === 1) {
      if (currentTokens.length > 0) {
        sections.push({ type: 'text', tokens: [...currentTokens] });
        currentTokens = [];
      }
      const meta: SurahMetaHeader = a.surahHeader
        ? { surahNumber: a.surah, ...a.surahHeader }
        : {
            surahNumber: a.surah,
            nameAr: '',
            nameEn: '',
            revelation: 'Meccan',
            ayahCount: 0,
          };
      sections.push({ type: 'surah_header', surah: meta });
      if (a.surah !== 9) {
        sections.push({ type: 'basmalah', surah: meta });
      }
    }

    const cleanText = a.text.replace(/[\s\u00A0]+[\u0660-\u06690-9]+$/, '').trim();
    const words = cleanText.split(/\s+/).filter(Boolean);
    words.forEach((w, wIdx) => {
      currentTokens.push({
        id: `${a.id}-w-${wIdx}`,
        text: w,
        surahNumber: a.surah,
        ayahNumber: a.ayah,
      });
    });
    currentTokens.push({
      id: `${a.id}-end`,
      text: toArabicDigits(a.ayah),
      isEnd: true,
      surahNumber: a.surah,
      ayahNumber: a.ayah,
    });
  }

  if (currentTokens.length > 0) {
    sections.push({ type: 'text', tokens: [...currentTokens] });
  }

  return sections;
}

export function buildWarshPageLayout(pageNumber: number, ayahs: PageAyah[]): WarshPageLayout {
  const sections = buildWarshPageSections(pageNumber, ayahs);
  const isOpening = pageNumber === 1 || pageNumber === 2;
  const maxLines = isOpening ? 8 : 15;
  const lines: WarshPageLayout['lines'] = Array.from({ length: maxLines }, (_, i) => ({
    lineNumber: i + 1,
    type: 'text_warsh',
    words: [],
  }));

  // Identify surahs starting on this page (ayah === 1)
  const startingAyahs = ayahs.filter((a) => a.ayah === 1);
  for (const s of startingAyahs) {
    const ls = isOpening ? 1 : (s.lineStart ?? 3);
    const meta: SurahMetaHeader = s.surahHeader
      ? { surahNumber: s.surah, ...s.surahHeader }
      : {
          surahNumber: s.surah,
          nameAr: '',
          nameEn: '',
          revelation: 'Meccan',
          ayahCount: 0,
        };

    if (isOpening) {
      lines[0] = { lineNumber: 1, type: 'surah_header', surah: meta };
      lines[1] = { lineNumber: 2, type: 'basmalah', surahNumber: s.surah };
    } else if (s.surah === 1) {
      lines[0] = { lineNumber: 1, type: 'surah_header', surah: meta };
      lines[1] = { lineNumber: 2, type: 'basmalah', surahNumber: 1 };
    } else if (s.surah === 9) {
      if (ls >= 2) {
        lines[ls - 2] = { lineNumber: ls - 1, type: 'surah_header', surah: meta };
      }
    } else if (ls >= 3) {
      lines[ls - 3] = { lineNumber: ls - 2, type: 'surah_header', surah: meta };
      lines[ls - 2] = { lineNumber: ls - 1, type: 'basmalah', surahNumber: s.surah };
    } else if (ls === 2) {
      lines[0] = { lineNumber: 1, type: 'surah_header', surah: meta };
    }
  }

  // Group ayahs by surah
  const surahGroups = new Map<number, PageAyah[]>();
  for (const a of ayahs) {
    if (!surahGroups.has(a.surah)) surahGroups.set(a.surah, []);
    surahGroups.get(a.surah)!.push(a);
  }

  surahGroups.forEach((sAyahs) => {
    const sTokens: WarshWord[] = [];
    sAyahs.forEach((a) => {
      const cleanText = a.text.replace(/[\s\u00A0]+[\u0660-\u06690-9]+$/, '').trim();
      const rawWords = cleanText.split(/\s+/).filter(Boolean);
      rawWords.forEach((w, wIdx) => {
        sTokens.push({
          id: `${a.id}-w-${wIdx}`,
          text: w,
          surahNumber: a.surah,
          ayahNumber: a.ayah,
        });
      });
      sTokens.push({
        id: `${a.id}-end`,
        text: toArabicDigits(a.ayah),
        isEnd: true,
        surahNumber: a.surah,
        ayahNumber: a.ayah,
      });
    });

    const minLine = isOpening ? 3 : Math.min(...sAyahs.map((a) => a.lineStart ?? 1));
    const maxLine = isOpening ? 8 : Math.max(...sAyahs.map((a) => a.lineEnd ?? 15));

    const targetLineIndices: number[] = [];
    for (let l = minLine; l <= maxLine; l++) {
      if (lines[l - 1] && lines[l - 1].type === 'text_warsh') {
        targetLineIndices.push(l - 1);
      }
    }

    if (targetLineIndices.length > 0) {
      const parts = optimalLinePartition(sTokens, targetLineIndices.length);
      targetLineIndices.forEach((lIdx, i) => {
        const targetLine = lines[lIdx];
        if (targetLine && targetLine.type === 'text_warsh') {
          targetLine.words = parts[i] || [];
        }
      });
    }
  });

  return { pageNumber, sections, lines };
}
