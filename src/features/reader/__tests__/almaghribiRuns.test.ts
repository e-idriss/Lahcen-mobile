import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ALMAGHRIBI_MISSING, splitAlmaghribiRuns } from '../almaghribiRuns';

describe('splitAlmaghribiRuns', () => {
  it('isole le signe de waqf de اِ۬لدِّينِۖ pour garder le ن dans Almaghribi', () => {
    expect(splitAlmaghribiRuns('اِ۬لدِّينِۖ')).toEqual([
      { text: 'اِ۬لدِّينِ', fallback: false },
      { text: 'ۖ', fallback: true },
    ]);
  });

  it('laisse intact un mot sans caractère manquant', () => {
    expect(splitAlmaghribiRuns('مَلِكِ')).toEqual([{ text: 'مَلِكِ', fallback: false }]);
  });

  it('ne modifie jamais le texte des 6214 ayahs Warsh', () => {
    const xml = readFileSync(join(__dirname, '../../../../warshData_v10.xml'), 'utf8');
    const texts = [...xml.matchAll(/<aya_text>([\s\S]*?)<\/aya_text>/g)].map((m) => m[1]);
    expect(texts).toHaveLength(6214);
    for (const text of texts) {
      const runs = splitAlmaghribiRuns(text);
      expect(runs.map((r) => r.text).join('')).toBe(text);
      for (const run of runs.filter((r) => !r.fallback)) {
        expect(ALMAGHRIBI_MISSING.test(run.text)).toBe(false);
      }
    }
  });
});
