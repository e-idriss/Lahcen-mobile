import { getPrayerCalligraphyKey } from '../prayerCalligraphy';

describe('getPrayerCalligraphyKey', () => {
  it('maps the five prayers to their font keys', () => {
    expect(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((k) => getPrayerCalligraphyKey(k))).toEqual([
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
  });

  it('has no glyph for sunrise or unknown keys', () => {
    expect(getPrayerCalligraphyKey('sunrise')).toBeNull();
    expect(getPrayerCalligraphyKey(undefined)).toBeNull();
  });
});
