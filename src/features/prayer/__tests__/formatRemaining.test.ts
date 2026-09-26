import { formatRemainingAr } from '../formatRemaining';

describe('formatRemainingAr', () => {
  it.each([
    [0, 'حان الآن'],
    [30, 'بعد دقيقة'],
    [60, 'بعد دقيقة'],
    [120, 'بعد دقيقتين'],
    [5 * 60, 'بعد 5 دقائق'],
    [25 * 60, 'بعد 25 دقيقة'],
    [60 * 60, 'بعد ساعة'],
    [2 * 3600 + 5 * 60, 'بعد ساعتين و5 دقائق'],
    [3 * 3600 + 40 * 60, 'بعد 3 ساعات و40 دقيقة'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatRemainingAr(seconds)).toBe(expected);
  });
});
