import { buildAdhanNotificationContent } from '../adhanNotificationContent';

describe('buildAdhanNotificationContent', () => {
  it('réserve « الصلاة خير من النوم » au Fajr', () => {
    expect(buildAdhanNotificationContent('fajr', 'الفجر', '04:52').body).toContain('الصلاة خير من النوم');
    for (const [key, name] of [
      ['dhuhr', 'الظهر'],
      ['asr', 'العصر'],
      ['maghrib', 'المغرب'],
      ['isha', 'العشاء'],
    ] as const) {
      const { body } = buildAdhanNotificationContent(key, name, '12:19');
      expect(body).not.toContain('خير من النوم');
      expect(body).toContain('حيّ على الصلاة');
    }
  });

  it('nomme la prière et donne l’heure', () => {
    const { title, body } = buildAdhanNotificationContent('dhuhr', 'الظهر', '12:19');
    expect(title).toContain('حان وقت صلاة الظهر');
    expect(body).toContain('12:19');
  });

  it('force le sens droite-à-gauche (U+200F en tête)', () => {
    const { title, body } = buildAdhanNotificationContent('asr', 'العصر', '15:43');
    expect(title.startsWith('‏')).toBe(true);
    expect(body.startsWith('‏')).toBe(true);
  });
});
