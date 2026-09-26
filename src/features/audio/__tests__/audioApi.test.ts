/**
 * The reciters payload is untrusted network input.
 *
 * Its `server` field becomes a streaming and download URL directly, so these
 * tests pin the two properties that matter: malformed entries never reach the
 * app, and a non-HTTPS server is rejected rather than fetched in cleartext.
 */

import { getSurahAudioUrl, padSurah, parseRecitersResponse } from '../audioApi';

const moshaf = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'حفص عن عاصم',
  server: 'https://server8.mp3quran.net/afs/',
  surah_total: 114,
  moshaf_type: 11,
  surah_list: '1,2,3',
  ...overrides,
});

const reciter = (overrides: Record<string, unknown> = {}) => ({
  id: 123,
  name: 'مشاري العفاسي',
  letter: 'م',
  moshaf: [moshaf()],
  ...overrides,
});

describe('parseRecitersResponse', () => {
  it('keeps well-formed reciters', () => {
    const result = parseRecitersResponse({ reciters: [reciter()] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(123);
  });

  it('rejects a non-HTTPS server', () => {
    const insecure = reciter({ moshaf: [moshaf({ server: 'http://evil.example/' })] });
    expect(parseRecitersResponse({ reciters: [insecure] })).toEqual([]);
  });

  it('drops malformed entries but keeps valid siblings', () => {
    const payload = {
      reciters: [
        reciter(),
        null,
        42,
        {},
        reciter({ id: 'not-a-number' }),
        reciter({ moshaf: 'not-an-array' }),
        reciter({ moshaf: [moshaf({ server: 123 })] }),
      ],
    };
    const result = parseRecitersResponse(payload);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(123);
  });

  it('returns an empty list for junk payloads rather than throwing', () => {
    expect(parseRecitersResponse(null)).toEqual([]);
    expect(parseRecitersResponse(undefined)).toEqual([]);
    expect(parseRecitersResponse('nope')).toEqual([]);
    expect(parseRecitersResponse({})).toEqual([]);
    expect(parseRecitersResponse({ reciters: 'nope' })).toEqual([]);
  });
});

describe('getSurahAudioUrl', () => {
  it('pads the surah number to three digits', () => {
    expect(padSurah(1)).toBe('001');
    expect(padSurah(114)).toBe('114');
  });

  it('builds the URL whether or not the server has a trailing slash', () => {
    expect(getSurahAudioUrl('https://s.example/afs/', 1)).toBe('https://s.example/afs/001.mp3');
    expect(getSurahAudioUrl('https://s.example/afs', 1)).toBe('https://s.example/afs/001.mp3');
  });
});
