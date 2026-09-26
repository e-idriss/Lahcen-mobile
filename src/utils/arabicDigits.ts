/**
 * Converts Western digits (0..9) to Arabic-Indic digits (٠..٩).
 *
 * Essential for the Uthmani font `Elgharib` which composes the end-of-ayah
 * medallion exclusively through Arabic-Indic digit ligatures (`uni0661.rlig`..`uni0669.rlig`).
 */
export function toArabicDigits(value: number | string): string {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[0-9]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) + 0x0660 - 48),
  );
}

/** Explicit alias for formatting Quranic ayah medallions in Uthmani font. */
export const toArabicIndicDigits = toArabicDigits;
