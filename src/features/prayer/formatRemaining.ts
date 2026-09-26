/**
 * Human countdown to the next adhan, in Arabic words ("بعد ساعتين و 5 دقائق").
 * A bare "00:05" reads like a clock time, not a duration.
 */

function minutesWord(m: number): string {
  if (m === 1) return 'دقيقة';
  if (m === 2) return 'دقيقتين';
  if (m >= 3 && m <= 10) return `${m} دقائق`;
  return `${m} دقيقة`;
}

function hoursWord(h: number): string {
  if (h === 1) return 'ساعة';
  if (h === 2) return 'ساعتين';
  if (h >= 3 && h <= 10) return `${h} ساعات`;
  return `${h} ساعة`;
}

export function formatRemainingAr(seconds: number): string {
  const totalMinutes = Math.max(0, Math.ceil(seconds / 60));
  if (totalMinutes === 0) return 'حان الآن';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `بعد ${minutesWord(m)}`;
  if (m === 0) return `بعد ${hoursWord(h)}`;
  return `بعد ${hoursWord(h)} و${minutesWord(m)}`;
}
