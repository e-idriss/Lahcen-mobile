import { WEEKDAY_LIGATURE_KEYS, WEEKDAYS_AR, getHijriToday } from '../hijriDate';

describe('WEEKDAY_LIGATURE_KEYS', () => {
  // Keys verified against the GSUB of Elgharib-Days Of Week.ttf:
  // 1..6 = الأحد..الجمعة, 0 = السبت, 7 = الأسبوع, 8 = اليوم, 9 = أيام الأسبوع.
  it('utilise "0" pour السبت, jamais "7" (qui affiche الأسبوع)', () => {
    expect(WEEKDAY_LIGATURE_KEYS[6]).toBe('0');
    expect(WEEKDAY_LIGATURE_KEYS).not.toContain('7');
  });

  it('associe dimanche..vendredi aux clés 1..6', () => {
    expect(WEEKDAY_LIGATURE_KEYS.slice(0, 6)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(WEEKDAYS_AR[0]).toBe('الأحد');
    expect(WEEKDAYS_AR[6]).toBe('السبت');
  });
});

describe('getHijriToday', () => {
  afterEach(() => jest.useRealTimers());

  it('renvoie la clé de السبت un samedi', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 26, 12)); // samedi 26 sept. 2026
    const today = getHijriToday();
    expect(today.weekday).toBe(6);
    expect(today.weekdayLigature).toBe('0');
  });

  it('renvoie la clé de الجمعة un vendredi', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 25, 12));
    expect(getHijriToday().weekdayLigature).toBe('6');
  });
});
